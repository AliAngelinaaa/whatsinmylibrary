package config

import (
	"backend/models"
	"log"
	"os"
	"strings"

	"github.com/glebarez/sqlite"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
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

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if value := os.Getenv(key); value != "" {
			return value
		}
	}
	return ""
}

func databaseConfig() (driver string, dsn string) {
	if url := firstEnv("DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"); url != "" {
		return "postgres", url
	}

	driver = os.Getenv("DB_DRIVER")
	dsn = os.Getenv("DB_DSN")
	if dsn != "" && (driver == "postgres" || driver == "postgresql" ||
		strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://")) {
		return "postgres", dsn
	}

	// Demo on Vercel: ephemeral SQLite in /tmp. Data resets when the instance recycles.
	if os.Getenv("VERCEL") != "" {
		return "sqlite", "file:/tmp/whatsinmylibrary.db?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)"
	}

	if dsn != "" {
		if driver == "" {
			driver = "sqlite"
		}
		return driver, dsn
	}

	if driver == "sqlite" {
		return "sqlite", "whatsinmylibrary.db"
	}
	return "postgres", "host=localhost user=postgres password=postgres dbname=booksite port=5432 sslmode=disable"
}

func ConnectDatabase() {
	driver, dsn := databaseConfig()

	var db *gorm.DB
	var err error

	switch driver {
	case "sqlite":
		log.Println("Using SQLite at", dsn)
		db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	default:
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
	switch strings.ToLower(os.Getenv("DEV_AUTH")) {
	case "true", "1", "yes":
		return true
	case "false", "0", "no":
		return false
	default:
		// Demo login works on Vercel without extra env vars.
		return os.Getenv("VERCEL") != ""
	}
}
