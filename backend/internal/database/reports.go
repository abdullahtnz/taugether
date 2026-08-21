package database

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/taugether/taugether/internal/models"
)

func (db *DB) CreateReport(ctx context.Context, postID, userID, reason string) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO post_reports (post_id, user_id, reason)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING`,
		postID, userID, reason)
	return err
}

func (db *DB) HasReported(ctx context.Context, postID, userID string) (bool, error) {
	var exists bool
	err := db.Pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM post_reports WHERE post_id = $1 AND user_id = $2)`,
		postID, userID).Scan(&exists)
	return exists, err
}

type ReportRow struct {
	Report models.Report
}

// ListUnresolvedReports returns all unresolved reports with post + reporter info.
func (db *DB) ListUnresolvedReports(ctx context.Context) ([]models.Report, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT r.id, r.reason, r.is_resolved, r.created_at,
		       p.id, u.username, u.profile_picture, u.is_admin,
		       p.tag_id, t.name, p.title, p.content, p.is_news, p.is_edited,
		       p.like_count, p.comment_count, p.created_at, p.updated_at,
		       pu.username, pu.profile_picture, pu.is_admin
		FROM post_reports r
		JOIN posts p ON p.id = r.post_id
		JOIN tags t ON t.id = p.tag_id
		JOIN users u ON u.id = r.user_id
		JOIN users pu ON pu.id = p.user_id
		WHERE r.is_resolved = FALSE
		ORDER BY r.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reports := []models.Report{}
	for rows.Next() {
		var rep models.Report
		var p models.Post
		var tagID int
		err := rows.Scan(&rep.ID, &rep.Reason, &rep.IsResolved, &rep.CreatedAt,
			&rep.Reporter.ID, &rep.Reporter.Username, &rep.Reporter.ProfilePicture, &rep.Reporter.IsAdmin,
			&tagID, &p.Tag.Name, &p.Title, &p.Content, &p.IsNews, &p.IsEdited,
			&p.LikeCount, &p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
			&p.Author.Username, &p.Author.ProfilePicture, &p.Author.IsAdmin)
		if err != nil {
			return nil, err
		}
		p.TagID = tagID
		p.Tag.ID = tagID
		p.Images = []models.Image{}
		p.Files = []models.File{}
		rep.Post = p
		reports = append(reports, rep)
	}
	return reports, rows.Err()
}

func (db *DB) ResolveReport(ctx context.Context, reportID string) error {
	_, err := db.Pool.Exec(ctx, `UPDATE post_reports SET is_resolved = TRUE WHERE id = $1`, reportID)
	return err
}

func (db *DB) DeletePostAndReports(ctx context.Context, postID string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM posts WHERE id = $1`, postID)
	return err
}

func (db *DB) GetReportByID(ctx context.Context, reportID string) (*models.Report, error) {
	reports, err := db.ListUnresolvedReports(ctx)
	if err != nil {
		return nil, err
	}
	for i := range reports {
		if reports[i].ID == reportID {
			return &reports[i], nil
		}
	}
	return nil, nil
}

// -- Bookmarks --

func (db *DB) ToggleBookmark(ctx context.Context, postID, userID string) (bool, error) {
	var exists bool
	err := db.Pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM post_bookmarks WHERE post_id = $1 AND user_id = $2)`,
		postID, userID).Scan(&exists)
	if err != nil {
		return false, err
	}

	var saved bool
	if exists {
		_, err = db.Pool.Exec(ctx, `DELETE FROM post_bookmarks WHERE post_id = $1 AND user_id = $2`, postID, userID)
		saved = false
	} else {
		_, err = db.Pool.Exec(ctx, `
			INSERT INTO post_bookmarks (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			postID, userID)
		saved = true
	}
	return saved, err
}

func (db *DB) ListBookmarkedPosts(ctx context.Context, userID string, limit, offset int) ([]models.Post, error) {
	rows, err := db.Pool.Query(ctx, postSelect+`
		JOIN post_bookmarks pb ON pb.post_id = p.id
		WHERE pb.user_id = $2 AND p.is_news = FALSE
		ORDER BY pb.created_at DESC
		LIMIT $3 OFFSET $4`, orNil(userID), userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := []models.Post{}
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		posts = append(posts, *p)
	}
	return posts, rows.Err()
}

// -- Posts by user --

func (db *DB) ListPostsByUser(ctx context.Context, userID string, targetUserID string, limit, offset int) ([]models.Post, error) {
	rows, err := db.Pool.Query(ctx, postSelect+`
		WHERE p.user_id = $2 AND p.is_news = FALSE
		ORDER BY p.created_at DESC
		LIMIT $3 OFFSET $4`, orNil(userID), targetUserID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := []models.Post{}
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		posts = append(posts, *p)
	}
	return posts, rows.Err()
}

// -- Reports helpers --

func (db *DB) ErrNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}
