package database

import (
	"testing"
	"time"

	"github.com/taugether/taugether/internal/models"
)

func ptr(s string) *string { return &s }

func TestBuildCommentTreeEmptyReturnsEmptySlice(t *testing.T) {
	tree := BuildCommentTree(nil)
	if tree == nil {
		t.Fatal("expected non-nil empty slice, got nil")
	}
	if len(tree) != 0 {
		t.Fatalf("expected 0 comments, got %d", len(tree))
	}
}

func TestBuildCommentTree(t *testing.T) {
	now := time.Now()
	flat := []models.Comment{
		{ID: "a", PostID: "p", Content: "A", Depth: 0, CreatedAt: now},
		{ID: "b", PostID: "p", ParentID: ptr("a"), Content: "B", Depth: 1, CreatedAt: now},
		{ID: "c", PostID: "p", ParentID: ptr("b"), Content: "C", Depth: 2, CreatedAt: now},
		{ID: "d", PostID: "p", ParentID: ptr("a"), Content: "D", Depth: 1, CreatedAt: now},
		{ID: "e", PostID: "p", Content: "E", Depth: 0, CreatedAt: now},
	}

	tree := BuildCommentTree(flat)

	if len(tree) != 2 {
		t.Fatalf("expected 2 root comments, got %d", len(tree))
	}
	if tree[0].ID != "a" {
		t.Fatalf("expected root a, got %s", tree[0].ID)
	}
	if len(tree[0].Replies) != 2 {
		t.Fatalf("expected 2 replies to a, got %d", len(tree[0].Replies))
	}
	// find b
	var b *models.Comment
	for i := range tree[0].Replies {
		if tree[0].Replies[i].ID == "b" {
			b = &tree[0].Replies[i]
		}
	}
	if b == nil {
		t.Fatal("expected reply b")
	}
	if len(b.Replies) != 1 || b.Replies[0].ID != "c" {
		t.Fatalf("expected c nested under b, got %d replies", len(b.Replies))
	}
	if tree[1].ID != "e" {
		t.Fatalf("expected second root e, got %s", tree[1].ID)
	}
}
