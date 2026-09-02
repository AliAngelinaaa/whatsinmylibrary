package controllers

import (
	"backend/config"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

var tipAmounts = []int{5, 10, 25}

func ListTipAmountsHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, tipAmounts)
}

func TipAuthorHandler(w http.ResponseWriter, r *http.Request) {
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
		Amount   int    `json:"amount"`
		Message  string `json:"message"`
		Honeypot string `json:"_hp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if body.Honeypot != "" {
		writeBotError(w, errBot("bot detected"))
		return
	}

	validAmount := false
	for _, a := range tipAmounts {
		if body.Amount == a {
			validAmount = true
			break
		}
	}
	if !validAmount {
		http.Error(w, `{"error":"invalid tip amount — choose 5, 10, or 25 coins"}`, http.StatusBadRequest)
		return
	}

	var story models.Story
	if err := config.DB.Preload("Author").First(&story, storyID).Error; err != nil {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}

	if isFanfiction(story.Genre) {
		http.Error(w, `{"error":"tipping is not allowed on fanfiction"}`, http.StatusForbidden)
		return
	}

	if story.AuthorID == user.ID {
		http.Error(w, `{"error":"you cannot tip yourself"}`, http.StatusBadRequest)
		return
	}

	if user.Coins < body.Amount {
		http.Error(w, `{"error":"insufficient coins"}`, http.StatusPaymentRequired)
		return
	}

	msg := stringsTrim(body.Message, 200)

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.User{}).Where("id = ? AND coins >= ?", user.ID, body.Amount).
			Update("coins", gorm.Expr("coins - ?", body.Amount)).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.User{}).Where("id = ?", story.AuthorID).
			Update("coins", gorm.Expr("coins + ?", body.Amount)).Error; err != nil {
			return err
		}
		return tx.Create(&models.Tip{
			FromUserID: user.ID,
			ToUserID:   story.AuthorID,
			StoryID:    story.ID,
			Amount:     body.Amount,
			Message:    msg,
		}).Error
	})
	if err != nil {
		http.Error(w, `{"error":"failed to send tip"}`, http.StatusInternalServerError)
		return
	}

	config.DB.First(&user, user.ID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "tip sent — thank you for supporting the author!",
		"coins":   user.Coins,
		"amount":  body.Amount,
	})
}

func stringsTrim(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) > max {
		return s[:max]
	}
	return s
}

func storyTipStats(storyID uint) (total int, count int64) {
	var result struct{ Total int }
	config.DB.Model(&models.Tip{}).Where("story_id = ?", storyID).
		Select("COALESCE(SUM(amount), 0) as total").Scan(&result)
	config.DB.Model(&models.Tip{}).Where("story_id = ?", storyID).Count(&count)
	return result.Total, count
}