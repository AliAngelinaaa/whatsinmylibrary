package controllers

import (
	"backend/config"
	"backend/models"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode"
)

var urlPattern = regexp.MustCompile(`https?://`)

type contentPayload struct {
	Body     string `json:"body"`
	Message  string `json:"message"`
	Honeypot string `json:"_hp"`
}

func validateContent(user models.User, body, honeypot string) error {
	if honeypot != "" {
		return errBot("bot detected")
	}

	trimmed := strings.TrimSpace(body)
	if len(trimmed) < 2 {
		return errBot("comment too short")
	}
	if len(trimmed) > 5000 {
		return errBot("comment too long")
	}

	if looksLikeSpam(trimmed) {
		return errBot("content flagged as spam")
	}

	var recent int64
	config.DB.Model(&models.StoryComment{}).
		Where("user_id = ? AND body = ? AND created_at > ?", user.ID, trimmed, time.Now().Add(-5*time.Minute)).
		Count(&recent)
	if recent > 0 {
		return errBot("duplicate comment")
	}

	return nil
}

func looksLikeSpam(body string) bool {
	lower := strings.ToLower(body)
	if strings.Count(lower, "http") > 3 {
		return true
	}
	if urlPattern.MatchString(body) && len(body) < 40 {
		return true
	}

	letterCount := 0
	for _, r := range body {
		if unicode.IsLetter(r) {
			letterCount++
		}
	}
	if letterCount < 2 {
		return true
	}

	spamWords := []string{"buy now", "click here", "free coins", "crypto", "viagra"}
	for _, word := range spamWords {
		if strings.Contains(lower, word) {
			return true
		}
	}
	return false
}

func isFanfiction(genre string) bool {
	return strings.EqualFold(strings.TrimSpace(genre), "fanfiction")
}

type botError struct{ msg string }

func (e botError) Error() string { return e.msg }

func errBot(msg string) error { return botError{msg: msg} }

func writeBotError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}
