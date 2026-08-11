package handler

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/taugether/taugether/internal/database"
	"github.com/taugether/taugether/internal/models"
)

const (
	maxImageSize = 2 * 1024 * 1024   // 2MB
	maxFileSize  = 200 * 1024 * 1024 // 200MB safety cap
)

func randomFileName(ext string) string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b) + ext
}

func safeFileExt(original string) string {
	ext := strings.ToLower(filepath.Ext(original))
	if len(ext) > 10 || !isAllowedExt(ext) {
		return ""
	}
	return ext
}

func isAllowedExt(ext string) bool {
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg",
		".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt",
		".zip", ".rar", ".7z", ".md", ".csv", ".mp4", ".mp3", ".json":
		return true
	}
	return false
}

// saveUploadToDir saves an upload into the configured upload directory.
func saveUploadToDir(uploadDir string, file io.Reader, original string, isImage bool, size int64) (models.Image, error) {
	if isImage {
		if size > maxImageSize {
			return models.Image{}, errors.New("image exceeds 2MB limit")
		}
	} else {
		if size > maxFileSize {
			return models.Image{}, errors.New("file exceeds 200MB limit")
		}
	}

	ext := safeFileExt(original)
	if ext == "" {
		ext = ".bin"
	}

	filename := randomFileName(ext)
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return models.Image{}, err
	}
	dst, err := os.Create(filepath.Join(uploadDir, filename))
	if err != nil {
		return models.Image{}, err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		os.Remove(filepath.Join(uploadDir, filename))
		return models.Image{}, err
	}

	return models.Image{
		FileName: filename,
		Original: original,
		Size:     size,
		URL:      "/uploads/" + filename,
	}, nil
}

type createPostRequest struct {
	Title   string         `json:"title"`
	Content string         `json:"content"`
	TagID   int            `json:"tag_id"`
	Images  []models.Image `json:"-"`
	Files   []models.File  `json:"-"`
}

func (a *App) HandleListPosts(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePage(r)
	uid := userID(r)

	f := database.PostFilters{
		UserID: uid,
		News:   false,
		Limit:  limit,
		Offset: offset,
	}

	if tagIDStr := r.URL.Query().Get("tag"); tagIDStr != "" {
		if tag, err := a.DB.GetTagByName(r.Context(), tagIDStr); err == nil && tag != nil {
			f.TagID = &tag.ID
		} else {
			writeJSON(w, http.StatusOK, []models.Post{})
			return
		}
	}
	if q := r.URL.Query().Get("q"); q != "" {
		f.Query = q
	}

	posts, err := a.DB.ListPosts(r.Context(), f)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, posts)
}

func (a *App) HandleGetPost(w http.ResponseWriter, r *http.Request) {
	postID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid post id")
		return
	}
	uid := userID(r)
	p, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if p == nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (a *App) HandleCreatePost(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "authentication required")
		return
	}

	// Detect multipart vs JSON.
	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		a.handleCreatePostMultipart(w, r, uid, false)
		return
	}

	var req createPostRequest
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

	postID, err := a.DB.CreatePost(r.Context(), uid, req.TagID, req.Title, req.Content, false)
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

func (a *App) handleCreatePostMultipart(w http.ResponseWriter, r *http.Request, uid string, isNews bool) {
	r.Body = http.MaxBytesReader(w, r.Body, maxFileSize+1<<20)
	if err := r.ParseMultipartForm(maxFileSize); err != nil {
		writeErr(w, http.StatusBadRequest, "failed to parse upload, file too large")
		return
	}

	title := trimSpace(r.FormValue("title"))
	content := r.FormValue("content")
	if title == "" {
		writeErr(w, http.StatusBadRequest, "title is required")
		return
	}
	if len(title) > 255 {
		writeErr(w, http.StatusBadRequest, "title too long (max 255 characters)")
		return
	}

	tagIDStr := r.FormValue("tag_id")
	if tagIDStr == "" && !isNews {
		writeErr(w, http.StatusBadRequest, "tag is required")
		return
	}
	var tagID int
	var tagValid bool
	if tagIDStr != "" {
		tagID, _ = parseID(tagIDStr)
		tag, err := a.DB.GetTagByID(r.Context(), tagID)
		if err == nil && tag != nil {
			tagValid = true
		}
	}
	if !tagValid && !isNews {
		writeErr(w, http.StatusBadRequest, "invalid tag")
		return
	}

	// Collect images and files.
	var images []models.Image
	var files []models.File

	for _, header := range r.MultipartForm.File["images"] {
		f, err := header.Open()
		if err != nil {
			continue
		}
		if header.Size > maxImageSize {
			f.Close()
			writeErr(w, http.StatusBadRequest, "each image must be smaller than 2MB")
			return
		}
		img, err := saveUploadToDir(a.Cfg.UploadDir, f, header.Filename, true, header.Size)
		f.Close()
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		images = append(images, img)
	}

	for _, header := range r.MultipartForm.File["files"] {
		f, err := header.Open()
		if err != nil {
			continue
		}
		if header.Size > maxFileSize {
			f.Close()
			writeErr(w, http.StatusBadRequest, "file exceeds size limit")
			return
		}
		fl, err := saveUploadToDir(a.Cfg.UploadDir, f, header.Filename, false, header.Size)
		f.Close()
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		files = append(files, models.File{
			FileName: fl.FileName,
			Original: fl.Original,
			Size:     fl.Size,
			URL:      fl.URL,
		})
	}

	if !tagValid && isNews {
		// News must still have a tag.
		tagID = 1
	}

	postID, err := a.DB.CreatePost(r.Context(), uid, tagID, title, content, isNews)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}

	if err := a.DB.AddImagesToPost(r.Context(), postID, images); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	for _, fl := range files {
		if err := a.DB.AddPostFile(r.Context(), postID, fl.FileName, fl.Original, fl.Size); err != nil {
			writeErr(w, http.StatusInternalServerError, "database error")
			return
		}
	}

	p, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil || p == nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func parseID(s string) (int, error) {
	var n int
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("invalid number")
		}
		n = n*10 + int(c-'0')
	}
	return n, nil
}

type updatePostRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	TagID   int    `json:"tag_id"`
}

func (a *App) HandleUpdatePost(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "authentication required")
		return
	}
	postID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid post id")
		return
	}

	var req updatePostRequest
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

	p, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if p == nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}
	if p.Author.ID != uid && !isAdmin(r) {
		writeErr(w, http.StatusForbidden, "you can only edit your own posts")
		return
	}
	if p.IsNews && !isAdmin(r) {
		writeErr(w, http.StatusForbidden, "news can only be edited by admins")
		return
	}

	if err := a.DB.UpdatePost(r.Context(), postID, req.TagID, req.Title, req.Content); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	updated, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (a *App) HandleDeletePost(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "authentication required")
		return
	}
	postID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid post id")
		return
	}

	authorID, err := a.DB.GetPostAuthor(r.Context(), postID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}
	if authorID != uid && !isAdmin(r) {
		writeErr(w, http.StatusForbidden, "you can only delete your own posts")
		return
	}

	if err := a.DB.DeletePost(r.Context(), postID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "post deleted"})
}

func (a *App) HandleToggleLike(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "authentication required")
		return
	}
	postID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid post id")
		return
	}

	p, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil || p == nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}
	if p.IsNews {
		writeErr(w, http.StatusBadRequest, "news cannot be liked")
		return
	}

	liked, err := a.DB.ToggleLike(r.Context(), postID, uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"liked": liked})
}

func (a *App) HandleReportPost(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "authentication required")
		return
	}
	postID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid post id")
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	_ = readJSON(r, &req)
	if len(req.Reason) > 500 {
		writeErr(w, http.StatusBadRequest, "reason too long (max 500 characters)")
		return
	}

	p, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil || p == nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}
	if p.Author.ID == uid {
		writeErr(w, http.StatusBadRequest, "you cannot report your own post")
		return
	}
	reported, err := a.DB.HasReported(r.Context(), postID, uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if reported {
		writeErr(w, http.StatusConflict, "you have already reported this post")
		return
	}

	if err := a.DB.CreateReport(r.Context(), postID, uid, req.Reason); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"message": "post reported"})
}

func (a *App) HandleToggleBookmark(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "authentication required")
		return
	}
	postID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid post id")
		return
	}
	p, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil || p == nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}
	saved, err := a.DB.ToggleBookmark(r.Context(), postID, uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"bookmarked": saved})
}

func (a *App) HandleBookmarkedPosts(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "authentication required")
		return
	}
	limit, offset := parsePage(r)
	posts, err := a.DB.ListBookmarkedPosts(r.Context(), uid, limit, offset)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, posts)
}

func (a *App) HandleUserPosts(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	target := r.PathValue("username")
	u, err := a.DB.GetUserByUsername(r.Context(), target)
	if err != nil || u == nil {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	limit, offset := parsePage(r)
	posts, err := a.DB.ListPostsByUser(r.Context(), uid, u.ID, limit, offset)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, posts)
}

// ServeUploadedFile streams uploaded images/files with proper content headers.
func (a *App) HandleUploadFile(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if strings.Contains(name, "/") || strings.Contains(name, "\\") || name == "" {
		writeErr(w, http.StatusBadRequest, "invalid file name")
		return
	}
	path := filepath.Join(a.Cfg.UploadDir, name)
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		writeErr(w, http.StatusNotFound, "file not found")
		return
	}

	w.Header().Set("Content-Type", mime.TypeByExtension(filepath.Ext(name)))
	if isImageExt(filepath.Ext(name)) {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Content-Disposition", `attachment; filename="`+sanitizeFilename(name)+`"`)
		w.Header().Set("Cache-Control", "private, max-age=3600")
	}
	http.ServeFile(w, r, path)
}

func isImageExt(ext string) bool {
	switch strings.ToLower(ext) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg":
		return true
	}
	return false
}

func sanitizeFilename(name string) string {
	clean := strings.Map(func(r rune) rune {
		if r < 32 || r == '"' || r == '\\' || r == '/' || r == ':' || r == '*' || r == '?' || r == '<' || r == '>' || r == '|' {
			return '_'
		}
		return r
	}, name)
	return clean
}
