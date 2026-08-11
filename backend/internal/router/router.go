package router

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/taugether/taugether/internal/config"
	"github.com/taugether/taugether/internal/database"
	"github.com/taugether/taugether/internal/handler"
	"github.com/taugether/taugether/internal/middleware"
)

func New(cfg *config.Config, db *database.DB) http.Handler {
	app := &handler.App{DB: db, Cfg: cfg}

	apiLimiter := middleware.NewRateLimiter(60, time.Minute)
	authLimiter := middleware.NewRateLimiter(10, time.Minute)
	postLimiter := middleware.NewRateLimiter(10, time.Minute)

	_ = apiLimiter

	r := chi.NewRouter()

	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.CORS(cfg.CORSOrigin))
	r.Use(middleware.RequestLogger)

	authMw := middleware.Auth(cfg.JWTSecret)
	optAuthMw := middleware.OptionalAuth(cfg.JWTSecret, cfg)
	adminMw := middleware.RequireAdmin

	// Health check.
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Uploaded files.
	r.Get("/uploads/{name}", app.HandleUploadFile)

	r.Route("/api/v1", func(api chi.Router) {
		api.Use(optAuthMw)

		// Auth.
		api.Group(func(g chi.Router) {
			g.Use(authLimiter.Middleware)
			g.Post("/auth/signup", app.HandleSignup)
			g.Post("/auth/login", app.HandleLogin)
			g.Post("/auth/refresh", app.HandleRefresh)
			g.Post("/auth/logout", app.HandleLogout)
		})

		// Public.
		api.Get("/tags", app.HandleListTags)
		api.Get("/roles", app.HandleListRoles)
		api.Get("/clubs", app.HandleListClubs)
		api.Get("/clubs/{id:[0-9]+}", app.HandleGetClub)
		api.Get("/clubs/{id:[0-9]+}/members", app.HandleClubMembers)
		api.Get("/users/{username}", app.HandleGetUserByUsername)
		api.Get("/users/{username}/posts", app.HandleUserPosts)

		// Posts.
		api.Get("/posts", app.HandleListPosts)
		api.Get("/posts/{id}", app.HandleGetPost)
		api.Get("/posts/{id}/comments", app.HandleGetComments)

		// News.
		api.Get("/news", app.HandleNewsList)

		// Search.
		api.Get("/search", app.HandleSearch)

		// Authenticated.
		api.Group(func(g chi.Router) {
			g.Use(authMw)
			g.Get("/me", app.HandleMe)
			g.Put("/me", app.HandleUpdateProfile)
			g.Put("/me/year-role", app.HandleUpdateYearRole)
			g.Put("/me/password", app.HandleChangePassword)
			g.Get("/me/bookmarks", app.HandleBookmarkedPosts)
			g.Get("/me/notifications", app.HandleNotifications)
			g.Post("/me/notifications/read", app.HandleMarkNotificationsRead)

			g.Group(func(pg chi.Router) {
				pg.Use(postLimiter.Middleware)
				pg.Post("/posts", app.HandleCreatePost)
			})
			g.Put("/posts/{id}", app.HandleUpdatePost)
			g.Delete("/posts/{id}", app.HandleDeletePost)
			g.Post("/posts/{id}/like", app.HandleToggleLike)
			g.Post("/posts/{id}/report", app.HandleReportPost)
			g.Post("/posts/{id}/bookmark", app.HandleToggleBookmark)

			g.Post("/posts/{id}/comments", app.HandleCreateComment)
			g.Delete("/comments/{id}", app.HandleDeleteComment)

			g.Post("/clubs/{id:[0-9]+}/join", app.HandleJoinClub)
			g.Post("/clubs/{id:[0-9]+}/leave", app.HandleLeaveClub)

			// Admin.
			g.Group(func(ag chi.Router) {
				ag.Use(adminMw)
				ag.Get("/admin/reports", app.HandleAdminReports)
				ag.Post("/admin/reports/{id}/resolve", app.HandleAdminResolveReport)
				ag.Delete("/admin/posts/{id}", app.HandleAdminDeletePost)

				ag.Post("/tags", app.HandleAdminCreateTag)
				ag.Put("/tags/{id:[0-9]+}", app.HandleAdminRenameTag)
				ag.Delete("/tags/{id:[0-9]+}", app.HandleAdminDeleteTag)

				ag.Post("/roles", app.HandleAdminCreateRole)
				ag.Put("/roles/{id:[0-9]+}", app.HandleAdminUpdateRole)
				ag.Delete("/roles/{id:[0-9]+}", app.HandleAdminDeleteRole)

				ag.Post("/clubs", app.HandleAdminCreateClub)
				ag.Put("/clubs/{id:[0-9]+}", app.HandleAdminUpdateClub)
				ag.Delete("/clubs/{id:[0-9]+}", app.HandleAdminDeleteClub)

				ag.Post("/news", app.HandleNewsCreate)
			})
		})
	})

	return r
}
