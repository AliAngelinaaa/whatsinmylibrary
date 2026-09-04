package models

import "time"

type StoryComment struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	StoryID   uint      `json:"storyId" gorm:"index"`
	UserID    uint      `json:"userId"`
	ParentID  *uint     `json:"parentId" gorm:"index"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	Body      string    `json:"body" gorm:"type:text"`
	CreatedAt time.Time `json:"createdAt"`
}

type LineComment struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	ChapterID    uint      `json:"chapterId" gorm:"index"`
	UserID       uint      `json:"userId"`
	ParentID     *uint     `json:"parentId" gorm:"index"`
	User         User      `json:"user" gorm:"foreignKey:UserID"`
	ParagraphIdx int       `json:"paragraphIdx"`
	StartOffset  int       `json:"startOffset"`
	EndOffset    int       `json:"endOffset"`
	SelectedText string    `json:"selectedText"`
	Body         string    `json:"body" gorm:"type:text"`
	CreatedAt    time.Time `json:"createdAt"`
}
