package database

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/taugether/taugether/internal/models"
)

const commentSelect = `
	SELECT c.id, c.post_id, c.user_id, u.username, u.profile_picture, u.is_admin,
	       c.parent_id, c.content, c.depth, c.created_at, c.updated_at
	FROM comments c
	JOIN users u ON u.id = c.user_id`

func scanComment(row pgx.Row) (*models.Comment, error) {
	var c models.Comment
	var parentID *string
	err := row.Scan(&c.ID, &c.PostID, &c.Author.ID, &c.Author.Username, &c.Author.ProfilePicture,
		&c.Author.IsAdmin, &parentID, &c.Content, &c.Depth, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.ParentID = parentID
	return &c, nil
}

// GetCommentsForPost returns all comments for a post as a nested tree (max depth 4).
func (db *DB) GetCommentsForPost(ctx context.Context, postID string) ([]models.Comment, error) {
	rows, err := db.Pool.Query(ctx, commentSelect+` WHERE c.post_id = $1 ORDER BY c.created_at ASC`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	flat := []models.Comment{}
	for rows.Next() {
		c, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		flat = append(flat, *c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return BuildCommentTree(flat), nil
}

// BuildCommentTree constructs the nested structure from a flat ordered list.
func BuildCommentTree(flat []models.Comment) []models.Comment {
	if len(flat) == 0 {
		return nil
	}
	byID := map[string]*models.Comment{}
	for i := range flat {
		byID[flat[i].ID] = &flat[i]
	}

	children := map[string][]*models.Comment{}
	var roots []*models.Comment
	for i := range flat {
		c := &flat[i]
		if c.ParentID != nil {
			if _, ok := byID[*c.ParentID]; ok {
				children[*c.ParentID] = append(children[*c.ParentID], c)
				continue
			}
		}
		roots = append(roots, c)
	}

	var build func(c *models.Comment) models.Comment
	build = func(c *models.Comment) models.Comment {
		result := *c
		result.Replies = nil
		for _, child := range children[c.ID] {
			result.Replies = append(result.Replies, build(child))
		}
		return result
	}

	out := make([]models.Comment, 0, len(roots))
	for _, r := range roots {
		out = append(out, build(r))
	}
	return out
}

func (db *DB) CreateComment(ctx context.Context, postID, userID string, parentID *string, content string, depth int) (*models.Comment, error) {
	var id string
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO comments (post_id, user_id, parent_id, content, depth)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`,
		postID, userID, parentID, content, depth).Scan(&id)
	if err != nil {
		return nil, err
	}
	return db.GetCommentByID(ctx, id)
}

func (db *DB) GetCommentByID(ctx context.Context, commentID string) (*models.Comment, error) {
	row := db.Pool.QueryRow(ctx, commentSelect+` WHERE c.id = $1`, commentID)
	return scanComment(row)
}

func (db *DB) GetCommentOwner(ctx context.Context, commentID string) (string, error) {
	var userID string
	err := db.Pool.QueryRow(ctx, `SELECT user_id FROM comments WHERE id = $1`, commentID).Scan(&userID)
	return userID, err
}

func (db *DB) GetCommentPostAndOwner(ctx context.Context, commentID string) (postID, userID string, depth int, err error) {
	err = db.Pool.QueryRow(ctx, `SELECT post_id, user_id, depth FROM comments WHERE id = $1`, commentID).
		Scan(&postID, &userID, &depth)
	return
}

func (db *DB) DeleteComment(ctx context.Context, commentID string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM comments WHERE id = $1`, commentID)
	return err
}

func (db *DB) IncrementCommentCount(ctx context.Context, postID string) error {
	_, err := db.Pool.Exec(ctx, `UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`, postID)
	return err
}

func (db *DB) UpdateCommentCount(ctx context.Context, postID string) error {
	_, err := db.Pool.Exec(ctx, `
		UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = $1) WHERE id = $1`, postID)
	return err
}

func (db *DB) ParentCommentDepth(ctx context.Context, parentID string) (int, error) {
	var depth int
	err := db.Pool.QueryRow(ctx, `SELECT depth FROM comments WHERE id = $1`, parentID).Scan(&depth)
	return depth, err
}

// CreateNotification inserts a notification and records who liked (for like notif).
func (db *DB) CreateNotification(ctx context.Context, userID, notifType string, postID, commentID *string, actorID string) error {
	if userID == actorID {
		return nil
	}
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO notifications (user_id, type, post_id, comment_id, actor_id)
		VALUES ($1, $2, $3, $4, $5)`,
		userID, notifType, postID, commentID, actorID)
	return err
}

func (db *DB) ListNotifications(ctx context.Context, userID string, limit, offset int) ([]models.Notification, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT n.id, n.type, n.post_id, n.comment_id, n.actor_id, u.username, u.profile_picture, u.is_admin,
		       n.is_read, n.created_at, COALESCE(p.title, '')
		FROM notifications n
		JOIN users u ON u.id = n.actor_id
		LEFT JOIN posts p ON p.id = n.post_id
		WHERE n.user_id = $1
		ORDER BY n.created_at DESC
		LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifs := []models.Notification{}
	for rows.Next() {
		var n models.Notification
		if err := rows.Scan(&n.ID, &n.Type, &n.PostID, &n.CommentID, &n.Actor.ID, &n.Actor.Username,
			&n.Actor.ProfilePicture, &n.Actor.IsAdmin, &n.IsRead, &n.CreatedAt, &n.PostTitle); err != nil {
			return nil, err
		}
		notifs = append(notifs, n)
	}
	return notifs, rows.Err()
}

func (db *DB) CountUnreadNotifications(ctx context.Context, userID string) (int, error) {
	var count int
	err := db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`, userID).Scan(&count)
	return count, err
}

func (db *DB) MarkNotificationsRead(ctx context.Context, userID string) error {
	_, err := db.Pool.Exec(ctx, `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, userID)
	return err
}

func (db *DB) SaveRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt)
	return err
}

func (db *DB) FindRefreshToken(ctx context.Context, tokenHash string) (string, error) {
	var userID string
	var expiresAt time.Time
	err := db.Pool.QueryRow(ctx, `
		SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`, tokenHash).
		Scan(&userID, &expiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	if time.Now().After(expiresAt) {
		return "", nil
	}
	return userID, nil
}

func (db *DB) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE token_hash = $1`, tokenHash)
	return err
}

func (db *DB) RevokeAllUserTokens(ctx context.Context, userID string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE user_id = $1`, userID)
	return err
}
