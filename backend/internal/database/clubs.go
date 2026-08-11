package database

import (
	"context"

	"github.com/taugether/taugether/internal/models"
)

func (db *DB) ListClubs(ctx context.Context) ([]models.Club, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT c.id, c.name, c.description, c.role_id,
		       r.name, r.color, r.role_type, r.position,
		       (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = c.role_id) AS member_count
		FROM clubs c
		LEFT JOIN roles r ON r.id = c.role_id
		ORDER BY c.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	clubs := []models.Club{}
	for rows.Next() {
		var cl models.Club
		var r models.Role
		var roleName, roleColor, roleType *string
		var rolePosition *int
		if err := rows.Scan(&cl.ID, &cl.Name, &cl.Description, &cl.RoleID,
			&roleName, &roleColor, &roleType, &rolePosition, &cl.MemberCount); err != nil {
			return nil, err
		}
		if roleName != nil {
			r.Name = *roleName
			r.Color = *roleColor
			r.RoleType = *roleType
			r.Position = *rolePosition
			if cl.RoleID != nil {
				r.ID = *cl.RoleID
			}
			cl.Role = &r
		}
		clubs = append(clubs, cl)
	}
	return clubs, rows.Err()
}

func (db *DB) GetClubByID(ctx context.Context, id int) (*models.Club, error) {
	clubs, err := db.ListClubs(ctx)
	if err != nil {
		return nil, err
	}
	for i := range clubs {
		if clubs[i].ID == id {
			return &clubs[i], nil
		}
	}
	return nil, nil
}

func (db *DB) GetClubByName(ctx context.Context, name string) (*models.Club, error) {
	clubs, err := db.ListClubs(ctx)
	if err != nil {
		return nil, err
	}
	for i := range clubs {
		if equalFold(clubs[i].Name, name) {
			return &clubs[i], nil
		}
	}
	return nil, nil
}

func equalFold(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := 0; i < len(a); i++ {
		ca, cb := a[i], b[i]
		if 'A' <= ca && ca <= 'Z' {
			ca += 32
		}
		if 'A' <= cb && cb <= 'Z' {
			cb += 32
		}
		if ca != cb {
			return false
		}
	}
	return true
}

// CreateClub creates a club and its associated club role in a transaction.
func (db *DB) CreateClub(ctx context.Context, name, description, color string) (*models.Club, error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var roleID int
	err = tx.QueryRow(ctx, `
		INSERT INTO roles (name, color, role_type)
		VALUES ($1, $2, 'club')
		RETURNING id`, name, color).Scan(&roleID)
	if err != nil {
		return nil, err
	}

	var clubID int
	err = tx.QueryRow(ctx, `
		INSERT INTO clubs (name, description, role_id)
		VALUES ($1, $2, $3)
		RETURNING id`, name, description, roleID).Scan(&clubID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return db.GetClubByID(ctx, clubID)
}

// UpdateClub updates club name/description and synchronizes its role name/color.
func (db *DB) UpdateClub(ctx context.Context, id int, name, description, color string) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		UPDATE clubs SET name = $1, description = $2 WHERE id = $3`, name, description, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `
		UPDATE roles SET name = $1, color = $2 WHERE id = (SELECT role_id FROM clubs WHERE id = $3)`,
		name, color, id)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// DeleteClub deletes the club and its associated role.
func (db *DB) DeleteClub(ctx context.Context, id int) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var roleID *int
	err = tx.QueryRow(ctx, `SELECT role_id FROM clubs WHERE id = $1`, id).Scan(&roleID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `DELETE FROM clubs WHERE id = $1`, id)
	if err != nil {
		return err
	}

	if roleID != nil {
		_, err = tx.Exec(ctx, `DELETE FROM roles WHERE id = $1`, *roleID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (db *DB) ListClubMembers(ctx context.Context, roleID int) ([]models.UserBrief, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT u.id, u.username, u.profile_picture, u.is_admin
		FROM user_roles ur
		JOIN users u ON u.id = ur.user_id
		WHERE ur.role_id = $1
		ORDER BY ur.created_at DESC`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []models.UserBrief{}
	for rows.Next() {
		var m models.UserBrief
		if err := rows.Scan(&m.ID, &m.Username, &m.ProfilePicture, &m.IsAdmin); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

func (db *DB) GetUserClubs(ctx context.Context, userID string) ([]models.Club, error) {
	all, err := db.ListClubs(ctx)
	if err != nil {
		return nil, err
	}
	roleIDs, err := db.GetRolesForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	member := map[int]bool{}
	for _, r := range roleIDs {
		member[r.ID] = true
	}
	var clubs []models.Club
	for _, cl := range all {
		if cl.RoleID != nil && member[*cl.RoleID] {
			clubs = append(clubs, cl)
		}
	}
	return clubs, nil
}
