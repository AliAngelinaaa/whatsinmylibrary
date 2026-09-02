package controllers

import (
	"backend/config"
	"net/http"
	"strings"
)

type genreCount struct {
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Count int64  `json:"count"`
}

type tagCount struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Slug     string `json:"slug"`
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

func ListGenresHandler(w http.ResponseWriter, r *http.Request) {
	type row struct {
		Genre string
		Count int64
	}
	var rows []row
	config.DB.Raw(`
		SELECT genre, COUNT(*) as count
		FROM stories
		GROUP BY genre
		ORDER BY count DESC
	`).Scan(&rows)

	genres := make([]genreCount, 0, len(rows))
	for _, row := range rows {
		if row.Genre == "" {
			continue
		}
		genres = append(genres, genreCount{
			Name:  row.Genre,
			Slug:  slugify(row.Genre),
			Count: row.Count,
		})
	}

	writeJSON(w, http.StatusOK, genres)
}

func ListTagsHandler(w http.ResponseWriter, r *http.Request) {
	type row struct {
		ID       uint
		Name     string
		Slug     string
		Category string
		Count    int64
	}

	query := config.DB.Table("tags").
		Select("tags.id, tags.name, tags.slug, tags.category, COUNT(story_tags.story_id) as count").
		Joins("LEFT JOIN story_tags ON story_tags.tag_id = tags.id").
		Group("tags.id, tags.name, tags.slug, tags.category").
		Order("count DESC, tags.name ASC")

	if category := strings.TrimSpace(r.URL.Query().Get("category")); category != "" {
		query = query.Where("tags.category = ?", category)
	}
	if q := strings.TrimSpace(r.URL.Query().Get("q")); q != "" {
		query = query.Where("tags.name LIKE ?", "%"+q+"%")
	}

	var rows []row
	query.Scan(&rows)

	tags := make([]tagCount, 0, len(rows))
	for _, row := range rows {
		category := row.Category
		if category == "" {
			category = "freeform"
		}
		tags = append(tags, tagCount{
			ID:       row.ID,
			Name:     row.Name,
			Slug:     row.Slug,
			Category: category,
			Count:    row.Count,
		})
	}

	writeJSON(w, http.StatusOK, tags)
}
