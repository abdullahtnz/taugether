package handler

import (
	"net/http"
)

func (a *App) HandleListTags(w http.ResponseWriter, r *http.Request) {
	tags, err := a.DB.ListTags(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, tags)
}

func (a *App) HandleAdminCreateTag(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Name = trimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 50 {
		writeErr(w, http.StatusBadRequest, "tag name must be 1-50 characters")
		return
	}
	if existing, _ := a.DB.GetTagByName(r.Context(), req.Name); existing != nil {
		writeErr(w, http.StatusConflict, "tag already exists")
		return
	}
	tag, err := a.DB.CreateTag(r.Context(), req.Name)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusCreated, tag)
}

func (a *App) HandleAdminRenameTag(w http.ResponseWriter, r *http.Request) {
	tagID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid tag id")
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Name = trimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 50 {
		writeErr(w, http.StatusBadRequest, "tag name must be 1-50 characters")
		return
	}
	if existing, _ := a.DB.GetTagByName(r.Context(), req.Name); existing != nil && existing.ID != tagID {
		writeErr(w, http.StatusConflict, "tag already exists")
		return
	}
	if err := a.DB.RenameTag(r.Context(), tagID, req.Name); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "tag updated"})
}

func (a *App) HandleAdminDeleteTag(w http.ResponseWriter, r *http.Request) {
	tagID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid tag id")
		return
	}
	count, err := a.DB.CountPostsWithTag(r.Context(), tagID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if count > 0 {
		writeErr(w, http.StatusConflict, "tag is in use by "+itoa(count)+" posts and cannot be deleted")
		return
	}
	if err := a.DB.DeleteTag(r.Context(), tagID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "tag deleted"})
}

func (a *App) HandleListRoles(w http.ResponseWriter, r *http.Request) {
	roleType := r.URL.Query().Get("type")
	if roleType != "" && roleType != "year" && roleType != "club" {
		writeErr(w, http.StatusBadRequest, "invalid role type")
		return
	}
	roles, err := a.DB.ListRoles(r.Context(), roleType)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, roles)
}

func (a *App) HandleAdminCreateRole(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Color    string `json:"color"`
		RoleType string `json:"role_type"`
		Position int    `json:"position"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Name = trimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 100 {
		writeErr(w, http.StatusBadRequest, "role name must be 1-100 characters")
		return
	}
	if req.RoleType != "year" && req.RoleType != "club" {
		writeErr(w, http.StatusBadRequest, "role type must be 'year' or 'club'")
		return
	}
	if !isValidHexColor(req.Color) {
		writeErr(w, http.StatusBadRequest, "invalid color, use hex format like #DC2626")
		return
	}
	if existing, _ := a.DB.GetRoleByName(r.Context(), req.Name); existing != nil {
		writeErr(w, http.StatusConflict, "role name already exists")
		return
	}
	role, err := a.DB.CreateRole(r.Context(), req.Name, req.Color, req.RoleType, req.Position)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusCreated, role)
}

func (a *App) HandleAdminUpdateRole(w http.ResponseWriter, r *http.Request) {
	roleID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid role id")
		return
	}
	var req struct {
		Name     string `json:"name"`
		Color    string `json:"color"`
		Position int    `json:"position"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Name = trimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 100 {
		writeErr(w, http.StatusBadRequest, "role name must be 1-100 characters")
		return
	}
	if !isValidHexColor(req.Color) {
		writeErr(w, http.StatusBadRequest, "invalid color, use hex format like #DC2626")
		return
	}
	if existing, _ := a.DB.GetRoleByName(r.Context(), req.Name); existing != nil && existing.ID != roleID {
		writeErr(w, http.StatusConflict, "role name already exists")
		return
	}
	if err := a.DB.UpdateRole(r.Context(), roleID, req.Name, req.Color, req.Position); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "role updated"})
}

func (a *App) HandleAdminDeleteRole(w http.ResponseWriter, r *http.Request) {
	roleID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid role id")
		return
	}
	assigned, err := a.DB.IsRoleAssigned(r.Context(), roleID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	if assigned {
		writeErr(w, http.StatusConflict, "role is assigned to users or clubs and cannot be deleted")
		return
	}
	if err := a.DB.DeleteRole(r.Context(), roleID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "role deleted"})
}

func (a *App) HandleListClubs(w http.ResponseWriter, r *http.Request) {
	clubs, err := a.DB.ListClubs(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, clubs)
}

func (a *App) HandleGetClub(w http.ResponseWriter, r *http.Request) {
	clubID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid club id")
		return
	}
	club, err := a.DB.GetClubByID(r.Context(), clubID)
	if err != nil || club == nil {
		writeErr(w, http.StatusNotFound, "club not found")
		return
	}
	writeJSON(w, http.StatusOK, club)
}

func (a *App) HandleClubMembers(w http.ResponseWriter, r *http.Request) {
	clubID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid club id")
		return
	}
	club, err := a.DB.GetClubByID(r.Context(), clubID)
	if err != nil || club == nil {
		writeErr(w, http.StatusNotFound, "club not found")
		return
	}
	if club.RoleID == nil {
		writeJSON(w, http.StatusOK, []any{})
		return
	}
	members, err := a.DB.ListClubMembers(r.Context(), *club.RoleID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, members)
}

func (a *App) HandleAdminCreateClub(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Name = trimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 100 {
		writeErr(w, http.StatusBadRequest, "club name must be 1-100 characters")
		return
	}
	if !isValidHexColor(req.Color) {
		req.Color = "#DC2626"
	}
	if existing, _ := a.DB.GetClubByName(r.Context(), req.Name); existing != nil {
		writeErr(w, http.StatusConflict, "club already exists")
		return
	}
	club, err := a.DB.CreateClub(r.Context(), req.Name, req.Description, req.Color)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusCreated, club)
}

func (a *App) HandleAdminUpdateClub(w http.ResponseWriter, r *http.Request) {
	clubID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid club id")
		return
	}
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Name = trimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 100 {
		writeErr(w, http.StatusBadRequest, "club name must be 1-100 characters")
		return
	}
	if !isValidHexColor(req.Color) {
		req.Color = "#DC2626"
	}
	if existing, _ := a.DB.GetClubByName(r.Context(), req.Name); existing != nil && existing.ID != clubID {
		writeErr(w, http.StatusConflict, "club already exists")
		return
	}
	if err := a.DB.UpdateClub(r.Context(), clubID, req.Name, req.Description, req.Color); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "club updated"})
}

func (a *App) HandleAdminDeleteClub(w http.ResponseWriter, r *http.Request) {
	clubID, ok := parseIDParam(r, "id")
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid club id")
		return
	}
	if err := a.DB.DeleteClub(r.Context(), clubID); err != nil {
		writeErr(w, http.StatusInternalServerError, "database error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "club deleted"})
}

func isValidHexColor(s string) bool {
	if len(s) != 7 || s[0] != '#' {
		return false
	}
	for i := 1; i < 7; i++ {
		c := s[i]
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
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
