package config

import (
	"backend/models"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitEnv() {
	for _, path := range []string{".env", "../.env"} {
		if err := godotenv.Load(path); err == nil {
			return
		}
	}
	log.Println("No .env file found, using environment variables")
}

func ConnectDatabase() {
	driver := os.Getenv("DB_DRIVER")
	dsn := os.Getenv("DB_DSN")

	var db *gorm.DB
	var err error

	switch driver {
	case "sqlite":
		if dsn == "" {
			dsn = "whatsinmylibrary.db"
		}
		db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	default:
		if dsn == "" {
			dsn = "host=localhost user=postgres password=postgres dbname=booksite port=5432 sslmode=disable"
		}
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	}

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Story{},
		&models.Chapter{},
		&models.ChapterUnlock{},
		&models.ReadingHistory{},
		&models.Bookmark{},
		&models.Tag{},
		&models.StoryTag{},
		&models.Tip{},
		&models.StoryComment{},
		&models.LineComment{},
		&models.ForumCategory{},
		&models.ForumThread{},
		&models.ForumReply{},
		&models.StoryCoAuthor{},
	); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	DB = db
}

func DevAuthEnabled() bool {
	return os.Getenv("DEV_AUTH") == "true"
}
