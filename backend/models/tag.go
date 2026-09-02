package models

type Tag struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Name     string `json:"name" gorm:"uniqueIndex"`
	Slug     string `json:"slug" gorm:"uniqueIndex"`
	Category string `json:"category" gorm:"default:freeform"` // fandom|relationship|character|freeform
}

type StoryTag struct {
	StoryID uint `gorm:"primaryKey"`
	TagID   uint `gorm:"primaryKey"`
}
