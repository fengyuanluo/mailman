package api

import (
	"encoding/json"
	"mailman/internal/models"
	"mailman/internal/services"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

// SessionHandler 处理用户会话相关的请求
type SessionHandler struct {
	authService *services.AuthService
}

// NewSessionHandler 创建一个新的会话处理器
func NewSessionHandler(authService *services.AuthService) *SessionHandler {
	return &SessionHandler{
		authService: authService,
	}
}

// CreateSessionRequest 表示创建会话的请求
type CreateSessionRequest struct {
	ExpiresInDays int `json:"expires_in_days" validate:"required,min=1,max=365"`
}

// UpdateSessionRequest 表示更新会话的请求
type UpdateSessionRequest struct {
	ExpiresInDays int `json:"expires_in_days" validate:"required,min=1,max=365"`
}

// GetUserSessionsHandler 获取用户的所有会话
// @Summary 获取用户会话
// @Description 获取当前用户的所有会话
// @Tags sessions
// @Accept json
// @Produce json
// @Param page query int false "页码"
// @Param limit query int false "每页数量"
// @Success 200 {array} models.UserSession
// @Failure 401 {object} map[string]string
// @Router /api/sessions [get]
func (h *SessionHandler) GetUserSessionsHandler(w http.ResponseWriter, r *http.Request) {
	// 从上下文获取用户
	user := r.Context().Value(UserContextKey).(*models.User)
	if user == nil {
		http.Error(w, "用户未找到", http.StatusUnauthorized)
		return
	}

	// 获取分页参数
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// 获取用户会话
	sessions, total, err := h.authService.GetUserSessions(user.ID, page, limit)
	if err != nil {
		http.Error(w, "获取会话失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 准备响应
	response := map[string]interface{}{
		"sessions": sessions,
		"total":    total,
		"page":     page,
		"limit":    limit,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CreateUserSessionHandler 为用户创建新会话
// @Summary 创建用户会话
// @Description 为当前用户创建新会话
// @Tags sessions
// @Accept json
// @Produce json
// @Param request body CreateSessionRequest true "会话参数"
// @Success 200 {object} models.UserSession
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/sessions [post]
func (h *SessionHandler) CreateUserSessionHandler(w http.ResponseWriter, r *http.Request) {
	// 从上下文获取用户
	user := r.Context().Value(UserContextKey).(*models.User)
	if user == nil {
		http.Error(w, "用户未找到", http.StatusUnauthorized)
		return
	}

	// 解析请求
	var req CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "无效的请求体", http.StatusBadRequest)
		return
	}

	// 验证请求
	if req.ExpiresInDays < 1 || req.ExpiresInDays > 365 {
		http.Error(w, "过期时间必须在1到365天之间", http.StatusBadRequest)
		return
	}

	// 创建新会话
	session, err := h.authService.CreateUserSession(user.ID, time.Duration(req.ExpiresInDays)*24*time.Hour)
	if err != nil {
		http.Error(w, "创建会话失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

// DeleteUserSessionHandler 删除用户会话
// @Summary 删除用户会话
// @Description 删除指定的会话
// @Tags sessions
// @Accept json
// @Produce json
// @Param id path int true "会话ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/sessions/{id} [delete]
func (h *SessionHandler) DeleteUserSessionHandler(w http.ResponseWriter, r *http.Request) {
	// 从上下文获取用户
	user := r.Context().Value(UserContextKey).(*models.User)
	if user == nil {
		http.Error(w, "用户未找到", http.StatusUnauthorized)
		return
	}

	// 获取会话ID
	vars := mux.Vars(r)
	sessionID, err := strconv.ParseUint(vars["id"], 10, 32)
	if err != nil {
		http.Error(w, "无效的会话ID", http.StatusBadRequest)
		return
	}

	// 删除会话
	err = h.authService.DeleteSession(user.ID, uint(sessionID))
	if err != nil {
		http.Error(w, "删除会话失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "会话已删除"})
}

// UpdateUserSessionHandler 更新用户会话过期时间
// @Summary 更新用户会话
// @Description 更新指定会话的过期时间
// @Tags sessions
// @Accept json
// @Produce json
// @Param id path int true "会话ID"
// @Param request body UpdateSessionRequest true "更新参数"
// @Success 200 {object} models.UserSession
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/sessions/{id} [put]
func (h *SessionHandler) UpdateUserSessionHandler(w http.ResponseWriter, r *http.Request) {
	// 从上下文获取用户
	user := r.Context().Value(UserContextKey).(*models.User)
	if user == nil {
		http.Error(w, "用户未找到", http.StatusUnauthorized)
		return
	}

	// 获取会话ID
	vars := mux.Vars(r)
	sessionID, err := strconv.ParseUint(vars["id"], 10, 32)
	if err != nil {
		http.Error(w, "无效的会话ID", http.StatusBadRequest)
		return
	}

	// 解析请求
	var req UpdateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "无效的请求体", http.StatusBadRequest)
		return
	}

	// 验证请求
	if req.ExpiresInDays < 1 || req.ExpiresInDays > 365 {
		http.Error(w, "过期时间必须在1到365天之间", http.StatusBadRequest)
		return
	}

	// 更新会话
	session, err := h.authService.UpdateSessionExpiry(user.ID, uint(sessionID), time.Duration(req.ExpiresInDays)*24*time.Hour)
	if err != nil {
		http.Error(w, "更新会话失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}
