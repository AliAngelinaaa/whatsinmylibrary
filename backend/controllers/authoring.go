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

type tagInput struct {
	Name     string `json:"name"`
	Category string `json:"category"`
}

type myStorySummary struct {
	storySummary
	TotalChapters int `json:"totalChapters"`
	DraftChapters int `json:"draftChapters"`
}

// ListMyStoriesHandler returns the signed-in author's own stories, both
// draft and published, with chapter counts for the "My works" dashboard.
func ListMyStoriesHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var owned []models.Story
	config.DB.Preload("Author").Preload("Tags").Preload("CoAuthors").
		Where("author_id = ?", user.ID).
		Order("updated_at desc, created_at desc").
		Find(&owned)

	var coAuthored []models.Story
	config.DB.Preload("Author").Preload("Tags").Preload("CoAuthors").
		Joins("JOIN story_co_authors ON story_co_authors.story_id = stories.id").
		Where("story_co_authors.user_id = ?", user.ID).
		Order("updated_at desc, created_at desc").
		Find(&coAuthored)

	seen := map[uint]bool{}
	stories := make([]models.Story, 0, len(owned)+len(coAuthored))
	for _, s := range owned {
		if !seen[s.ID] {
			seen[s.ID] = true
			stories = append(stories, s)
		}
	}
	for _, s := range coAuthored {
		if !seen[s.ID] {
			seen[s.ID] = true
			stories = append(stories, s)
		}
	}

	out := make([]myStorySummary, 0, len(stories))
	for _, story := range stories {
		var chapters []models.Chapter
		config.DB.Where("story_id = ?", story.ID).Order("number asc").Find(&chapters)
		draft := 0
		for _, ch := range chapters {
			if ch.PublishedAt == nil {
				draft++
			}
		}
		out = append(out, myStorySummary{
			storySummary:  storySummaryFrom(story, chapters),
			TotalChapters: len(chapters),
			DraftChapters: draft,
		})
	}

	writeJSON(w, http.StatusOK, out)
}

// CreateStoryHandler creates a new draft story owned by the signed-in user.
func CreateStoryHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		Title string `json:"title"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	title := strings.TrimSpace(body.Title)
	if title == "" {
		title = "Untitled work"
	}

	story := models.Story{
		Title:           title,
		AuthorID:        user.ID,
		CoverColor:      "#957DAD",
		Rating:          "not-rated",
		Language:        "English",
		Status:          "draft",
		CommentsEnabled: true,
	}
	if err := config.DB.Create(&story).Error; err != nil {
		http.Error(w, `{"error":"failed to create work"}`, http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{"id": story.ID})
}

func loadOwnedStory(r *http.Request, id uint64) (models.Story, bool, error) {
	var story models.Story
	if err := config.DB.Preload("Author").Preload("Tags").Preload("CoAuthors").First(&story, id).Error; err != nil {
		return story, false, err
	}
	return story, isStoryOwner(r, story), nil
}

// UpdateStoryHandler edits story metadata, tags, co-authors, and handles the
// draft <-> published transition (publishing requires >=1 published chapter).
func UpdateStoryHandler(w http.ResponseWriter, r *http.Request) {
	storyID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid story id"}`, http.StatusBadRequest)
		return
	}

	story, owner, err := loadOwnedStory(r, storyID)
	if err != nil {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}
	if !owner {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	var body struct {
		Title           *string    `json:"title"`
		Description     *string    `json:"description"`
		Genre           *string    `json:"genre"`
		CoverColor      *string    `json:"coverColor"`
		Rating          *string    `json:"rating"`
		Warnings        *[]string  `json:"warnings"`
		Categories      *[]string  `json:"categories"`
		Language        *string    `json:"language"`
		Status          *string    `json:"status"`
		Complete        *bool      `json:"complete"`
		CommentsEnabled *bool      `json:"commentsEnabled"`
		CoAuthors       *[]string  `json:"coAuthors"`
		Tags            *[]tagInput `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	updates := map[string]interface{}{}
	if body.Title != nil {
		title := strings.TrimSpace(*body.Title)
		if title == "" {
			http.Error(w, `{"error":"title is required"}`, http.StatusBadRequest)
			return
		}
		updates["title"] = title
	}
	if body.Description != nil {
		updates["description"] = *body.Description
	}
	if body.Genre != nil {
		updates["genre"] = strings.TrimSpace(*body.Genre)
	}
	if body.CoverColor != nil {
		updates["cover_color"] = *body.CoverColor
	}
	if body.Rating != nil {
		updates["rating"] = firstNonEmpty(*body.Rating, "not-rated")
	}
	if body.Warnings != nil {
		updates["warnings"] = encodeStringList(*body.Warnings)
	}
	if body.Categories != nil {
		updates["categories"] = encodeStringList(*body.Categories)
	}
	if body.Language != nil {
		updates["language"] = firstNonEmpty(*body.Language, "English")
	}
	if body.Complete != nil {
		updates["complete"] = *body.Complete
	}
	if body.CommentsEnabled != nil {
		updates["comments_enabled"] = *body.CommentsEnabled
	}

	if body.Status != nil {
		nextStatus := *body.Status
		if nextStatus == "published" {
			var publishedCount int64
			config.DB.Model(&models.Chapter{}).
				Where("story_id = ? AND published_at IS NOT NULL", story.ID).
				Count(&publishedCount)
			if publishedCount == 0 {
				http.Error(w, `{"error":"publish at least one chapter before posting this work"}`, http.StatusBadRequest)
				return
			}
			updates["status"] = "published"
		} else if nextStatus == "draft" {
			updates["status"] = "draft"
		}
	}

	if len(updates) > 0 {
		if err := config.DB.Model(&models.Story{}).Where("id = ?", story.ID).Updates(updates).Error; err != nil {
			http.Error(w, `{"error":"failed to update work"}`, http.StatusInternalServerError)
			return
		}
	}

	if body.Tags != nil {
		tags := make([]models.Tag, 0, len(*body.Tags))
		for _, t := range *body.Tags {
			name := strings.TrimSpace(t.Name)
			if name == "" {
				continue
			}
			category := t.Category
			if category == "" {
				category = "freeform"
			}
			slug := slugify(name)
			var tag models.Tag
			config.DB.Where(models.Tag{Slug: slug}).Attrs(models.Tag{Name: name, Category: category}).FirstOrCreate(&tag)
			tags = append(tags, tag)
		}
		config.DB.Model(&story).Association("Tags").Replace(tags)
	}

	if body.CoAuthors != nil {
		coAuthors := make([]models.User, 0, len(*body.CoAuthors))
		for _, username := range *body.CoAuthors {
			username = strings.TrimSpace(username)
			if username == "" {
				continue
			}
			var u models.User
			if err := config.DB.Where("LOWER(username) = LOWER(?)", username).First(&u).Error; err == nil && u.ID != story.AuthorID {
				coAuthors = append(coAuthors, u)
			}
		}
		config.DB.Model(&story).Association("CoAuthors").Replace(coAuthors)
	}

	config.DB.Model(&models.Story{}).Where("id = ?", story.ID).Update("updated_at", time.Now())

	writeJSON(w, http.StatusOK, map[string]interface{}{"id": story.ID})
}

// DeleteStoryHandler removes a story and its chapters/tags. Restricted to the
// primary author (not co-authors) to avoid accidental collaborative deletes.
func DeleteStoryHandler(w http.ResponseWriter, r *http.Request) {
	storyID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid story id"}`, http.StatusBadRequest)
		return
	}

	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var story models.Story
	if err := config.DB.First(&story, storyID).Error; err != nil {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}
	if story.AuthorID != user.ID {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	config.DB.Where("story_id = ?", story.ID).Delete(&models.Chapter{})
	config.DB.Exec("DELETE FROM story_tags WHERE story_id = ?", story.ID)
	config.DB.Exec("DELETE FROM story_co_authors WHERE story_id = ?", story.ID)
	config.DB.Delete(&story)

	writeJSON(w, http.StatusOK, map[string]interface{}{"deleted": true})
}

// UploadStoryCoverHandler uploads a real cover image for a story, replacing
// the flat coverColor fallback used by cards/pages when present.
func UploadStoryCoverHandler(w http.ResponseWriter, r *http.Request) {
	storyID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid story id"}`, http.StatusBadRequest)
		return
	}

	story, owner, err := loadOwnedStory(r, storyID)
	if err != nil {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}
	if !owner {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	url, err := saveUserImage(w, r, "cover", "story-covers", story.ID, 4<<20)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "failed to save image" {
			status = http.StatusInternalServerError
		}
		http.Error(w, `{"error":"`+err.Error()+`"}`, status)
		return
	}

	config.DB.Model(&models.Story{}).Where("id = ?", story.ID).Update("cover_image_url", url)
	writeJSON(w, http.StatusOK, map[string]interface{}{"coverImageUrl": url})
}

// CreateChapterHandler creates a new draft chapter, auto-numbered as the
// next chapter for the story.
func CreateChapterHandler(w http.ResponseWriter, r *http.Request) {
	storyID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid story id"}`, http.StatusBadRequest)
		return
	}

	story, owner, err := loadOwnedStory(r, storyID)
	if err != nil {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}
	if !owner {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	var body struct {
		Title string `json:"title"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	var maxNumber int
	config.DB.Model(&models.Chapter{}).Where("story_id = ?", story.ID).
		Select("COALESCE(MAX(number), 0)").Scan(&maxNumber)

	title := strings.TrimSpace(body.Title)
	if title == "" {
		title = "Untitled chapter"
	}

	chapter := models.Chapter{
		StoryID: story.ID,
		Number:  maxNumber + 1,
		Title:   title,
	}
	if err := config.DB.Create(&chapter).Error; err != nil {
		http.Error(w, `{"error":"failed to create chapter"}`, http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{"id": chapter.ID, "number": chapter.Number})
}

// GetChapterForEditHandler returns the full chapter (including draft
// content) for the story owner/co-authors to edit.
func GetChapterForEditHandler(w http.ResponseWriter, r *http.Request) {
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

	var story models.Story
	config.DB.Preload("CoAuthors").First(&story, chapter.StoryID)
	if !isStoryOwner(r, story) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	writeJSON(w, http.StatusOK, chapterDetail{
		ID:          chapter.ID,
		StoryID:     chapter.StoryID,
		Number:      chapter.Number,
		Title:       chapter.Title,
		Content:     plainTextToHTML(chapter.Content),
		Summary:     chapter.Summary,
		Notes:       chapter.Notes,
		EndNotes:    chapter.EndNotes,
		CoinCost:    chapter.CoinCost,
		Locked:      false,
		PublishedAt: chapter.PublishedAt,
	})
}

// UpdateChapterHandler edits chapter content/metadata and toggles
// publish/unpublish via `published: true/false`.
func UpdateChapterHandler(w http.ResponseWriter, r *http.Request) {
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

	var story models.Story
	config.DB.Preload("CoAuthors").First(&story, chapter.StoryID)
	if !isStoryOwner(r, story) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	var body struct {
		Title     *string `json:"title"`
		Summary   *string `json:"summary"`
		Notes     *string `json:"notes"`
		EndNotes  *string `json:"endNotes"`
		Content   *string `json:"content"`
		Published *bool   `json:"published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	updates := map[string]interface{}{}
	if body.Title != nil {
		title := strings.TrimSpace(*body.Title)
		if title == "" {
			http.Error(w, `{"error":"title is required"}`, http.StatusBadRequest)
			return
		}
		updates["title"] = title
	}
	if body.Summary != nil {
		updates["summary"] = *body.Summary
	}
	if body.Notes != nil {
		updates["notes"] = *body.Notes
	}
	if body.EndNotes != nil {
		updates["end_notes"] = *body.EndNotes
	}
	if body.Content != nil {
		updates["content"] = sanitizeChapterHTML(*body.Content)
	}
	if body.Published != nil {
		if *body.Published && chapter.PublishedAt == nil {
			now := time.Now()
			updates["published_at"] = &now
		} else if !*body.Published {
			updates["published_at"] = nil
		}
	}
	updates["updated_at"] = time.Now()

	if err := config.DB.Model(&models.Chapter{}).Where("id = ?", chapter.ID).Updates(updates).Error; err != nil {
		http.Error(w, `{"error":"failed to update chapter"}`, http.StatusInternalServerError)
		return
	}
	if body.Published != nil && !*body.Published {
		config.DB.Model(&models.Chapter{}).Where("id = ?", chapter.ID).Update("published_at", nil)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"id": chapter.ID})
}

// DeleteChapterHandler removes a chapter and renumbers the remaining
// chapters for that story so numbering stays contiguous.
func DeleteChapterHandler(w http.ResponseWriter, r *http.Request) {
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

	var story models.Story
	config.DB.Preload("CoAuthors").First(&story, chapter.StoryID)
	if !isStoryOwner(r, story) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	storyID := chapter.StoryID
	config.DB.Delete(&chapter)

	var remaining []models.Chapter
	config.DB.Where("story_id = ?", storyID).Order("number asc").Find(&remaining)
	for i, ch := range remaining {
		newNumber := i + 1
		if ch.Number != newNumber {
			config.DB.Model(&models.Chapter{}).Where("id = ?", ch.ID).Update("number", newNumber)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"deleted": true})
}

// ReorderChaptersHandler accepts an ordered list of chapter ids and
// renumbers them 1..N in that order.
func ReorderChaptersHandler(w http.ResponseWriter, r *http.Request) {
	storyID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid story id"}`, http.StatusBadRequest)
		return
	}

	story, owner, err := loadOwnedStory(r, storyID)
	if err != nil {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}
	if !owner {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	var body struct {
		ChapterIDs []uint `json:"chapterIds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	for i, id := range body.ChapterIDs {
		config.DB.Model(&models.Chapter{}).
			Where("id = ? AND story_id = ?", id, story.ID).
			Update("number", i+1)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"reordered": true})
}
