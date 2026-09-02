package models

import "time"

type Chapter struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	StoryID  uint   `json:"storyId" gorm:"index"`
	Number   int    `json:"number" gorm:"index"`
	Title    string `json:"title"`
	Content  string `json:"content,omitempty" gorm:"type:text"`
	CoinCost int    `json:"coinCost" gorm:"default:0"`

	Summary     string     `json:"summary" gorm:"type:text"`
	Notes       string     `json:"notes" gorm:"type:text"`
	EndNotes    string     `json:"endNotes" gorm:"type:text"`
	PublishedAt *time.Time `json:"publishedAt"` // nil = draft, not visible to readers
	UpdatedAt   time.Time  `json:"updatedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type ChapterUnlock struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"userId" gorm:"uniqueIndex:idx_user_chapter"`
	ChapterID uint      `json:"chapterId" gorm:"uniqueIndex:idx_user_chapter"`
	CreatedAt time.Time `json:"createdAt"`
}

type ReadingHistory struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	UserID     uint      `json:"userId" gorm:"uniqueIndex:idx_reading_user_story"`
	StoryID    uint      `json:"storyId" gorm:"uniqueIndex:idx_reading_user_story"`
	ChapterID  uint      `json:"chapterId"`
	ChapterNum int       `json:"chapterNum"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
