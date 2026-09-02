package models

import "time"

type Bookmark struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"userId" gorm:"uniqueIndex:idx_user_story_bookmark"`
	StoryID   uint      `json:"storyId" gorm:"uniqueIndex:idx_user_story_bookmark"`
	Note      string    `json:"note"`
	IsPublic  bool      `json:"isPublic" gorm:"default:false"`
	CreatedAt time.Time `json:"createdAt"`
}
