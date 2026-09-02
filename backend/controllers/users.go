package controllers

import (
	"backend/config"
	"backend/middleware"
	"backend/models"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func GetPublicUserHandler(w http.ResponseWriter, r *http.Request) {
	username := strings.TrimSpace(r.PathValue("username"))
	if username == "" {
		http.Error(w, `{"error":"username required"}`, http.StatusBadRequest)
		return
	}

	var user models.User
	if err := config.DB.Where("LOWER(username) = LOWER(?)", username).First(&user).Error; err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	viewer, hasViewer := middleware.UserFromContext(r)
	isOwner := hasViewer && strings.EqualFold(viewer.Username, user.Username)

	storyQuery := config.DB.Preload("Author").Preload("Tags").
		Where("author_id = ?", user.ID).
		Order("created_at desc")
	if !isOwner {
		storyQuery = storyQuery.Where("status = ? OR status = ''", "published")
	}

	var stories []models.Story
	storyQuery.Find(&stories)

	works := make([]profileWork, 0, len(stories))
	genreSet := map[string]struct{}{}
	totalChapters := 0

	for _, story := range stories {
		work := buildProfileWork(story)
		works = append(works, work)
		totalChapters += work.ChapterCount
		if story.Genre != "" {
			genreSet[story.Genre] = struct{}{}
		}
	}

	genres := make([]string, 0, len(genreSet))
	for genre := range genreSet {
		genres = append(genres, genre)
	}

	bookmarks := buildProfileBookmarks(user.ID, !isOwner)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":          publicUserResponse(user),
		"storyCount":    len(works),
		"totalChapters": totalChapters,
		"genres":        genres,
		"stories":       works,
		"bookmarkCount": len(bookmarks),
		"bookmarks":     bookmarks,
		"isOwnProfile":  isOwner,
	})
}

func UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	url, err := saveUserImage(w, r, "avatar", "avatars", user.ID, 2<<20)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "failed to save image" {
			status = http.StatusInternalServerError
		}
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), status)
		return
	}

	if err := config.DB.Model(&user).Update("avatar_url", url).Error; err != nil {
		http.Error(w, `{"error":"failed to update profile"}`, http.StatusInternalServerError)
		return
	}

	config.DB.First(&user, user.ID)
	writeJSON(w, http.StatusOK, userProfileResponse(user))
}

func UploadBannerHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	url, err := saveUserImage(w, r, "banner", "banners", user.ID, 3<<20)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "failed to save image" {
			status = http.StatusInternalServerError
		}
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), status)
		return
	}

	if err := config.DB.Model(&user).Update("banner_url", url).Error; err != nil {
		http.Error(w, `{"error":"failed to update profile"}`, http.StatusInternalServerError)
		return
	}

	config.DB.First(&user, user.ID)
	writeJSON(w, http.StatusOK, userProfileResponse(user))
}

func saveUserImage(w http.ResponseWriter, r *http.Request, field, folder string, userID uint, maxSize int64) (string, error) {
	r.Body = http.MaxBytesReader(w, r.Body, maxSize)
	if err := r.ParseMultipartForm(maxSize); err != nil {
		return "", fmt.Errorf("file too large")
	}

	file, header, err := r.FormFile(field)
	if err != nil {
		return "", fmt.Errorf("%s file required", field)
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp", ".gif":
	default:
		return "", fmt.Errorf("unsupported image type")
	}

	dir := filepath.Join("uploads", folder)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("failed to save image")
	}

	for _, oldExt := range []string{".jpg", ".jpeg", ".png", ".webp", ".gif"} {
		_ = os.Remove(filepath.Join(dir, fmt.Sprintf("%d%s", userID, oldExt)))
	}

	filename := fmt.Sprintf("%d%s", userID, ext)
	destPath := filepath.Join(dir, filename)
	out, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("failed to save image")
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		return "", fmt.Errorf("failed to save image")
	}

	return "/uploads/" + folder + "/" + filename, nil
}
