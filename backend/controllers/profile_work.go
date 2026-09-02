package controllers

import (
	"backend/config"
	"backend/models"
)

type profileWork struct {
	ID            uint                     `json:"id"`
	Title         string                   `json:"title"`
	Description   string                   `json:"description"`
	Genre         string                   `json:"genre"`
	CoverColor    string                   `json:"coverColor"`
	CoverImageURL string                   `json:"coverImageUrl"`
	Author        publicAuthor             `json:"author"`
	Tags          []map[string]interface{} `json:"tags"`
	ChapterCount  int                      `json:"chapterCount"`
	FreeChapters  int                      `json:"freeChapters"`
	PaidChapters  int                      `json:"paidChapters"`
	Status        string                   `json:"status"`
	Complete      bool                     `json:"complete"`
	CreatedAt     string                   `json:"createdAt"`
}

type profileBookmark struct {
	ID        uint        `json:"id"`
	Story     profileWork `json:"story"`
	Note      string      `json:"note"`
	IsPublic  bool        `json:"isPublic"`
	CreatedAt string      `json:"createdAt"`
}

func buildProfileWork(story models.Story) profileWork {
	var chapters []models.Chapter
	config.DB.Where("story_id = ?", story.ID).Find(&chapters)

	free, paid, published := 0, 0, 0
	for _, ch := range chapters {
		if ch.PublishedAt == nil {
			continue
		}
		published++
		if ch.CoinCost == 0 {
			free++
		} else {
			paid++
		}
	}

	return profileWork{
		ID:            story.ID,
		Title:         story.Title,
		Description:   story.Description,
		Genre:         story.Genre,
		CoverColor:    story.CoverColor,
		CoverImageURL: story.CoverImageURL,
		Author:        publicAuthorFrom(story.Author),
		Tags:          tagResponses(story.Tags),
		ChapterCount:  published,
		FreeChapters:  free,
		PaidChapters:  paid,
		Status:        firstNonEmpty(story.Status, "published"),
		Complete:      story.Complete,
		CreatedAt:     story.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func bookmarkForUserStory(userID, storyID uint) (models.Bookmark, bool) {
	var bookmark models.Bookmark
	err := config.DB.Where("user_id = ? AND story_id = ?", userID, storyID).First(&bookmark).Error
	return bookmark, err == nil
}

func buildProfileBookmarks(userID uint, publicOnly bool) []profileBookmark {
	query := config.DB.Where("user_id = ?", userID).Order("created_at desc")
	if publicOnly {
		query = query.Where("is_public = ?", true)
	}

	var bookmarks []models.Bookmark
	query.Find(&bookmarks)

	out := make([]profileBookmark, 0, len(bookmarks))
	for _, bm := range bookmarks {
		var story models.Story
		if err := config.DB.Preload("Author").Preload("Tags").First(&story, bm.StoryID).Error; err != nil {
			continue
		}
		out = append(out, profileBookmark{
			ID:        bm.ID,
			Story:     buildProfileWork(story),
			Note:      bm.Note,
			IsPublic:  bm.IsPublic,
			CreatedAt: bm.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return out
}
