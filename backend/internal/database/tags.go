package database

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/taugether/taugether/internal/models"
)

func (db *DB) ListTags(ctx context.Context) ([]models.Tag, error) {
	rows, err := db.Pool.Query(ctx, `SELECT id, name FROM tags ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := []models.Tag{}
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.Name); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

func (db *DB) GetTagByID(ctx context.Context, id int) (*models.Tag, error) {
	var t models.Tag
	err := db.Pool.QueryRow(ctx, `SELECT id, name FROM tags WHERE id = $1`, id).
		Scan(&t.ID, &t.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (db *DB) GetTagByName(ctx context.Context, name string) (*models.Tag, error) {
	var t models.Tag
	err := db.Pool.QueryRow(ctx, `SELECT id, name FROM tags WHERE LOWER(name) = LOWER($1)`, name).
		Scan(&t.ID, &t.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (db *DB) CreateTag(ctx context.Context, name string) (*models.Tag, error) {
	var t models.Tag
	err := db.Pool.QueryRow(ctx, `INSERT INTO tags (name) VALUES ($1) RETURNING id, name`, name).
		Scan(&t.ID, &t.Name)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (db *DB) RenameTag(ctx context.Context, id int, name string) error {
	_, err := db.Pool.Exec(ctx, `UPDATE tags SET name = $1 WHERE id = $2`, name, id)
	return err
}

func (db *DB) DeleteTag(ctx context.Context, id int) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM tags WHERE id = $1`, id)
	return err
}

func (db *DB) CountPostsWithTag(ctx context.Context, tagID int) (int, error) {
	var count int
	err := db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM posts WHERE tag_id = $1`, tagID).Scan(&count)
	return count, err
}
