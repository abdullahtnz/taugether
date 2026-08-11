package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type signupRequest struct {
	Username       string `json:"username"`
	Email          string `json:"email"`
	Password       string `json:"password"`
	ProfilePicture int    `json:"profile_picture"`
	YearRoleID     *int   `json:"year_role_id"`
	AcceptedTerms  bool   `json:"accepted_terms"`
}

type loginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         any    `json:"user"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func (a *App) generateTokens(userID string, isAdmin bool) (string, string, time.Time, error) {
	accessClaims := jwt.MapClaims{
		"uid": userID,
		"adm": isAdmin,
		"exp": time.Now().Add(a.Cfg.AccessTokenExpiry).Unix(),
		"iat": time.Now().Unix(),
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString([]byte(a.Cfg.JWTSecret))
	if err != nil {
		return "", "", time.Time{}, err
	}

	expiresAt := time.Now().Add(a.Cfg.RefreshTokenExp)
	refreshClaims := jwt.MapClaims{
		"uid": userID,
		"exp": expiresAt.Unix(),
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString([]byte(a.Cfg.JWTRefreshSecret))
	if err != nil {
		return "", "", time.Time{}, err
	}

	return accessToken, refreshToken, expiresAt, nil
}

func (a *App) HandleSignup(w http.ResponseWriter, r *http.Request) {
	var req signupRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Username = trimSpace(req.Username)
	req.Email = trimSpace(req.Email)

	if !req.AcceptedTerms {
		writeErr(w, http.StatusBadRequest, "you must accept the Terms of Service and Privacy Policy to sign up")
		return
	}
	if !validUsername(req.Username) {
		writeErr(w, http.StatusBadRequest, "username must be 3-30 characters using letters, numbers, _, -, or .")
		return
	}
	if !validEmail(req.Email) {
		writeErr(w, http.StatusBadRequest, "invalid email address")
		return
	}
	if issues := passwordIssues(req.Password); len(issues) > 0 {
		writeErr(w, http.StatusBadRequest, issues[0])
		return
	}
	if req.ProfilePicture < 0 || req.ProfilePicture > 5 {
		writeErr(w, http.StatusBadRequest, "profile picture must be between 0 and 5")
		return
	}

	// Validate year role if provided.
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

	if existing, err := a.DB.GetUserByUsername(r.Context(), req.Username); err == nil && existing != nil {
		writeErr(w, http.StatusConflict, "username is already taken")
		return
	}
	if existing, err := a.DB.GetUserByEmail(r.Context(), req.Email); err == nil && existing != nil {
		writeErr(w, http.StatusConflict, "email is already registered")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	user, err := a.DB.CreateUser(r.Context(), req.Username, req.Email, string(hash), req.ProfilePicture, req.YearRoleID)
	if err != nil {
		writeErr(w, http.StatusConflict, "username or email already in use")
		return
	}

	accessToken, refreshToken, expiresAt, err := a.generateTokens(user.ID, user.IsAdmin)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}
	if err := a.DB.SaveRefreshToken(r.Context(), user.ID, hashToken(refreshToken), expiresAt); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to save session")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user":          user,
	})
}

func (a *App) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Identifier = trimSpace(req.Identifier)

	var user *pgxRowUser
	var err error
	if validEmail(req.Identifier) {
		user, err = a.getUserByEmail(r, req.Identifier)
	} else {
		user, err = a.getUserByUsername(r, req.Identifier)
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if user == nil {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.passwordHash), []byte(req.Password)); err != nil {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	accessToken, refreshToken, expiresAt, err := a.generateTokens(user.id, user.isAdmin)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}
	if err := a.DB.SaveRefreshToken(r.Context(), user.id, hashToken(refreshToken), expiresAt); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to save session")
		return
	}

	u, err := a.DB.GetUserByID(r.Context(), user.id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if err := a.DB.LoadProfile(r.Context(), u); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user":          u,
	})
}

func (a *App) HandleRefresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.RefreshToken == "" {
		writeErr(w, http.StatusBadRequest, "refresh token required")
		return
	}

	tokenHash := hashToken(req.RefreshToken)
	userID, err := a.DB.FindRefreshToken(r.Context(), tokenHash)
	if err != nil || userID == "" {
		writeErr(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	u, err := a.DB.GetUserByID(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if u == nil {
		writeErr(w, http.StatusUnauthorized, "account not found")
		return
	}

	// Rotate refresh token.
	if err := a.DB.RevokeRefreshToken(r.Context(), tokenHash); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	accessToken, refreshToken, expiresAt, err := a.generateTokens(u.ID, u.IsAdmin)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}
	if err := a.DB.SaveRefreshToken(r.Context(), u.ID, hashToken(refreshToken), expiresAt); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to save session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user":          u,
	})
}

func (a *App) HandleLogout(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.RefreshToken != "" {
		_ = a.DB.RevokeRefreshToken(r.Context(), hashToken(req.RefreshToken))
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

// pgxRowUser is a lightweight row for login (avoids loading roles).
type pgxRowUser struct {
	id           string
	username     string
	email        string
	passwordHash string
	isAdmin      bool
}

func (a *App) getUserByEmail(r *http.Request, email string) (*pgxRowUser, error) {
	var u pgxRowUser
	err := a.DB.Pool.QueryRow(r.Context(),
		`SELECT id, username, email, password_hash, is_admin FROM users WHERE LOWER(email) = LOWER($1)`, email).
		Scan(&u.id, &u.username, &u.email, &u.passwordHash, &u.isAdmin)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (a *App) getUserByUsername(r *http.Request, username string) (*pgxRowUser, error) {
	var u pgxRowUser
	err := a.DB.Pool.QueryRow(r.Context(),
		`SELECT id, username, email, password_hash, is_admin FROM users WHERE username = $1`, username).
		Scan(&u.id, &u.username, &u.email, &u.passwordHash, &u.isAdmin)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}
