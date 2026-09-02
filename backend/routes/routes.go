package routes

import (
	"backend/controllers"
	"backend/middleware"
	"net/http"
	"time"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeGuard(next http.Handler) http.Handler {
	return middleware.AuthRequired(middleware.RateLimit(20, time.Minute)(next))
}

func SetupRouter() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	mux.HandleFunc("GET /auth/google", controllers.GoogleLoginHandler)
	mux.HandleFunc("GET /auth/google/callback", controllers.GoogleCallbackHandler)
	mux.HandleFunc("POST /auth/dev", controllers.DevLoginHandler)

	mux.Handle("GET /api/me", middleware.AuthRequired(http.HandlerFunc(controllers.MeHandler)))
	mux.Handle("PUT /api/me", middleware.AuthRequired(http.HandlerFunc(controllers.UpdateProfileHandler)))
	mux.Handle("GET /api/me/history", middleware.AuthRequired(http.HandlerFunc(controllers.UserHistoryHandler)))
	mux.Handle("POST /api/me/avatar", writeGuard(http.HandlerFunc(controllers.UploadAvatarHandler)))
	mux.Handle("POST /api/me/banner", writeGuard(http.HandlerFunc(controllers.UploadBannerHandler)))

	mux.Handle("GET /api/users/{username}", middleware.OptionalAuth(http.HandlerFunc(controllers.GetPublicUserHandler)))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	mux.Handle("PUT /api/stories/{id}/bookmark", writeGuard(http.HandlerFunc(controllers.SetStoryBookmarkHandler)))
	mux.Handle("DELETE /api/stories/{id}/bookmark", writeGuard(http.HandlerFunc(controllers.DeleteStoryBookmarkHandler)))

	mux.HandleFunc("GET /api/genres", controllers.ListGenresHandler)
	mux.HandleFunc("GET /api/tags", controllers.ListTagsHandler)

	mux.Handle("GET /api/stories", middleware.OptionalAuth(http.HandlerFunc(controllers.ListStoriesHandler)))
	mux.Handle("GET /api/stories/{id}", middleware.OptionalAuth(http.HandlerFunc(controllers.GetStoryHandler)))
	mux.Handle("GET /api/stories/{id}/chapters/{num}", middleware.OptionalAuth(http.HandlerFunc(controllers.GetChapterHandler)))
	mux.Handle("POST /api/chapters/{id}/unlock", writeGuard(http.HandlerFunc(controllers.UnlockChapterHandler)))

	// Authoring: writing & publishing
	mux.Handle("GET /api/me/stories", writeGuard(http.HandlerFunc(controllers.ListMyStoriesHandler)))
	mux.Handle("POST /api/stories", writeGuard(http.HandlerFunc(controllers.CreateStoryHandler)))
	mux.Handle("PUT /api/stories/{id}", writeGuard(http.HandlerFunc(controllers.UpdateStoryHandler)))
	mux.Handle("DELETE /api/stories/{id}", writeGuard(http.HandlerFunc(controllers.DeleteStoryHandler)))
	mux.Handle("POST /api/stories/{id}/cover", writeGuard(http.HandlerFunc(controllers.UploadStoryCoverHandler)))
	mux.Handle("POST /api/stories/{id}/chapters", writeGuard(http.HandlerFunc(controllers.CreateChapterHandler)))
	mux.Handle("PUT /api/stories/{id}/chapters/reorder", writeGuard(http.HandlerFunc(controllers.ReorderChaptersHandler)))
	mux.Handle("GET /api/chapters/{id}/edit", writeGuard(http.HandlerFunc(controllers.GetChapterForEditHandler)))
	mux.Handle("PUT /api/chapters/{id}", writeGuard(http.HandlerFunc(controllers.UpdateChapterHandler)))
	mux.Handle("DELETE /api/chapters/{id}", writeGuard(http.HandlerFunc(controllers.DeleteChapterHandler)))

	mux.HandleFunc("GET /api/coins/packs", controllers.ListCoinPacksHandler)
	mux.Handle("POST /api/coins/purchase", writeGuard(http.HandlerFunc(controllers.PurchaseCoinsHandler)))

	// Tips
	mux.HandleFunc("GET /api/tips/amounts", controllers.ListTipAmountsHandler)
	mux.Handle("POST /api/stories/{id}/tip", writeGuard(http.HandlerFunc(controllers.TipAuthorHandler)))

	// Comments
	mux.HandleFunc("GET /api/stories/{id}/comments", controllers.ListStoryCommentsHandler)
	mux.Handle("POST /api/stories/{id}/comments", writeGuard(http.HandlerFunc(controllers.CreateStoryCommentHandler)))
	mux.Handle("GET /api/chapters/{id}/line-comments", middleware.OptionalAuth(http.HandlerFunc(controllers.ListLineCommentsHandler)))
	mux.Handle("POST /api/chapters/{id}/line-comments", writeGuard(http.HandlerFunc(controllers.CreateLineCommentHandler)))

	// Forum
	mux.HandleFunc("GET /api/forum/categories", controllers.ListForumCategoriesHandler)
	mux.HandleFunc("GET /api/forum/feed", controllers.ForumFeedHandler)
	mux.HandleFunc("GET /api/forum/categories/{slug}/threads", controllers.ListForumThreadsHandler)
	mux.HandleFunc("GET /api/forum/threads/{id}", controllers.GetForumThreadHandler)
	mux.Handle("POST /api/forum/threads", writeGuard(http.HandlerFunc(controllers.CreateForumThreadHandler)))
	mux.Handle("POST /api/forum/threads/{id}/replies", writeGuard(http.HandlerFunc(controllers.CreateForumReplyHandler)))

	return corsMiddleware(mux)
}
