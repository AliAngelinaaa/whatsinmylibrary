package models

import "time"

type Story struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Genre       string    `json:"genre"`
	CoverColor  string    `json:"coverColor"`
	AuthorID    uint      `json:"authorId"`
	Author      User      `json:"author" gorm:"foreignKey:AuthorID"`
	Chapters    []Chapter `json:"chapters,omitempty" gorm:"foreignKey:StoryID"`
	Tags        []Tag     `json:"tags,omitempty" gorm:"many2many:story_tags;"`
	CreatedAt   time.Time `json:"createdAt"`

	// Classification & publishing
	Rating          string `json:"rating" gorm:"default:not-rated"` // not-rated|general|teen|mature|explicit
	Warnings        string `json:"-"`                               // JSON []string
	Categories      string `json:"-"`                               // JSON []string: ff|fm|gen|mm|multi|other
	Language        string `json:"language" gorm:"default:English"`
	Status          string `json:"status" gorm:"default:draft"` // draft|published
	Complete        bool   `json:"complete" gorm:"default:false"`
	CommentsEnabled bool   `json:"commentsEnabled" gorm:"default:true"`
	CoverImageURL   string `json:"coverImageUrl"`
	UpdatedAt       time.Time `json:"updatedAt"`

	CoAuthors []User `json:"coAuthors,omitempty" gorm:"many2many:story_co_authors;"`
}

// StoryCoAuthor is an explicit join model so it can be registered with AutoMigrate
// alongside the implicit many2many table created for Story.CoAuthors.
type StoryCoAuthor struct {
	StoryID uint `gorm:"primaryKey"`
	UserID  uint `gorm:"primaryKey"`
}
