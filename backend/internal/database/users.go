package database

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/taugether/taugether/internal/models"
)

const userBaseQuery = `
	SELECT u.id, u.username, u.email, u.password_hash, u.profile_picture,
	       u.is_admin, u.year_role_id, u.created_at
	FROM users u`

func scanUser(row pgx.Row) (*models.User, error) {
	var u models.User
	var yearRoleID *int
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash,
		&u.ProfilePicture, &u.IsAdmin, &yearRoleID, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.YearRoleID = yearRoleID
	return &u, nil
}

func (db *DB) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	row := db.Pool.QueryRow(ctx, userBaseQuery+` WHERE u.id = $1`, id)
	return scanUser(row)
}

func (db *DB) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	row := db.Pool.QueryRow(ctx, userBaseQuery+` WHERE u.username = $1`, username)
	return scanUser(row)
}

func (db *DB) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	row := db.Pool.QueryRow(ctx, userBaseQuery+` WHERE LOWER(u.email) = LOWER($1)`, email)
	return scanUser(row)
}

func (db *DB) CreateUser(ctx context.Context, username, email, passwordHash string, profilePicture int, yearRoleID *int) (*models.User, error) {
	row := db.Pool.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, profile_picture, year_role_id, terms_accepted_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING id, username, email, password_hash, profile_picture, is_admin, year_role_id, created_at`,
		username, email, passwordHash, profilePicture, yearRoleID)
	return scanUser(row)
}

func (db *DB) UpdateUsername(ctx context.Context, userID, username string) error {
	_, err := db.Pool.Exec(ctx, `UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2`, username, userID)
	return err
}

func (db *DB) UpdateProfilePicture(ctx context.Context, userID string, profilePicture int) error {
	_, err := db.Pool.Exec(ctx, `UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2`, profilePicture, userID)
	return err
}

func (db *DB) UpdateYearRole(ctx context.Context, userID string, yearRoleID *int) error {
	_, err := db.Pool.Exec(ctx, `UPDATE users SET year_role_id = $1, updated_at = NOW() WHERE id = $2`, yearRoleID, userID)
	return err
}

func (db *DB) UpdatePassword(ctx context.Context, userID, newHash string) error {
	_, err := db.Pool.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, newHash, userID)
	return err
}

func (db *DB) GetRolesForUser(ctx context.Context, userID string) ([]models.Role, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT r.id, r.name, r.color, r.role_type, r.position
		FROM roles r
		JOIN user_roles ur ON ur.role_id = r.id
		WHERE ur.user_id = $1
		ORDER BY r.position, r.name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	roles := []models.Role{}
	for rows.Next() {
		var r models.Role
		if err := rows.Scan(&r.ID, &r.Name, &r.Color, &r.RoleType, &r.Position); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, rows.Err()
}

func (db *DB) GetYearRole(ctx context.Context, roleID *int) (*models.Role, error) {
	if roleID == nil {
		return nil, nil
	}
	var r models.Role
	err := db.Pool.QueryRow(ctx, `
		SELECT id, name, color, role_type, position FROM roles WHERE id = $1 AND role_type = 'year'`,
		*roleID).Scan(&r.ID, &r.Name, &r.Color, &r.RoleType, &r.Position)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (db *DB) LoadProfile(ctx context.Context, u *models.User) error {
	yearRole, err := db.GetYearRole(ctx, u.YearRoleID)
	if err != nil {
		return err
	}
	u.YearRole = yearRole

	roles, err := db.GetRolesForUser(ctx, u.ID)
	if err != nil {
		return err
	}
	u.Roles = roles

	var postCount int
	if err := db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_news = FALSE`, u.ID).Scan(&postCount); err != nil {
		return err
	}
	u.PostCount = postCount
	return nil
}

func (db *DB) LoadProfileForPublic(ctx context.Context, u *models.User) {
	yearRole, err := db.GetYearRole(ctx, u.YearRoleID)
	if err == nil {
		u.YearRole = yearRole
	}
	roles, err := db.GetRolesForUser(ctx, u.ID)
	if err == nil {
		u.Roles = roles
	}
	var postCount int
	if err := db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_news = FALSE`, u.ID).Scan(&postCount); err == nil {
		u.PostCount = postCount
	}
}
