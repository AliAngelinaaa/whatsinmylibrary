package controllers

import (
	"backend/config"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type commentUser struct {
	ID          uint   `json:"id"`
	FullName    string `json:"fullName"`
	Username    string `json:"username"`
	AvatarColor string `json:"avatarColor"`
	AvatarURL   string `json:"avatarUrl"`
}

func commentUserFrom(u models.User) commentUser {
	color := u.AvatarColor
	if color == "" {
		color = "#957DAD"
	}
	return commentUser{
		ID:          u.ID,
		FullName:    u.FullName,
		Username:    u.Username,
		AvatarColor: color,
		AvatarURL:   u.AvatarURL,
	}
}

func ListStoryCommentsHandler(w http.ResponseWriter, r *http.Request) {
	storyID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid story id"}`, http.StatusBadRequest)
		return
	}

	var comments []models.StoryComment
	config.DB.Preload("User").Where("story_id = ?", storyID).
		Order("created_at asc").Limit(200).Find(&comments)

	out := make([]map[string]interface{}, 0, len(comments))
	for _, c := range comments {
		out = append(out, storyCommentResponse(c))
	}
	writeJSON(w, http.StatusOK, out)
}

func storyCommentResponse(c models.StoryComment) map[string]interface{} {
	resp := map[string]interface{}{
		"id":        c.ID,
		"storyId":   c.StoryID,
		"body":      c.Body,
		"createdAt": c.CreatedAt,
		"user":      commentUserFrom(c.User),
	}
	if c.ParentID != nil {
		resp["parentId"] = *c.ParentID
	}
	return resp
}

func CreateStoryCommentHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	storyID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid story id"}`, http.StatusBadRequest)
		return
	}

	var body struct {
		contentPayload
		ParentID *uint `json:"parentId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if err := validateContent(user, body.Body, body.Honeypot); err != nil {
		writeBotError(w, err)
		return
	}

	var story models.Story
	if err := config.DB.First(&story, storyID).Error; err != nil {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}

	if body.ParentID != nil {
		var parent models.StoryComment
		if err := config.DB.First(&parent, *body.ParentID).Error; err != nil || parent.StoryID != uint(storyID) {
			http.Error(w, `{"error":"invalid parent comment"}`, http.StatusBadRequest)
			return
		}
	}

	comment := models.StoryComment{
		StoryID:  uint(storyID),
		UserID:   user.ID,
		ParentID: body.ParentID,
		Body:     strings.TrimSpace(body.Body),
	}
	if err := config.DB.Create(&comment).Error; err != nil {
		http.Error(w, `{"error":"failed to post comment"}`, http.StatusInternalServerError)
		return
	}

	config.DB.Preload("User").First(&comment, comment.ID)
	writeJSON(w, http.StatusCreated, storyCommentResponse(comment))
}

func ListLineCommentsHandler(w http.ResponseWriter, r *http.Request) {
	chapterID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid chapter id"}`, http.StatusBadRequest)
		return
	}

	var chapter models.Chapter
	if err := config.DB.First(&chapter, chapterID).Error; err != nil {
		http.Error(w, `{"error":"chapter not found"}`, http.StatusNotFound)
		return
	}

	if !chapterAccessible(r, chapter) {
		http.Error(w, `{"error":"chapter not accessible"}`, http.StatusForbidden)
		return
	}

	var comments []models.LineComment
	config.DB.Preload("User").Where("chapter_id = ?", chapterID).
		Order("paragraph_idx asc, start_offset asc").Find(&comments)

	out := make([]map[string]interface{}, 0, len(comments))
	for _, c := range comments {
		out = append(out, lineCommentResponse(c))
	}
	writeJSON(w, http.StatusOK, out)
}

func CreateLineCommentHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	chapterID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid chapter id"}`, http.StatusBadRequest)
		return
	}

	var body struct {
		contentPayload
		ParagraphIdx int    `json:"paragraphIdx"`
		StartOffset  int    `json:"startOffset"`
		EndOffset    int    `json:"endOffset"`
		SelectedText string `json:"selectedText"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if err := validateContent(user, body.Body, body.Honeypot); err != nil {
		writeBotError(w, err)
		return
	}

	if body.ParagraphIdx < 0 || body.StartOffset < 0 || body.EndOffset <= body.StartOffset {
		http.Error(w, `{"error":"invalid selection"}`, http.StatusBadRequest)
		return
	}

	var chapter models.Chapter
	if err := config.DB.First(&chapter, chapterID).Error; err != nil {
		http.Error(w, `{"error":"chapter not found"}`, http.StatusNotFound)
		return
	}

	if !chapterAccessible(r, chapter) {
		http.Error(w, `{"error":"unlock chapter to comment on lines"}`, http.StatusForbidden)
		return
	}

	comment := models.LineComment{
		ChapterID:    uint(chapterID),
		UserID:       user.ID,
		ParagraphIdx: body.ParagraphIdx,
		StartOffset:  body.StartOffset,
		EndOffset:    body.EndOffset,
		SelectedText: stringsTrim(body.SelectedText, 500),
		Body:         strings.TrimSpace(body.Body),
	}
	if err := config.DB.Create(&comment).Error; err != nil {
		http.Error(w, `{"error":"failed to post line comment"}`, http.StatusInternalServerError)
		return
	}

	config.DB.Preload("User").First(&comment, comment.ID)
	writeJSON(w, http.StatusCreated, lineCommentResponse(comment))
}

func lineCommentResponse(c models.LineComment) map[string]interface{} {
	return map[string]interface{}{
		"id":           c.ID,
		"chapterId":    c.ChapterID,
		"paragraphIdx": c.ParagraphIdx,
		"startOffset":  c.StartOffset,
		"endOffset":    c.EndOffset,
		"selectedText": c.SelectedText,
		"body":         c.Body,
		"createdAt":    c.CreatedAt,
		"user":         commentUserFrom(c.User),
	}
}

func chapterAccessible(r *http.Request, chapter models.Chapter) bool {
	if chapter.CoinCost == 0 {
		return true
	}
	user, ok := middleware.UserFromContext(r)
	if !ok {
		return false
	}
	return isChapterUnlocked(user.ID, chapter.ID)
}

func checkDuplicateLineComment(userID uint, body string) bool {
	var count int64
	config.DB.Model(&models.LineComment{}).
		Where("user_id = ? AND body = ? AND created_at > ?", userID, body, time.Now().Add(-5*time.Minute)).
		Count(&count)
	return count > 0
}
