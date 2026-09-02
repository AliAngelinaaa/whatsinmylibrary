package controllers

import (
	"backend/config"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"net/http"
	"strings"
)

func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		FullName       *string  `json:"fullName"`
		Username       *string  `json:"username"`
		Bio            *string  `json:"bio"`
		AvatarColor    *string  `json:"avatarColor"`
		AvatarURL      *string  `json:"avatarUrl"`
		BannerURL      *string  `json:"bannerUrl"`
		FavoriteGenres []string `json:"favoriteGenres"`
		BlockedTags    []string `json:"blockedTags"`
		ReaderTheme    *string  `json:"readerTheme"`
		ReaderFontSize *string  `json:"readerFontSize"`
		ReaderFont     *string  `json:"readerFont"`
		UiScale        *string  `json:"uiScale"`
		SiteTheme      *string  `json:"siteTheme"`
		UiFont         *string  `json:"uiFont"`
		ReduceMotion   *bool    `json:"reduceMotion"`
		NotifyNewChapters *bool `json:"notifyNewChapters"`
		NotifyReplies     *bool `json:"notifyReplies"`
		NotifyForum       *bool `json:"notifyForum"`
		NotifyTips        *bool `json:"notifyTips"`
		EmailDigest       *bool `json:"emailDigest"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	updates := map[string]interface{}{}

	if body.FullName != nil {
		updates["full_name"] = strings.TrimSpace(*body.FullName)
	}
	if body.Bio != nil {
		updates["bio"] = strings.TrimSpace(*body.Bio)
	}
	if body.AvatarColor != nil {
		updates["avatar_color"] = strings.TrimSpace(*body.AvatarColor)
	}
	if body.AvatarURL != nil {
		updates["avatar_url"] = strings.TrimSpace(*body.AvatarURL)
	}
	if body.BannerURL != nil {
		updates["banner_url"] = strings.TrimSpace(*body.BannerURL)
	}
	if body.Username != nil {
		username := strings.TrimSpace(*body.Username)
		if username != "" {
			var existing models.User
			if err := config.DB.Where("username = ? AND id != ?", username, user.ID).First(&existing).Error; err == nil {
				http.Error(w, `{"error":"username already taken"}`, http.StatusConflict)
				return
			}
			updates["username"] = username
		}
	}
	if body.FavoriteGenres != nil {
		updates["favorite_genres"] = encodeStringList(body.FavoriteGenres)
	}
	if body.BlockedTags != nil {
		normalized := make([]string, 0, len(body.BlockedTags))
		for _, tag := range body.BlockedTags {
			tag = strings.TrimSpace(tag)
			if tag != "" {
				normalized = append(normalized, slugify(tag))
			}
		}
		updates["blocked_tags"] = encodeStringList(normalized)
	}
	if body.ReaderTheme != nil {
		updates["reader_theme"] = *body.ReaderTheme
	}
	if body.ReaderFontSize != nil {
		updates["reader_font_size"] = *body.ReaderFontSize
	}
	if body.ReaderFont != nil {
		updates["reader_font"] = *body.ReaderFont
	}
	if body.UiScale != nil {
		updates["ui_scale"] = *body.UiScale
	}
	if body.SiteTheme != nil {
		updates["site_theme"] = *body.SiteTheme
	}
	if body.UiFont != nil {
		updates["ui_font"] = *body.UiFont
	}
	if body.ReduceMotion != nil {
		updates["reduce_motion"] = *body.ReduceMotion
	}
	if body.NotifyNewChapters != nil {
		updates["notify_new_chapters"] = *body.NotifyNewChapters
	}
	if body.NotifyReplies != nil {
		updates["notify_replies"] = *body.NotifyReplies
	}
	if body.NotifyForum != nil {
		updates["notify_forum"] = *body.NotifyForum
	}
	if body.NotifyTips != nil {
		updates["notify_tips"] = *body.NotifyTips
	}
	if body.EmailDigest != nil {
		updates["email_digest"] = *body.EmailDigest
	}

	if len(updates) > 0 {
		if err := config.DB.Model(&user).Updates(updates).Error; err != nil {
			http.Error(w, `{"error":"failed to update profile"}`, http.StatusInternalServerError)
			return
		}
	}

	config.DB.First(&user, user.ID)
	writeJSON(w, http.StatusOK, userProfileResponse(user))
}
