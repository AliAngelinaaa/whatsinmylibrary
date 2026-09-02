package controllers

import (
	"backend/config"
	"backend/middleware"
	"backend/models"
	"net/http"
)

func recordReadingProgress(userID, storyID, chapterID uint, chapterNum int) {
	var existing models.ReadingHistory
	err := config.DB.Where("user_id = ? AND story_id = ?", userID, storyID).First(&existing).Error
	if err != nil {
		config.DB.Create(&models.ReadingHistory{
			UserID:     userID,
			StoryID:    storyID,
			ChapterID:  chapterID,
			ChapterNum: chapterNum,
		})
		return
	}
	config.DB.Model(&existing).Updates(map[string]interface{}{
		"chapter_id":  chapterID,
		"chapter_num": chapterNum,
	})
}

func UserHistoryHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var reading []models.ReadingHistory
	config.DB.Where("user_id = ?", user.ID).Order("updated_at desc").Limit(50).Find(&reading)

	readingOut := make([]map[string]interface{}, 0, len(reading))
	for _, entry := range reading {
		var story models.Story
		var chapter models.Chapter
		if config.DB.Preload("Author").First(&story, entry.StoryID).Error != nil {
			continue
		}
		chapterTitle := ""
		if config.DB.First(&chapter, entry.ChapterID).Error == nil {
			chapterTitle = chapter.Title
		}
		readingOut = append(readingOut, map[string]interface{}{
			"storyId":      story.ID,
			"storyTitle":   story.Title,
			"coverColor":   story.CoverColor,
			"authorName":   story.Author.FullName,
			"chapterNum":   entry.ChapterNum,
			"chapterTitle": chapterTitle,
			"updatedAt":    entry.UpdatedAt,
		})
	}

	var unlocks []models.ChapterUnlock
	config.DB.Where("user_id = ?", user.ID).Order("created_at desc").Limit(50).Find(&unlocks)

	unlockOut := make([]map[string]interface{}, 0, len(unlocks))
	for _, u := range unlocks {
		var chapter models.Chapter
		if config.DB.First(&chapter, u.ChapterID).Error != nil {
			continue
		}
		var story models.Story
		if config.DB.Preload("Author").First(&story, chapter.StoryID).Error != nil {
			continue
		}
		unlockOut = append(unlockOut, map[string]interface{}{
			"storyId":      story.ID,
			"storyTitle":   story.Title,
			"coverColor":   story.CoverColor,
			"authorName":   story.Author.FullName,
			"chapterNum":   chapter.Number,
			"chapterTitle": chapter.Title,
			"coinCost":     chapter.CoinCost,
			"createdAt":    u.CreatedAt,
		})
	}

	var tips []models.Tip
	config.DB.Where("from_user_id = ?", user.ID).Order("created_at desc").Limit(50).Find(&tips)

	tipOut := make([]map[string]interface{}, 0, len(tips))
	for _, t := range tips {
		var story models.Story
		var toUser models.User
		if config.DB.First(&story, t.StoryID).Error != nil {
			continue
		}
		config.DB.First(&toUser, t.ToUserID)
		tipOut = append(tipOut, map[string]interface{}{
			"storyId":    story.ID,
			"storyTitle": story.Title,
			"authorName": toUser.FullName,
			"amount":     t.Amount,
			"message":    t.Message,
			"createdAt":  t.CreatedAt,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"reading": readingOut,
		"unlocks": unlockOut,
		"tips":    tipOut,
	})
}
