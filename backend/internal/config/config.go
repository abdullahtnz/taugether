package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port              string
	DatabaseURL       string
	JWTSecret         string
	JWTRefreshSecret  string
	AccessTokenExpiry time.Duration
	RefreshTokenExp   time.Duration
	UploadDir         string
	CORSOrigin        string
	MaxImageSize      int64
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:             getEnv("PORT", "8080"),
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		JWTSecret:        getEnv("JWT_SECRET", ""),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", ""),
		UploadDir:        getEnv("UPLOAD_DIR", "./uploads"),
		CORSOrigin:       getEnv("CORS_ORIGIN", "http://localhost:5173"),
		MaxImageSize:     2 * 1024 * 1024, // 2MB
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required in .env")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required in .env")
	}
	if cfg.JWTRefreshSecret == "" {
		return nil, fmt.Errorf("JWT_REFRESH_SECRET is required in .env")
	}

	accessMin, err := strconv.Atoi(getEnv("JWT_ACCESS_EXPIRY_MIN", "15"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_ACCESS_EXPIRY_MIN: %w", err)
	}
	cfg.AccessTokenExpiry = time.Duration(accessMin) * time.Minute

	refreshDays, err := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRY_DAYS", "7"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_REFRESH_EXPIRY_DAYS: %w", err)
	}
	cfg.RefreshTokenExp = time.Duration(refreshDays) * 24 * time.Hour

	return cfg, nil
}
