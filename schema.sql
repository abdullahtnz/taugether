-- ============================================================
-- taugether.org — PostgreSQL Database Schema
-- Run this file in order in your PostgreSQL database:
--   psql -U postgres -d taugether -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE role_type AS ENUM ('year', 'club');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture INT DEFAULT 0 CHECK (profile_picture >= 0 AND profile_picture <= 5),
    is_admin BOOLEAN DEFAULT FALSE,
    year_role_id INT,
    terms_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROLES (Discord-style: year roles + club roles)
-- ============================================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#DC2626',
    role_type role_type NOT NULL,
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users
    ADD CONSTRAINT fk_users_year_role
    FOREIGN KEY (year_role_id) REFERENCES roles(id) ON DELETE SET NULL;

-- ============================================================
-- CLUBS
-- ============================================================
CREATE TABLE clubs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    role_id INT REFERENCES roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER ROLES (only for club roles; year_role is on users table)
-- ============================================================
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POSTS (includes news via is_news flag)
-- ============================================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    is_news BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_tag_id ON posts(tag_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_is_news ON posts(is_news) WHERE is_news = TRUE;
CREATE INDEX idx_posts_not_news ON posts(is_news) WHERE is_news = FALSE;

-- Full-text search on posts
ALTER TABLE posts ADD COLUMN search_vector tsvector;
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);

CREATE OR REPLACE FUNCTION posts_search_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posts_search
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION posts_search_update();

-- ============================================================
-- POST IMAGES
-- ============================================================
CREATE TABLE post_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    size INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POST FILES
-- ============================================================
CREATE TABLE post_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMENTS (nested, max 4 levels: depth 0-3)
-- ============================================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    depth INT NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- ============================================================
-- POST LIKES
-- ============================================================
CREATE TABLE post_likes (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- ============================================================
-- POST REPORTS
-- ============================================================
CREATE TABLE post_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT DEFAULT '',
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE INDEX idx_post_reports_post_id ON post_reports(post_id);
CREATE INDEX idx_post_reports_resolved ON post_reports(is_resolved) WHERE is_resolved = FALSE;

-- ============================================================
-- BOOKMARKS (saved posts)
-- ============================================================
CREATE TABLE post_bookmarks (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('comment', 'reply')),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default tags
INSERT INTO tags (name) VALUES
    ('Exam'),
    ('Study'),
    ('University'),
    ('Question');

-- Year roles
INSERT INTO roles (name, color, role_type, position) VALUES
    ('Prep',     '#6B7280', 'year', 0),
    ('1st Year', '#3B82F6', 'year', 1),
    ('2nd Year', '#10B981', 'year', 2),
    ('3rd Year', '#F59E0B', 'year', 3),
    ('4th Year', '#8B5CF6', 'year', 4),
    ('Graduate', '#EF4444', 'year', 5);

-- ============================================================
-- USEFUL QUERIES
-- ============================================================

-- Make a user an admin (run from the server, replace <username>):
--   UPDATE users SET is_admin = TRUE WHERE username = '<username>';

-- Example clubs (uncomment to add sample clubs):
--   INSERT INTO clubs (name, description, role_id)
--   VALUES ('Football', 'For football lovers', (SELECT id FROM roles WHERE name = 'Football'));
-- (Clubs are normally created through the admin panel instead.)
