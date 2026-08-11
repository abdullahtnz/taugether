package models

import "time"

type Role struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Color    string `json:"color"`
	RoleType string `json:"role_type"`
	Position int    `json:"position"`
}

type Tag struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type UserBrief struct {
	ID             string `json:"id"`
	Username       string `json:"username"`
	ProfilePicture int    `json:"profile_picture"`
	IsAdmin        bool   `json:"is_admin"`
}

type User struct {
	ID             string    `json:"id"`
	Username       string    `json:"username"`
	Email          string    `json:"email,omitempty"`
	PasswordHash   string    `json:"-"`
	ProfilePicture int       `json:"profile_picture"`
	IsAdmin        bool      `json:"is_admin"`
	YearRoleID     *int      `json:"year_role_id"`
	YearRole       *Role     `json:"year_role,omitempty"`
	Roles          []Role    `json:"roles,omitempty"`
	PostCount      int       `json:"post_count"`
	CreatedAt      time.Time `json:"created_at"`
}

type Image struct {
	ID       string `json:"id"`
	FileName string `json:"file_name"`
	URL      string `json:"url"`
	Original string `json:"original_name"`
	Size     int64  `json:"size"`
}

type File struct {
	ID       string `json:"id"`
	FileName string `json:"file_name"`
	URL      string `json:"url"`
	Original string `json:"original_name"`
	Size     int64  `json:"size"`
}

type Post struct {
	ID           string    `json:"id"`
	Author       UserBrief `json:"author"`
	TagID        int       `json:"tag_id"`
	Tag          Tag       `json:"tag"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	IsNews       bool      `json:"is_news"`
	IsEdited     bool      `json:"is_edited"`
	LikeCount    int       `json:"like_count"`
	CommentCount int       `json:"comment_count"`
	IsLiked      bool      `json:"is_liked"`
	IsBookmarked bool      `json:"is_bookmarked"`
	Images       []Image   `json:"images"`
	Files        []File    `json:"files"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Comment struct {
	ID        string    `json:"id"`
	PostID    string    `json:"post_id"`
	Author    UserBrief `json:"author"`
	ParentID  *string   `json:"parent_id"`
	Content   string    `json:"content"`
	Depth     int       `json:"depth"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Replies   []Comment `json:"replies,omitempty"`
}

type Report struct {
	ID         string    `json:"id"`
	Post       Post      `json:"post"`
	Reporter   UserBrief `json:"reporter"`
	Reason     string    `json:"reason"`
	IsResolved bool      `json:"is_resolved"`
	CreatedAt  time.Time `json:"created_at"`
}

type Notification struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	PostID    *string   `json:"post_id"`
	CommentID *string   `json:"comment_id"`
	Actor     UserBrief `json:"actor"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
	PostTitle string    `json:"post_title,omitempty"`
}

type Club struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	RoleID      *int   `json:"role_id"`
	Role        *Role  `json:"role,omitempty"`
	MemberCount int    `json:"member_count"`
}

type Claims struct {
	UserID string `json:"uid"`
	Admin  bool   `json:"adm"`
}
