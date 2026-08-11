package handler

import (
	"net/http"
)

type createCommentRequest struct {
	Content  string  `json:"content"`
	ParentID *string `json:"parent_id"`
}

func (a *App) HandleGetComments(w http.ResponseWriter, r *http.Request) {
	postID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid post id")
		return
	}
	p, err := a.DB.GetPostByID(r.Context(), userID(r), postID)
	if err != nil || p == nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}
	comments, err := a.DB.GetCommentsForPost(r.Context(), postID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, comments)
}

func (a *App) HandleCreateComment(w http.ResponseWriter, r *http.Request) {
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

	var req createCommentRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Content = trimSpace(req.Content)
	if req.Content == "" {
		writeErr(w, http.StatusBadRequest, "comment content is required")
		return
	}
	if len(req.Content) > 5000 {
		writeErr(w, http.StatusBadRequest, "comment too long (max 5000 characters)")
		return
	}

	p, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil || p == nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}

	depth := 0
	var parentOwnerID string

	if req.ParentID != nil {
		parentID := *req.ParentID
		if parentID == "" {
			writeErr(w, http.StatusBadRequest, "invalid parent comment")
			return
		}
		parentPostID, parentOwner, parentDepth, err := a.DB.GetCommentPostAndOwner(r.Context(), parentID)
		if err != nil || parentPostID != postID {
			writeErr(w, http.StatusBadRequest, "parent comment not found in this post")
			return
		}
		if parentDepth >= 3 {
			writeErr(w, http.StatusBadRequest, "comments can only be nested 4 levels deep")
			return
		}
		depth = parentDepth + 1
		parentOwnerID = parentOwner
	} else {
		parentOwnerID = p.Author.ID
	}

	comment, err := a.DB.CreateComment(r.Context(), postID, uid, req.ParentID, req.Content, depth)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}

	if err := a.DB.IncrementCommentCount(r.Context(), postID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}

	// Notifications: reply to comment -> parent commenter; comment on post -> post author.
	if req.ParentID != nil {
		if err := a.DB.CreateNotification(r.Context(), parentOwnerID, "reply", &postID, &comment.ID, uid); err == nil {
		}
	} else {
		if err := a.DB.CreateNotification(r.Context(), p.Author.ID, "comment", &postID, &comment.ID, uid); err == nil {
		}
	}

	writeJSON(w, http.StatusCreated, comment)
}

func (a *App) HandleDeleteComment(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "authentication required")
		return
	}
	commentID, ok := parseUUIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid comment id")
		return
	}

	ownerID, err := a.DB.GetCommentOwner(r.Context(), commentID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "comment not found")
		return
	}

	postID, _, _, err := a.DB.GetCommentPostAndOwner(r.Context(), commentID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "comment not found")
		return
	}

	// Allow deletion if owner, or post author, or admin.
	p, err := a.DB.GetPostByID(r.Context(), uid, postID)
	if err != nil || p == nil {
		writeErr(w, http.StatusNotFound, "post not found")
		return
	}

	if ownerID != uid && p.Author.ID != uid && !isAdmin(r) {
		writeErr(w, http.StatusForbidden, "you cannot delete this comment")
		return
	}

	if err := a.DB.DeleteComment(r.Context(), commentID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if err := a.DB.UpdateCommentCount(r.Context(), postID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "comment deleted"})
}
