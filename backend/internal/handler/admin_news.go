package handler

import (
	"net/http"
	"strings"

	"github.com/taugether/taugether/internal/database"
)

func (a *App) HandleAdminReports(w http.ResponseWriter, r *http.Request) {
	reports, err := a.DB.ListUnresolvedReports(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, reports)
}

func (a *App) HandleAdminResolveReport(w http.ResponseWriter, r *http.Request) {
	reportID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid report id")
		return
	}
	report, err := a.DB.GetReportByID(r.Context(), reportID)
	if err != nil || report == nil {
		writeErr(w, http.StatusNotFound, "report not found")
		return
	}
	if err := a.DB.ResolveReport(r.Context(), reportID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "report resolved"})
}

func (a *App) HandleAdminDeletePost(w http.ResponseWriter, r *http.Request) {
	postID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid post id")
		return
	}
	if err := a.DB.DeletePost(r.Context(), postID); err != nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "post deleted"})
}

// HandleNewsList returns all news posts (public).
func (a *App) HandleNewsList(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePage(r)
	posts, err := a.DB.ListPosts(r.Context(), database.PostFilters{
		UserID: userID(r), News: true, Limit: limit, Offset: offset,
	})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, posts)
}

// HandleNewsCreate allows admins to publish news.
func (a *App) HandleNewsCreate(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "authentication required")
		return
	}

	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		a.handleCreatePostMultipart(w, r, uid, true)
		return
	}

	var req struct {
		Title   string `json:"title"`
		Content string `json:"content"`
		TagID   int    `json:"tag_id"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Title = trimSpace(req.Title)
	if req.Title == "" {
		writeErr(w, http.StatusBadRequest, "title is required")
		return
	}
	if len(req.Title) > 255 {
		writeErr(w, http.StatusBadRequest, "title too long (max 255 characters)")
		return
	}
	tag, err := a.DB.GetTagByID(r.Context(), req.TagID)
	if err != nil || tag == nil {
		writeErr(w, http.StatusBadRequest, "invalid tag")
		return
	}

	postID, err := a.DB.CreatePost(r.Context(), uid, req.TagID, req.Title, req.Content, true)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	p, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil || p == nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

// HandleSearch searches posts by query (full-text).
func (a *App) HandleSearch(w http.ResponseWriter, r *http.Request) {
	q := trimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeJSON(w, http.StatusOK, []any{})
		return
	}
	limit, offset := parsePage(r)
	posts, err := a.DB.ListPosts(r.Context(), database.PostFilters{
		UserID: userID(r), News: false, Query: q, Limit: limit, Offset: offset,
	})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, posts)
}
