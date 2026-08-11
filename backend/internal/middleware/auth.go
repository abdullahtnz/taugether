package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/taugether/taugether/internal/config"
)

type contextKey string

const (
	UserIDKey contextKey = "user_id"
	AdminKey  contextKey = "is_admin"
)

func Auth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || !strings.HasPrefix(header, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "missing authorization token")
				return
			}
			tokenStr := strings.TrimPrefix(header, "Bearer ")

			claims := jwt.MapClaims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				writeError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}

			userID, _ := claims["uid"].(string)
			if userID == "" {
				writeError(w, http.StatusUnauthorized, "invalid token claims")
				return
			}
			isAdmin, _ := claims["adm"].(bool)

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, AdminKey, isAdmin)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth runs for public endpoints; sets user context when token present.
func OptionalAuth(secret string, cfg *config.Config) func(http.Handler) http.Handler {
	_ = cfg
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header != "" && strings.HasPrefix(header, "Bearer ") {
				tokenStr := strings.TrimPrefix(header, "Bearer ")
				claims := jwt.MapClaims{}
				token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
					if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
						return nil, jwt.ErrSignatureInvalid
					}
					return []byte(secret), nil
				})
				if err == nil && token.Valid {
					if userID, _ := claims["uid"].(string); userID != "" {
						ctx := context.WithValue(r.Context(), UserIDKey, userID)
						ctx = context.WithValue(ctx, AdminKey, claims["adm"])
						next.ServeHTTP(w, r.WithContext(ctx))
						return
					}
				}
			}
			ctx := context.WithValue(r.Context(), UserIDKey, "")
			ctx = context.WithValue(ctx, AdminKey, false)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		isAdmin, _ := r.Context().Value(AdminKey).(bool)
		if !isAdmin {
			writeError(w, http.StatusForbidden, "admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func UserIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(UserIDKey).(string)
	return id
}

func IsAdminFrom(ctx context.Context) bool {
	isAdmin, _ := ctx.Value(AdminKey).(bool)
	return isAdmin
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(`{"error":"` + escapeJSON(msg) + `"}`))
}

func escapeJSON(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`, "\r", `\r`, "\t", `\t`)
	return r.Replace(s)
}
