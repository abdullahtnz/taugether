package database

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/taugether/taugether/internal/models"
)

const postSelect = `
	SELECT p.id, p.user_id, u.username, u.profile_picture, u.is_admin,
	       p.tag_id, t.name, p.title, p.content, p.is_news, p.is_edited,
	       p.like_count, p.comment_count, p.created_at, p.updated_at,
	       EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS is_liked,
	       EXISTS(SELECT 1 FROM post_bookmarks pb WHERE pb.post_id = p.id AND pb.user_id = $1) AS is_bookmarked
	FROM posts p
	JOIN users u ON u.id = p.user_id
	JOIN tags t ON t.id = p.tag_id`

func scanPost(row pgx.Row) (*models.Post, error) {
	var p models.Post
	err := row.Scan(
		&p.ID, &p.Author.ID, &p.Author.Username, &p.Author.ProfilePicture, &p.Author.IsAdmin,
		&p.TagID, &p.Tag.Name, &p.Title, &p.Content, &p.IsNews, &p.IsEdited,
		&p.LikeCount, &p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
		&p.IsLiked, &p.IsBookmarked,
	)
	if err != nil {
		return nil, err
	}
	p.Tag.ID = p.TagID
	p.Images = []models.Image{}
	p.Files = []models.File{}
	return &p, nil
}

type PostFilters struct {
	UserID string
	News   bool
	TagID  *int
	Query  string
	Limit  int
	Offset int
}

// orNil converts an empty userID to a NULL parameter to avoid UUID cast errors
// when the request is unauthenticated.
func orNil(userID string) any {
	if userID == "" {
		return nil
	}
	return userID
}

func (db *DB) ListPosts(ctx context.Context, f PostFilters) ([]models.Post, error) {
	query := postSelect + `
		WHERE p.is_news = $2`
	args := []any{orNil(f.UserID), f.News}
	argIdx := 3

	if f.TagID != nil {
		query += ` AND p.tag_id = $` + itoa(argIdx)
		args = append(args, *f.TagID)
		argIdx++
	}
	if f.Query != "" {
		query += ` AND p.search_vector @@ plainto_tsquery('english', $` + itoa(argIdx) + `)`
		args = append(args, f.Query)
		argIdx++
	}

	query += ` ORDER BY p.created_at DESC LIMIT $` + itoa(argIdx) + ` OFFSET $` + itoa(argIdx+1)
	args = append(args, f.Limit, f.Offset)

	rows, err := db.Pool.Query(ctx, query, args...)
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
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return posts, nil
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

func (db *DB) GetPostByID(ctx context.Context, userID, postID string) (*models.Post, error) {
	row := db.Pool.QueryRow(ctx, postSelect+` WHERE p.id = $2`, orNil(userID), postID)
	p, err := scanPost(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	images, err := db.GetPostImages(ctx, postID)
	if err != nil {
		return nil, err
	}
	files, err := db.GetPostFiles(ctx, postID)
	if err != nil {
		return nil, err
	}
	p.Images = images
	p.Files = files
	return p, nil
}

func (db *DB) GetPostAuthor(ctx context.Context, postID string) (string, error) {
	var userID string
	err := db.Pool.QueryRow(ctx, `SELECT user_id FROM posts WHERE id = $1`, postID).Scan(&userID)
	return userID, err
}

func (db *DB) CreatePost(ctx context.Context, userID string, tagID int, title, content string, isNews bool) (string, error) {
	var id string
	err := db.Pool.QueryRow(ctx, `
		INSERT INTO posts (user_id, tag_id, title, content, is_news)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`,
		userID, tagID, title, content, isNews).Scan(&id)
	return id, err
}

func (db *DB) UpdatePost(ctx context.Context, postID string, tagID int, title, content string) error {
	_, err := db.Pool.Exec(ctx, `
		UPDATE posts SET tag_id = $1, title = $2, content = $3, is_edited = TRUE, updated_at = NOW()
		WHERE id = $4`,
		tagID, title, content, postID)
	return err
}

func (db *DB) DeletePost(ctx context.Context, postID string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM posts WHERE id = $1`, postID)
	return err
}

func (db *DB) GetPostImages(ctx context.Context, postID string) ([]models.Image, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, file_name, original_name, size FROM post_images WHERE post_id = $1 ORDER BY created_at`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	images := []models.Image{}
	for rows.Next() {
		var im models.Image
		if err := rows.Scan(&im.ID, &im.FileName, &im.Original, &im.Size); err != nil {
			return nil, err
		}
		im.URL = "/uploads/" + im.FileName
		images = append(images, im)
	}
	return images, rows.Err()
}

func (db *DB) GetPostFiles(ctx context.Context, postID string) ([]models.File, error) {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, file_name, original_name, size FROM post_files WHERE post_id = $1 ORDER BY created_at`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	files := []models.File{}
	for rows.Next() {
		var fl models.File
		if err := rows.Scan(&fl.ID, &fl.FileName, &fl.Original, &fl.Size); err != nil {
			return nil, err
		}
		fl.URL = "/uploads/" + fl.FileName
		files = append(files, fl)
	}
	return files, rows.Err()
}

func (db *DB) AddPostImage(ctx context.Context, postID, fileName, originalName string, size int64) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO post_images (post_id, file_name, original_name, size) VALUES ($1, $2, $3, $4)`,
		postID, fileName, originalName, size)
	return err
}

func (db *DB) AddPostFile(ctx context.Context, postID, fileName, originalName string, size int64) error {
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO post_files (post_id, file_name, original_name, size) VALUES ($1, $2, $3, $4)`,
		postID, fileName, originalName, size)
	return err
}

func (db *DB) AddImagesToPost(ctx context.Context, postID string, images []models.Image) error {
	for _, im := range images {
		if err := db.AddPostImage(ctx, postID, im.FileName, im.Original, im.Size); err != nil {
			return err
		}
	}
	return nil
}

func (db *DB) AddFilesToPost(ctx context.Context, postID string, files []models.File) error {
	for _, fl := range files {
		if err := db.AddPostFile(ctx, postID, fl.FileName, fl.Original, fl.Size); err != nil {
			return err
		}
	}
	return nil
}

func (db *DB) ToggleLike(ctx context.Context, postID, userID string) (bool, error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	var exists bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2)`, postID, userID).Scan(&exists)
	if err != nil {
		return false, err
	}

	var liked bool
	if exists {
		_, err = tx.Exec(ctx, `DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, postID, userID)
		_, err2 := tx.Exec(ctx, `UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, postID)
		liked = false
		if err != nil {
			return false, err
		}
		if err2 != nil {
			return false, err2
		}
	} else {
		_, err = tx.Exec(ctx, `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, postID, userID)
		_, err2 := tx.Exec(ctx, `UPDATE posts SET like_count = like_count + 1 WHERE id = $1`, postID)
		liked = true
		if err != nil {
			return false, err
		}
		if err2 != nil {
			return false, err2
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return liked, nil
}

func (db *DB) IsPostLiked(ctx context.Context, postID, userID string) (bool, error) {
	var exists bool
	err := db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2)`, postID, userID).Scan(&exists)
	return exists, err
}
