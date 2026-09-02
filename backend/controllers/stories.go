package controllers

import (
	"backend/config"
	"backend/middleware"
	"backend/models"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

type publicAuthor struct {
	ID          uint   `json:"id"`
	FullName    string `json:"fullName"`
	Username    string `json:"username"`
	AvatarColor string `json:"avatarColor"`
	AvatarURL   string `json:"avatarUrl"`
}

func publicAuthorFrom(u models.User) publicAuthor {
	color := u.AvatarColor
	if color == "" {
		color = "#957DAD"
	}
	return publicAuthor{
		ID:          u.ID,
		FullName:    u.FullName,
		Username:    u.Username,
		AvatarColor: color,
		AvatarURL:   u.AvatarURL,
	}
}

type storySummary struct {
	ID              uint                     `json:"id"`
	Title           string                   `json:"title"`
	Description     string                   `json:"description"`
	Genre           string                   `json:"genre"`
	CoverColor      string                   `json:"coverColor"`
	CoverImageURL   string                   `json:"coverImageUrl"`
	Author          publicAuthor             `json:"author"`
	CoAuthors       []publicAuthor           `json:"coAuthors,omitempty"`
	Tags            []map[string]interface{} `json:"tags"`
	ChapterCount    int                      `json:"chapterCount"`
	FreeChapters    int                      `json:"freeChapters"`
	PaidChapters    int                      `json:"paidChapters"`
	WordCount       int                      `json:"wordCount"`
	CreatedAt       time.Time                `json:"createdAt"`
	Rating          string                   `json:"rating"`
	Warnings        []string                 `json:"warnings"`
	Categories      []string                 `json:"categories"`
	Language        string                   `json:"language"`
	Status          string                   `json:"status"`
	Complete        bool                     `json:"complete"`
	CommentsEnabled bool                     `json:"commentsEnabled"`
	UpdatedAt       time.Time                `json:"updatedAt"`
}

func storySummaryFrom(story models.Story, chapters []models.Chapter) storySummary {
	free, paid, words := 0, 0, 0
	publishedChapters := 0
	for _, ch := range chapters {
		if ch.PublishedAt == nil {
			continue
		}
		publishedChapters++
		if ch.CoinCost == 0 {
			free++
		} else {
			paid++
		}
		words += len(strings.Fields(ch.Content))
	}

	return storySummary{
		ID:              story.ID,
		Title:           story.Title,
		Description:     story.Description,
		Genre:           story.Genre,
		CoverColor:      story.CoverColor,
		CoverImageURL:   story.CoverImageURL,
		Author:          publicAuthorFrom(story.Author),
		CoAuthors:       coAuthorResponses(story.CoAuthors),
		Tags:            tagResponses(story.Tags),
		ChapterCount:    publishedChapters,
		FreeChapters:    free,
		PaidChapters:    paid,
		WordCount:       words,
		CreatedAt:       story.CreatedAt,
		Rating:          firstNonEmpty(story.Rating, "not-rated"),
		Warnings:        parseStringList(story.Warnings),
		Categories:      parseStringList(story.Categories),
		Language:        firstNonEmpty(story.Language, "English"),
		Status:          firstNonEmpty(story.Status, "published"),
		Complete:        story.Complete,
		CommentsEnabled: story.CommentsEnabled,
		UpdatedAt:       story.UpdatedAt,
	}
}

type chapterPreview struct {
	ID        uint   `json:"id"`
	Number    int    `json:"number"`
	Title     string `json:"title"`
	CoinCost  int    `json:"coinCost"`
	Locked    bool   `json:"locked"`
	Unlocked  bool   `json:"unlocked"`
	Published bool   `json:"published"`
}

type storyDetail struct {
	ID              uint                     `json:"id"`
	Title           string                   `json:"title"`
	Description     string                   `json:"description"`
	Genre           string                   `json:"genre"`
	CoverColor      string                   `json:"coverColor"`
	CoverImageURL   string                   `json:"coverImageUrl"`
	Author          publicAuthor             `json:"author"`
	CoAuthors       []publicAuthor           `json:"coAuthors,omitempty"`
	Tags            []map[string]interface{} `json:"tags"`
	Chapters        []chapterPreview         `json:"chapters"`
	TipsEnabled     bool                     `json:"tipsEnabled"`
	TipTotal        int                      `json:"tipTotal"`
	TipCount        int64                    `json:"tipCount"`
	Bookmarked      bool                     `json:"bookmarked"`
	BookmarkPublic  bool                     `json:"bookmarkPublic"`
	BookmarkNote    string                   `json:"bookmarkNote"`
	Rating          string                   `json:"rating"`
	Warnings        []string                 `json:"warnings"`
	Categories      []string                 `json:"categories"`
	Language        string                   `json:"language"`
	Status          string                   `json:"status"`
	Complete        bool                     `json:"complete"`
	CommentsEnabled bool                     `json:"commentsEnabled"`
	IsOwner         bool                     `json:"isOwner"`
	UpdatedAt       time.Time                `json:"updatedAt"`
}

type chapterDetail struct {
	ID          uint       `json:"id"`
	StoryID     uint       `json:"storyId"`
	Number      int        `json:"number"`
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	Summary     string     `json:"summary,omitempty"`
	Notes       string     `json:"notes,omitempty"`
	EndNotes    string     `json:"endNotes,omitempty"`
	CoinCost    int        `json:"coinCost"`
	Locked      bool       `json:"locked"`
	PublishedAt *time.Time `json:"publishedAt"`
}

// isStoryOwner returns true if the requesting user is the story's primary
// author or a listed co-author.
func isStoryOwner(r *http.Request, story models.Story) bool {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		return false
	}
	if user.ID == story.AuthorID {
		return true
	}
	for _, co := range story.CoAuthors {
		if co.ID == user.ID {
			return true
		}
	}
	return false
}

func ListStoriesHandler(w http.ResponseWriter, r *http.Request) {
	query := config.DB.Preload("Author").Preload("Tags").
		Where("status = ? OR status = ''", "published")

	genre := strings.TrimSpace(r.URL.Query().Get("genre"))
	if genre != "" {
		query = query.Where("genre = ?", genre)
	}

	excludeGenre := strings.TrimSpace(r.URL.Query().Get("excludeGenre"))
	if excludeGenre != "" {
		query = query.Where("genre != ?", excludeGenre)
	}

	if r.URL.Query().Get("vip") == "true" {
		query = query.Where(`
			EXISTS (
				SELECT 1 FROM chapters
				WHERE chapters.story_id = stories.id AND chapters.coin_cost > 0
			)
		`)
	}

	search := strings.TrimSpace(r.URL.Query().Get("q"))
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("title LIKE ? OR description LIKE ?", like, like)
	}

	tagSlugs := parseQueryList(r.URL.Query().Get("tags"))
	for _, slug := range tagSlugs {
		query = query.Where(`
			EXISTS (
				SELECT 1 FROM story_tags
				JOIN tags ON tags.id = story_tags.tag_id
				WHERE story_tags.story_id = stories.id AND tags.slug = ?
			)
		`, slug)
	}

	var stories []models.Story
	query.Order("created_at desc").Find(&stories)

	blockedTags := blockedTagsForUser(r)
	if len(blockedTags) > 0 {
		filtered := make([]models.Story, 0, len(stories))
		for _, story := range stories {
			if !storyHasBlockedTag(story.Tags, blockedTags) {
				filtered = append(filtered, story)
			}
		}
		stories = filtered
	}

	summaries := make([]storySummary, 0, len(stories))
	for _, story := range stories {
		var chapters []models.Chapter
		config.DB.Where("story_id = ?", story.ID).Find(&chapters)
		summaries = append(summaries, storySummaryFrom(story, chapters))
	}

	writeJSON(w, http.StatusOK, summaries)
}

func GetStoryHandler(w http.ResponseWriter, r *http.Request) {
	storyID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid story id"}`, http.StatusBadRequest)
		return
	}

	var story models.Story
	if err := config.DB.Preload("Author").Preload("Tags").Preload("CoAuthors").First(&story, storyID).Error; err != nil {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}

	isOwner := isStoryOwner(r, story)

	if firstNonEmpty(story.Status, "published") != "published" && !isOwner {
		http.Error(w, `{"error":"story not found"}`, http.StatusNotFound)
		return
	}

	blockedTags := blockedTagsForUser(r)
	if storyHasBlockedTag(story.Tags, blockedTags) {
		http.Error(w, `{"error":"story blocked by your tag filters"}`, http.StatusNotFound)
		return
	}

	var chapters []models.Chapter
	config.DB.Where("story_id = ?", story.ID).Order("number asc").Find(&chapters)

	unlocked := unlockedChapterIDs(r, chapters)

	previews := make([]chapterPreview, 0, len(chapters))
	for _, ch := range chapters {
		if ch.PublishedAt == nil && !isOwner {
			continue
		}
		locked := ch.CoinCost > 0 && !unlocked[ch.ID]
		previews = append(previews, chapterPreview{
			ID:       ch.ID,
			Number:   ch.Number,
			Title:    ch.Title,
			CoinCost: ch.CoinCost,
			Locked:   locked,
			Unlocked: !locked,
		})
	}

	tipTotal, tipCount := storyTipStats(story.ID)

	bookmarked := false
	bookmarkPublic := false
	bookmarkNote := ""
	if user, ok := middleware.UserFromContext(r); ok {
		if bm, found := bookmarkForUserStory(user.ID, story.ID); found {
			bookmarked = true
			bookmarkPublic = bm.IsPublic
			bookmarkNote = bm.Note
		}
	}

	writeJSON(w, http.StatusOK, storyDetail{
		ID:              story.ID,
		Title:           story.Title,
		Description:     story.Description,
		Genre:           story.Genre,
		CoverColor:      story.CoverColor,
		CoverImageURL:   story.CoverImageURL,
		Author:          publicAuthorFrom(story.Author),
		CoAuthors:       coAuthorResponses(story.CoAuthors),
		Tags:            tagResponses(story.Tags),
		Chapters:        previews,
		TipsEnabled:     !isFanfiction(story.Genre),
		TipTotal:        tipTotal,
		TipCount:        tipCount,
		Bookmarked:      bookmarked,
		BookmarkPublic:  bookmarkPublic,
		BookmarkNote:    bookmarkNote,
		Rating:          firstNonEmpty(story.Rating, "not-rated"),
		Warnings:        parseStringList(story.Warnings),
		Categories:      parseStringList(story.Categories),
		Language:        firstNonEmpty(story.Language, "English"),
		Status:          firstNonEmpty(story.Status, "published"),
		Complete:        story.Complete,
		CommentsEnabled: story.CommentsEnabled,
		IsOwner:         isOwner,
		UpdatedAt:       story.UpdatedAt,
	})
}

func GetChapterHandler(w http.ResponseWriter, r *http.Request) {
	storyID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid story id"}`, http.StatusBadRequest)
		return
	}
	chapterNum, err := strconv.Atoi(r.PathValue("num"))
	if err != nil {
		http.Error(w, `{"error":"invalid chapter number"}`, http.StatusBadRequest)
		return
	}

	var chapter models.Chapter
	if err := config.DB.Where("story_id = ? AND number = ?", storyID, chapterNum).First(&chapter).Error; err != nil {
		http.Error(w, `{"error":"chapter not found"}`, http.StatusNotFound)
		return
	}

	var story models.Story
	config.DB.Preload("CoAuthors").First(&story, storyID)
	isOwner := isStoryOwner(r, story)

	if chapter.PublishedAt == nil && !isOwner {
		http.Error(w, `{"error":"chapter not found"}`, http.StatusNotFound)
		return
	}

	locked := chapter.CoinCost > 0
	if locked {
		user, ok := middleware.UserFromContext(r)
		if !isOwner && (!ok || !isChapterUnlocked(user.ID, chapter.ID)) {
			writeJSON(w, http.StatusOK, chapterDetail{
				ID:          chapter.ID,
				StoryID:     chapter.StoryID,
				Number:      chapter.Number,
				Title:       chapter.Title,
				CoinCost:    chapter.CoinCost,
				Locked:      true,
				PublishedAt: chapter.PublishedAt,
			})
			return
		}
	}

	writeJSON(w, http.StatusOK, chapterDetail{
		ID:          chapter.ID,
		StoryID:     chapter.StoryID,
		Number:      chapter.Number,
		Title:       chapter.Title,
		Content:     plainTextToHTML(chapter.Content),
		Summary:     chapter.Summary,
		Notes:       chapter.Notes,
		EndNotes:    chapter.EndNotes,
		CoinCost:    chapter.CoinCost,
		Locked:      false,
		PublishedAt: chapter.PublishedAt,
	})

	if user, ok := middleware.UserFromContext(r); ok {
		recordReadingProgress(user.ID, chapter.StoryID, chapter.ID, chapter.Number)
	}
}

func UnlockChapterHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	chapterID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid chapter id"}`, http.StatusBadRequest)
		return
	}

	var chapter models.Chapter
	if err := config.DB.First(&chapter, chapterID).Error; err != nil {
		http.Error(w, `{"error":"chapter not found"}`, http.StatusNotFound)
		return
	}

	if chapter.CoinCost == 0 {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"message": "chapter is free",
			"coins":   user.Coins,
		})
		return
	}

	if isChapterUnlocked(user.ID, chapter.ID) {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"message": "already unlocked",
			"coins":   user.Coins,
		})
		return
	}

	if user.Coins < chapter.CoinCost {
		http.Error(w, `{"error":"insufficient coins"}`, http.StatusPaymentRequired)
		return
	}

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.User{}).Where("id = ? AND coins >= ?", user.ID, chapter.CoinCost).
			Update("coins", gorm.Expr("coins - ?", chapter.CoinCost)).Error; err != nil {
			return err
		}
		return tx.Create(&models.ChapterUnlock{
			UserID:    user.ID,
			ChapterID: chapter.ID,
		}).Error
	})
	if err != nil {
		http.Error(w, `{"error":"failed to unlock chapter"}`, http.StatusInternalServerError)
		return
	}

	config.DB.First(&user, user.ID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "chapter unlocked",
		"coins":   user.Coins,
	})
}

func blockedTagsForUser(r *http.Request) []string {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		return nil
	}
	return parseStringList(user.BlockedTags)
}

func storyHasBlockedTag(tags []models.Tag, blocked []string) bool {
	if len(blocked) == 0 {
		return false
	}
	blockedSet := make(map[string]bool, len(blocked))
	for _, b := range blocked {
		blockedSet[b] = true
	}
	for _, tag := range tags {
		if blockedSet[tag.Slug] {
			return true
		}
	}
	return false
}

func parseQueryList(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = slugify(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}

func unlockedChapterIDs(r *http.Request, chapters []models.Chapter) map[uint]bool {
	result := make(map[uint]bool)
	user, ok := middleware.UserFromContext(r)
	if !ok {
		return result
	}

	ids := make([]uint, 0, len(chapters))
	for _, ch := range chapters {
		if ch.CoinCost == 0 {
			result[ch.ID] = true
			continue
		}
		ids = append(ids, ch.ID)
	}

	if len(ids) == 0 {
		return result
	}

	var unlocks []models.ChapterUnlock
	config.DB.Where("user_id = ? AND chapter_id IN ?", user.ID, ids).Find(&unlocks)
	for _, u := range unlocks {
		result[u.ChapterID] = true
	}
	return result
}

func isChapterUnlocked(userID, chapterID uint) bool {
	var count int64
	config.DB.Model(&models.ChapterUnlock{}).
		Where("user_id = ? AND chapter_id = ?", userID, chapterID).
		Count(&count)
	return count > 0
}
