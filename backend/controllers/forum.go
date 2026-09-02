package controllers

import (
	"backend/config"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func ListForumCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	var categories []models.ForumCategory
	config.DB.Order("id asc").Find(&categories)

	out := make([]map[string]interface{}, 0, len(categories))
	for _, cat := range categories {
		var threadCount int64
		config.DB.Model(&models.ForumThread{}).Where("category_id = ?", cat.ID).Count(&threadCount)
		out = append(out, map[string]interface{}{
			"id":          cat.ID,
			"name":        cat.Name,
			"slug":        cat.Slug,
			"description": cat.Description,
			"threadCount": threadCount,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

func ListForumThreadsHandler(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	var category models.ForumCategory
	if err := config.DB.Where("slug = ?", slug).First(&category).Error; err != nil {
		http.Error(w, `{"error":"category not found"}`, http.StatusNotFound)
		return
	}

	var threads []models.ForumThread
	config.DB.Preload("User").Where("category_id = ?", category.ID).
		Order("updated_at desc").Limit(50).Find(&threads)

	out := make([]map[string]interface{}, 0, len(threads))
	for _, t := range threads {
		out = append(out, forumThreadSummary(t, category))
	}
	writeJSON(w, http.StatusOK, out)
}

func ForumFeedHandler(w http.ResponseWriter, r *http.Request) {
	sort := strings.TrimSpace(r.URL.Query().Get("sort"))
	if sort == "" {
		sort = "latest"
	}

	limit := 10
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}

	var threads []models.ForumThread
	query := config.DB.Preload("User").Preload("Category")
	if sort == "hot" {
		query = query.Order(`
			(SELECT COUNT(*) FROM forum_replies WHERE forum_replies.thread_id = forum_threads.id) DESC,
			updated_at DESC
		`)
	} else {
		query = query.Order("updated_at DESC")
	}
	query.Limit(limit).Find(&threads)

	out := make([]map[string]interface{}, 0, len(threads))
	for _, t := range threads {
		out = append(out, forumThreadSummary(t, t.Category))
	}
	writeJSON(w, http.StatusOK, out)
}

func forumThreadSummary(t models.ForumThread, category models.ForumCategory) map[string]interface{} {
	var replyCount int64
	config.DB.Model(&models.ForumReply{}).Where("thread_id = ?", t.ID).Count(&replyCount)
	return map[string]interface{}{
		"id":         t.ID,
		"title":      t.Title,
		"body":       truncate(t.Body, 200),
		"createdAt":  t.CreatedAt,
		"updatedAt":  t.UpdatedAt,
		"replyCount": replyCount,
		"user":       commentUserFrom(t.User),
		"category": map[string]interface{}{
			"id":   category.ID,
			"name": category.Name,
			"slug": category.Slug,
		},
	}
}

func GetForumThreadHandler(w http.ResponseWriter, r *http.Request) {
	threadID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid thread id"}`, http.StatusBadRequest)
		return
	}

	var thread models.ForumThread
	if err := config.DB.Preload("User").Preload("Category").First(&thread, threadID).Error; err != nil {
		http.Error(w, `{"error":"thread not found"}`, http.StatusNotFound)
		return
	}

	var replies []models.ForumReply
	config.DB.Preload("User").Where("thread_id = ?", thread.ID).
		Order("created_at asc").Find(&replies)

	replyOut := make([]map[string]interface{}, 0, len(replies))
	for _, rep := range replies {
		replyOut = append(replyOut, forumReplyResponse(rep))
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":        thread.ID,
		"title":     thread.Title,
		"body":      thread.Body,
		"createdAt": thread.CreatedAt,
		"updatedAt": thread.UpdatedAt,
		"user":      commentUserFrom(thread.User),
		"category": map[string]interface{}{
			"id":   thread.Category.ID,
			"name": thread.Category.Name,
			"slug": thread.Category.Slug,
		},
		"replies": replyOut,
	})
}

func CreateForumThreadHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var body struct {
		contentPayload
		CategorySlug string `json:"categorySlug"`
		Title        string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if err := validateContent(user, body.Body, body.Honeypot); err != nil {
		writeBotError(w, err)
		return
	}

	title := strings.TrimSpace(body.Title)
	if len(title) < 3 || len(title) > 200 {
		http.Error(w, `{"error":"title must be 3–200 characters"}`, http.StatusBadRequest)
		return
	}

	var category models.ForumCategory
	if err := config.DB.Where("slug = ?", body.CategorySlug).First(&category).Error; err != nil {
		http.Error(w, `{"error":"category not found"}`, http.StatusBadRequest)
		return
	}

	thread := models.ForumThread{
		CategoryID: category.ID,
		UserID:     user.ID,
		Title:      title,
		Body:       strings.TrimSpace(body.Body),
	}
	if err := config.DB.Create(&thread).Error; err != nil {
		http.Error(w, `{"error":"failed to create thread"}`, http.StatusInternalServerError)
		return
	}

	config.DB.Preload("User").Preload("Category").First(&thread, thread.ID)
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id":    thread.ID,
		"title": thread.Title,
	})
}

func CreateForumReplyHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	threadID, err := strconv.ParseUint(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, `{"error":"invalid thread id"}`, http.StatusBadRequest)
		return
	}

	var body struct {
		contentPayload
		ParentID *uint `json:"parentId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if err := validateContent(user, body.Body, body.Honeypot); err != nil {
		writeBotError(w, err)
		return
	}

	var thread models.ForumThread
	if err := config.DB.First(&thread, threadID).Error; err != nil {
		http.Error(w, `{"error":"thread not found"}`, http.StatusNotFound)
		return
	}

	if body.ParentID != nil {
		var parent models.ForumReply
		if err := config.DB.First(&parent, *body.ParentID).Error; err != nil || parent.ThreadID != uint(threadID) {
			http.Error(w, `{"error":"invalid parent reply"}`, http.StatusBadRequest)
			return
		}
	}

	reply := models.ForumReply{
		ThreadID: uint(threadID),
		UserID:   user.ID,
		ParentID: body.ParentID,
		Body:     strings.TrimSpace(body.Body),
	}
	if err := config.DB.Create(&reply).Error; err != nil {
		http.Error(w, `{"error":"failed to post reply"}`, http.StatusInternalServerError)
		return
	}

	config.DB.Model(&thread).Update("updated_at", reply.CreatedAt)

	config.DB.Preload("User").First(&reply, reply.ID)
	writeJSON(w, http.StatusCreated, forumReplyResponse(reply))
}

func forumReplyResponse(rep models.ForumReply) map[string]interface{} {
	resp := map[string]interface{}{
		"id":        rep.ID,
		"body":      rep.Body,
		"createdAt": rep.CreatedAt,
		"user":      commentUserFrom(rep.User),
	}
	if rep.ParentID != nil {
		resp["parentId"] = *rep.ParentID
	}
	return resp
}

func truncate(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}
