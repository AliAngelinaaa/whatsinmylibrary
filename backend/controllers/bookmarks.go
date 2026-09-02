package controllers

import (
	"backend/config"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func SetStoryBookmarkHandler(w http.ResponseWriter, r *http.Request) {
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

	var story models.Story
	if err := config.DB.First(&story, storyID).Error; err != nil {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}

	var body struct {
		Note     *string `json:"note"`
		IsPublic *bool   `json:"isPublic"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	var bookmark models.Bookmark
	result := config.DB.Where("user_id = ? AND story_id = ?", user.ID, story.ID).First(&bookmark)

	if result.Error != nil {
		isPublic := false
		if body.IsPublic != nil {
			isPublic = *body.IsPublic
		}
		note := ""
		if body.Note != nil {
			note = strings.TrimSpace(*body.Note)
		}
		bookmark = models.Bookmark{
			UserID:   user.ID,
			StoryID:  story.ID,
			Note:     note,
			IsPublic: isPublic,
		}
		if err := config.DB.Create(&bookmark).Error; err != nil {
			http.Error(w, `{"error":"failed to bookmark"}`, http.StatusInternalServerError)
			return
		}
	} else {
		updates := map[string]interface{}{}
		if body.Note != nil {
			updates["note"] = strings.TrimSpace(*body.Note)
		}
		if body.IsPublic != nil {
			updates["is_public"] = *body.IsPublic
		}
		if len(updates) > 0 {
			config.DB.Model(&bookmark).Updates(updates)
			config.DB.First(&bookmark, bookmark.ID)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"bookmarked":     true,
		"bookmarkPublic": bookmark.IsPublic,
		"bookmarkNote":   bookmark.Note,
	})
}

func DeleteStoryBookmarkHandler(w http.ResponseWriter, r *http.Request) {
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

	config.DB.Where("user_id = ? AND story_id = ?", user.ID, storyID).Delete(&models.Bookmark{})
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"bookmarked": false,
	})
}
