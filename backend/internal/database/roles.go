package database

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/taugether/taugether/internal/models"
)

func (db *DB) ListRoles(ctx context.Context, roleType string) ([]models.Role, error) {
	query := `SELECT id, name, color, role_type, position FROM roles`
	args := []any{}
	if roleType != "" {
		query += ` WHERE role_type = $1`
		args = append(args, roleType)
	}
	query += ` ORDER BY position, name`

	rows, err := db.Pool.Query(ctx, query, args...)
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

func (db *DB) GetRoleByID(ctx context.Context, id int) (*models.Role, error) {
	var r models.Role
	err := db.Pool.QueryRow(ctx, `
		SELECT id, name, color, role_type, position FROM roles WHERE id = $1`, id).
		Scan(&r.ID, &r.Name, &r.Color, &r.RoleType, &r.Position)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (db *DB) GetRoleByName(ctx context.Context, name string) (*models.Role, error) {
	var r models.Role
	err := db.Pool.QueryRow(ctx, `
		SELECT id, name, color, role_type, position FROM roles WHERE LOWER(name) = LOWER($1)`, name).
		Scan(&r.ID, &r.Name, &r.Color, &r.RoleType, &r.Position)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (db *DB) CreateRole(ctx context.Context, name, color, roleType string, position int) (*models.Role, error) {
	var r models.Role
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO roles (name, color, role_type, position)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, color, role_type, position`,
		name, color, roleType, position).
		Scan(&r.ID, &r.Name, &r.Color, &r.RoleType, &r.Position)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (db *DB) UpdateRole(ctx context.Context, id int, name, color string, position int) error {
	_, err := db.Pool.Exec(ctx, `
		UPDATE roles SET name = $1, color = $2, position = $3 WHERE id = $4`,
		name, color, position, id)
	return err
}

func (db *DB) DeleteRole(ctx context.Context, id int) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM roles WHERE id = $1`, id)
	return err
}

func (db *DB) IsRoleAssigned(ctx context.Context, roleID int) (bool, error) {
	var exists bool
	err := db.Pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM user_roles WHERE role_id = $1
			UNION ALL
			SELECT 1 FROM users WHERE year_role_id = $1
			UNION ALL
			SELECT 1 FROM clubs WHERE role_id = $1
		)`, roleID).Scan(&exists)
	return exists, err
}

// --- User role assignments ---

func (db *DB) AssignClubRole(ctx context.Context, userID string, roleID int) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, roleID)
	return err
}

func (db *DB) RemoveClubRole(ctx context.Context, userID string, roleID int) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`, userID, roleID)
	return err
}

func (db *DB) UserHasClubRole(ctx context.Context, userID string, roleID int) (bool, error) {
	var exists bool
	err := db.Pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2)`,
		userID, roleID).Scan(&exists)
	return exists, err
}
