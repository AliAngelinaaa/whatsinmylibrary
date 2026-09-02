package models

import "time"

type Tip struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	FromUserID uint      `json:"fromUserId"`
	ToUserID   uint      `json:"toUserId"`
	StoryID    uint      `json:"storyId"`
	Amount     int       `json:"amount"`
	Message    string    `json:"message"`
	CreatedAt  time.Time `json:"createdAt"`
}
