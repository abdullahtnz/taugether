package handler

import (
	"net/http"

	"github.com/taugether/taugether/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

func (a *App) HandleMe(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	u, err := a.DB.GetUserByID(r.Context(), uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if u == nil {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	if err := a.DB.LoadProfile(r.Context(), u); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (a *App) HandleGetUserByUsername(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	u, err := a.DB.GetUserByUsername(r.Context(), username)
	if err != nil || u == nil {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	a.DB.LoadProfileForPublic(r.Context(), u)
	u.Email = ""
	u.PasswordHash = ""
	writeJSON(w, http.StatusOK, u)
}

type updateProfileRequest struct {
	Username       string `json:"username"`
	ProfilePicture int    `json:"profile_picture"`
}

func (a *App) HandleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req updateProfileRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}

	u, err := a.DB.GetUserByID(r.Context(), uid)
	if err != nil || u == nil {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}

	if req.Username != "" && req.Username != u.Username {
		req.Username = trimSpace(req.Username)
		if !validUsername(req.Username) {
			writeErr(w, http.StatusBadRequest, "username must be 3-30 characters using letters, numbers, _, -, or .")
			return
		}
		existing, err := a.DB.GetUserByUsername(r.Context(), req.Username)
		if err == nil && existing != nil && existing.ID != uid {
			writeErr(w, http.StatusConflict, "username is already taken")
			return
		}
		if err := a.DB.UpdateUsername(r.Context(), uid, req.Username); err != nil {
			writeErr(w, http.StatusConflict, "username is already taken")
			return
		}
	}

	if req.ProfilePicture >= 0 && req.ProfilePicture <= 5 && req.ProfilePicture != u.ProfilePicture {
		if err := a.DB.UpdateProfilePicture(r.Context(), uid, req.ProfilePicture); err != nil {
			writeErr(w, http.StatusInternalServerError, "database error")
			return
		}
	}

	u, err = a.DB.GetUserByID(r.Context(), uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if err := a.DB.LoadProfile(r.Context(), u); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

type updateYearRoleRequest struct {
	YearRoleID *int `json:"year_role_id"`
}

func (a *App) HandleUpdateYearRole(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req updateYearRoleRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.YearRoleID != nil {
		role, err := a.DB.GetRoleByID(r.Context(), *req.YearRoleID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "database error")
			return
		}
		if role == nil || role.RoleType != "year" {
			writeErr(w, http.StatusBadRequest, "invalid year role")
			return
		}
	}

	if err := a.DB.UpdateYearRole(r.Context(), uid, req.YearRoleID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}

	u, err := a.DB.GetUserByID(r.Context(), uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if err := a.DB.LoadProfile(r.Context(), u); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (a *App) HandleChangePassword(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var req changePasswordRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}

	u, err := a.DB.GetUserByID(r.Context(), uid)
	if err != nil || u == nil {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		writeErr(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}
	if issues := passwordIssues(req.NewPassword); len(issues) > 0 {
		writeErr(w, http.StatusBadRequest, issues[0])
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to hash password")
		return
	}
	if err := a.DB.UpdatePassword(r.Context(), uid, string(hash)); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}

	// Revoke all sessions on password change for security.
	_ = a.DB.RevokeAllUserTokens(r.Context(), uid)
	writeJSON(w, http.StatusOK, map[string]string{"message": "password updated, please log in again"})
}

func (a *App) HandleJoinClub(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	clubID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid club id")
		return
	}
	club, err := a.DB.GetClubByID(r.Context(), clubID)
	if err != nil || club == nil {
		writeErr(w, http.StatusNotFound, "club not found")
		return
	}
	if club.RoleID == nil {
		writeErr(w, http.StatusBadRequest, "club has no role")
		return
	}
	if err := a.DB.AssignClubRole(r.Context(), uid, *club.RoleID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "joined club"})
}

func (a *App) HandleLeaveClub(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	clubID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid club id")
		return
	}
	club, err := a.DB.GetClubByID(r.Context(), clubID)
	if err != nil || club == nil {
		writeErr(w, http.StatusNotFound, "club not found")
		return
	}
	if club.RoleID == nil {
		writeErr(w, http.StatusBadRequest, "club has no role")
		return
	}
	if err := a.DB.RemoveClubRole(r.Context(), uid, *club.RoleID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "left club"})
}

func (a *App) HandleNotifications(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	limit, offset := parsePage(r)
	notifs, err := a.DB.ListNotifications(r.Context(), uid, limit, offset)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	unread, err := a.DB.CountUnreadNotifications(r.Context(), uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"notifications": notifs,
		"unread":        unread,
	})
}

func (a *App) HandleMarkNotificationsRead(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	if err := a.DB.MarkNotificationsRead(r.Context(), uid); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "marked as read"})
}

func requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if middleware.UserIDFrom(r.Context()) == "" {
			writeErr(w, http.StatusUnauthorized, "authentication required")
			return
		}
		next.ServeHTTP(w, r)
	})
}
