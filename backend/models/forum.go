package models

import "time"

type ForumCategory struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name"`
	Slug        string `json:"slug" gorm:"uniqueIndex"`
	Description string `json:"description"`
}

type ForumThread struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	CategoryID uint      `json:"categoryId" gorm:"index"`
	Category   ForumCategory `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	UserID     uint      `json:"userId"`
	User       User      `json:"user" gorm:"foreignKey:UserID"`
	Title      string    `json:"title"`
	Body       string    `json:"body" gorm:"type:text"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type ForumReply struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ThreadID  uint      `json:"threadId" gorm:"index"`
	UserID    uint      `json:"userId"`
	ParentID  *uint     `json:"parentId" gorm:"index"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	Body      string    `json:"body" gorm:"type:text"`
	CreatedAt time.Time `json:"createdAt"`
}
