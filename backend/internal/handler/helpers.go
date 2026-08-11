package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"unicode"

	"github.com/taugether/taugether/internal/config"
	"github.com/taugether/taugether/internal/database"
	"github.com/taugether/taugether/internal/middleware"
)

type App struct {
	DB  *database.DB
	Cfg *config.Config
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func readJSON(r *http.Request, dst any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(dst)
}

func userID(r *http.Request) string {
	return middleware.UserIDFrom(r.Context())
}

func isAdmin(r *http.Request) bool {
	return middleware.IsAdminFrom(r.Context())
}

func parseIDParam(r *http.Request, name string) (int, bool) {
	v, err := strconv.Atoi(r.PathValue(name))
	if err != nil {
		return 0, false
	}
	return v, true
}

func parseUUIDParam(r *http.Request, name string) (string, bool) {
	v := r.PathValue(name)
	return v, v != ""
}

func parsePage(r *http.Request) (limit, offset int) {
	limit = 20
	offset = 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if n, err := strconv.Atoi(o); err == nil && n >= 0 {
			offset = n
		}
	}
	return
}

func validUsername(s string) bool {
	if len(s) < 3 || len(s) > 30 {
		return false
	}
	for _, c := range s {
		if !(unicode.IsLetter(c) || unicode.IsDigit(c) || c == '_' || c == '-' || c == '.') {
			return false
		}
	}
	return true
}

func validEmail(s string) bool {
	if len(s) < 5 || len(s) > 254 || !strings.Contains(s, "@") {
		return false
	}
	at := strings.LastIndex(s, "@")
	if at == 0 || at == len(s)-1 {
		return false
	}
	if !strings.Contains(s[at+1:], ".") {
		return false
	}
	return true
}

func passwordIssues(pw string) []string {
	var issues []string
	if len(pw) < 8 {
		issues = append(issues, "password must be at least 8 characters")
	}
	if len(pw) > 72 {
		issues = append(issues, "password must be at most 72 characters")
	}
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, c := range pw {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		case unicode.IsPunct(c) || unicode.IsSymbol(c):
			hasSpecial = true
		}
	}
	if !hasUpper {
		issues = append(issues, "password must contain an uppercase letter")
	}
	if !hasLower {
		issues = append(issues, "password must contain a lowercase letter")
	}
	if !hasDigit {
		issues = append(issues, "password must contain a digit")
	}
	if !hasSpecial {
		issues = append(issues, "password must contain a special character")
	}
	return issues
}
