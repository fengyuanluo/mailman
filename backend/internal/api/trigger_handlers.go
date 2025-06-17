package api

import (
	"encoding/json"
	"fmt"
	"mailman/internal/models"
	"mailman/internal/repository"
	"mailman/internal/services"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

// TriggerAPIHandler 触发器API处理器
type TriggerAPIHandler struct {
	triggerService *services.TriggerService
	triggerRepo    *repository.TriggerRepository
	logRepo        *repository.TriggerExecutionLogRepository
	activityLogger *services.ActivityLogger
}

// NewTriggerAPIHandler 创建触发器API处理器
func NewTriggerAPIHandler(
	triggerService *services.TriggerService,
	triggerRepo *repository.TriggerRepository,
	logRepo *repository.TriggerExecutionLogRepository,
) *TriggerAPIHandler {
	return &TriggerAPIHandler{
		triggerService: triggerService,
		triggerRepo:    triggerRepo,
		logRepo:        logRepo,
		activityLogger: services.GetActivityLogger(),
	}
}

// CreateTriggerRequest 创建触发器请求
type CreateTriggerRequest struct {
	Name          string                        `json:"name"`
	Description   string                        `json:"description,omitempty"`
	CheckInterval int                           `json:"check_interval"`
	EmailAddress  string                        `json:"email_address,omitempty"`
	Subject       string                        `json:"subject,omitempty"`
	From          string                        `json:"from,omitempty"`
	To            string                        `json:"to,omitempty"`
	HasAttachment *bool                         `json:"has_attachment,omitempty"`
	Unread        *bool                         `json:"unread,omitempty"`
	Labels        []string                      `json:"labels,omitempty"`
	Folders       []string                      `json:"folders,omitempty"`
	CustomFilters map[string]string             `json:"custom_filters,omitempty"`
	Condition     models.TriggerConditionConfig `json:"condition"`
	Actions       []models.TriggerActionConfig  `json:"actions"`
	EnableLogging bool                          `json:"enable_logging"`
	Status        models.TriggerStatus          `json:"status"`
}

// UpdateTriggerRequest 更新触发器请求
type UpdateTriggerRequest struct {
	Name          *string                        `json:"name,omitempty"`
	Description   *string                        `json:"description,omitempty"`
	CheckInterval *int                           `json:"check_interval,omitempty"`
	EmailAddress  *string                        `json:"email_address,omitempty"`
	Subject       *string                        `json:"subject,omitempty"`
	From          *string                        `json:"from,omitempty"`
	To            *string                        `json:"to,omitempty"`
	HasAttachment *bool                          `json:"has_attachment,omitempty"`
	Unread        *bool                          `json:"unread,omitempty"`
	Labels        []string                       `json:"labels,omitempty"`
	Folders       []string                       `json:"folders,omitempty"`
	CustomFilters map[string]string              `json:"custom_filters,omitempty"`
	Condition     *models.TriggerConditionConfig `json:"condition,omitempty"`
	Actions       []models.TriggerActionConfig   `json:"actions,omitempty"`
	EnableLogging *bool                          `json:"enable_logging,omitempty"`
	Status        *models.TriggerStatus          `json:"status,omitempty"`
}

// TriggerResponse 触发器响应
type TriggerResponse struct {
	*models.EmailTrigger
	WorkerStatus map[string]interface{} `json:"worker_status,omitempty"`
}

// PaginatedTriggersResponse 分页触发器响应
type PaginatedTriggersResponse struct {
	Data       []TriggerResponse `json:"data"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalPages int               `json:"total_pages"`
}

// CreateTriggerHandler 创建触发器
// @Summary Create a new email trigger
// @Description Create a new email trigger with conditions and actions
// @Tags triggers
// @Accept json
// @Produce json
// @Param request body CreateTriggerRequest true "Create trigger request"
// @Success 201 {object} TriggerResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/triggers [post]
func (h *TriggerAPIHandler) CreateTriggerHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateTriggerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}
	if req.CheckInterval <= 0 {
		req.CheckInterval = 30 // 默认30秒
	}
	if len(req.Actions) == 0 {
		http.Error(w, "At least one action is required", http.StatusBadRequest)
		return
	}

	// 创建触发器模型
	trigger := &models.EmailTrigger{
		Name:          req.Name,
		Description:   req.Description,
		Status:        req.Status,
		CheckInterval: req.CheckInterval,
		EmailAddress:  req.EmailAddress,
		Subject:       req.Subject,
		From:          req.From,
		To:            req.To,
		HasAttachment: req.HasAttachment,
		Unread:        req.Unread,
		Labels:        models.StringSlice(req.Labels),
		Folders:       models.StringSlice(req.Folders),
		CustomFilters: req.CustomFilters,
		Condition:     req.Condition,
		Actions:       models.TriggerActions(req.Actions),
		EnableLogging: req.EnableLogging,
	}

	// 创建触发器
	if err := h.triggerService.CreateTrigger(trigger); err != nil {
		http.Error(w, "Failed to create trigger: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 记录活动日志
	userID := getUserIDFromContext(r)
	h.activityLogger.LogActivity(
		models.ActivityTriggerCreated,
		"创建触发器",
		fmt.Sprintf("创建了触发器 %s", trigger.Name),
		userID,
		map[string]interface{}{
			"trigger_id":     trigger.ID,
			"trigger_name":   trigger.Name,
			"check_interval": trigger.CheckInterval,
			"status":         trigger.Status,
		},
	)

	// 构建响应
	response := TriggerResponse{
		EmailTrigger: trigger,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// GetTriggersHandler 获取触发器列表
// @Summary Get triggers with pagination
// @Description Get triggers with pagination and search support
// @Tags triggers
// @Accept json
// @Produce json
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 10)"
// @Param sort_by query string false "Sort field (default: created_at)"
// @Param sort_order query string false "Sort order: asc or desc (default: desc)"
// @Param search query string false "Search term for trigger name"
// @Param status query string false "Filter by status: enabled or disabled"
// @Success 200 {object} PaginatedTriggersResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/triggers [get]
func (h *TriggerAPIHandler) GetTriggersHandler(w http.ResponseWriter, r *http.Request) {
	// 解析查询参数
	page := 1
	limit := 10
	sortBy := "created_at"
	sortOrder := "desc"
	search := ""

	if p := r.URL.Query().Get("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 100 {
			limit = val
		}
	}

	if s := r.URL.Query().Get("sort_by"); s != "" {
		sortBy = s
	}

	if o := r.URL.Query().Get("sort_order"); o == "asc" || o == "desc" {
		sortOrder = o
	}

	search = r.URL.Query().Get("search")

	// 获取分页数据
	triggers, total, err := h.triggerRepo.GetAllPaginated(page, limit, sortBy, sortOrder, search)
	if err != nil {
		http.Error(w, "Failed to retrieve triggers: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取worker状态
	workerStatus := h.triggerService.GetWorkerStatus()

	// 转换为响应格式
	responseTriggers := make([]TriggerResponse, 0, len(triggers))
	for _, trigger := range triggers {
		response := TriggerResponse{
			EmailTrigger: &trigger,
		}
		if status, exists := workerStatus[trigger.ID]; exists {
			response.WorkerStatus = status
		}
		responseTriggers = append(responseTriggers, response)
	}

	// 计算总页数
	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	// 构建响应
	response := PaginatedTriggersResponse{
		Data:       responseTriggers,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetTriggerHandler 获取单个触发器
// @Summary Get a trigger by ID
// @Description Get a trigger by ID with worker status
// @Tags triggers
// @Accept json
// @Produce json
// @Param id path int true "Trigger ID"
// @Success 200 {object} TriggerResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/triggers/{id} [get]
func (h *TriggerAPIHandler) GetTriggerHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.ParseUint(vars["id"], 10, 32)
	if err != nil {
		http.Error(w, "Invalid trigger ID", http.StatusBadRequest)
		return
	}

	trigger, err := h.triggerRepo.GetByID(uint(id))
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// 获取worker状态
	workerStatus := h.triggerService.GetWorkerStatus()

	response := TriggerResponse{
		EmailTrigger: trigger,
	}
	if status, exists := workerStatus[trigger.ID]; exists {
		response.WorkerStatus = status
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UpdateTriggerHandler 更新触发器
// @Summary Update a trigger
// @Description Update a trigger (supports partial updates)
// @Tags triggers
// @Accept json
// @Produce json
// @Param id path int true "Trigger ID"
// @Param request body UpdateTriggerRequest true "Update trigger request"
// @Success 200 {object} TriggerResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/triggers/{id} [put]
func (h *TriggerAPIHandler) UpdateTriggerHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.ParseUint(vars["id"], 10, 32)
	if err != nil {
		http.Error(w, "Invalid trigger ID", http.StatusBadRequest)
		return
	}

	// 获取现有触发器
	existingTrigger, err := h.triggerRepo.GetByID(uint(id))
	if err != nil {
		http.Error(w, "Trigger not found", http.StatusNotFound)
		return
	}

	var req UpdateTriggerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 应用部分更新
	if req.Name != nil {
		existingTrigger.Name = *req.Name
	}
	if req.Description != nil {
		existingTrigger.Description = *req.Description
	}
	if req.CheckInterval != nil {
		existingTrigger.CheckInterval = *req.CheckInterval
	}
	if req.EmailAddress != nil {
		existingTrigger.EmailAddress = *req.EmailAddress
	}
	if req.Subject != nil {
		existingTrigger.Subject = *req.Subject
	}
	if req.From != nil {
		existingTrigger.From = *req.From
	}
	if req.To != nil {
		existingTrigger.To = *req.To
	}
	if req.HasAttachment != nil {
		existingTrigger.HasAttachment = req.HasAttachment
	}
	if req.Unread != nil {
		existingTrigger.Unread = req.Unread
	}
	if req.Labels != nil {
		existingTrigger.Labels = models.StringSlice(req.Labels)
	}
	if req.Folders != nil {
		existingTrigger.Folders = models.StringSlice(req.Folders)
	}
	if req.CustomFilters != nil {
		existingTrigger.CustomFilters = req.CustomFilters
	}
	if req.Condition != nil {
		existingTrigger.Condition = *req.Condition
	}
	if req.Actions != nil {
		existingTrigger.Actions = models.TriggerActions(req.Actions)
	}
	if req.EnableLogging != nil {
		existingTrigger.EnableLogging = *req.EnableLogging
	}
	if req.Status != nil {
		existingTrigger.Status = *req.Status
	}

	// 更新触发器
	if err := h.triggerService.UpdateTrigger(existingTrigger); err != nil {
		http.Error(w, "Failed to update trigger: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 记录活动日志
	userID := getUserIDFromContext(r)
	h.activityLogger.LogActivity(
		models.ActivityTypeGeneral,
		"更新触发器",
		fmt.Sprintf("更新了触发器 %s", existingTrigger.Name),
		userID,
		map[string]interface{}{
			"trigger_id":   existingTrigger.ID,
			"trigger_name": existingTrigger.Name,
		},
	)

	// 获取worker状态
	workerStatus := h.triggerService.GetWorkerStatus()

	response := TriggerResponse{
		EmailTrigger: existingTrigger,
	}
	if status, exists := workerStatus[existingTrigger.ID]; exists {
		response.WorkerStatus = status
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// DeleteTriggerHandler 删除触发器
// @Summary Delete a trigger
// @Description Delete a trigger by ID
// @Tags triggers
// @Accept json
// @Produce json
// @Param id path int true "Trigger ID"
// @Success 204 "No Content"
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/triggers/{id} [delete]
func (h *TriggerAPIHandler) DeleteTriggerHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.ParseUint(vars["id"], 10, 32)
	if err != nil {
		http.Error(w, "Invalid trigger ID", http.StatusBadRequest)
		return
	}

	// 获取触发器信息用于日志记录
	trigger, err := h.triggerRepo.GetByID(uint(id))
	if err != nil {
		http.Error(w, "Trigger not found", http.StatusNotFound)
		return
	}

	// 删除触发器
	if err := h.triggerService.DeleteTrigger(uint(id)); err != nil {
		http.Error(w, "Failed to delete trigger: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 记录活动日志
	userID := getUserIDFromContext(r)
	h.activityLogger.LogActivity(
		models.ActivityTypeGeneral,
		"删除触发器",
		fmt.Sprintf("删除了触发器 %s", trigger.Name),
		userID,
		map[string]interface{}{
			"trigger_id":   trigger.ID,
			"trigger_name": trigger.Name,
		},
	)

	w.WriteHeader(http.StatusNoContent)
}

// EnableTriggerHandler 启用触发器
// @Summary Enable a trigger
// @Description Enable a trigger by ID
// @Tags triggers
// @Accept json
// @Produce json
// @Param id path int true "Trigger ID"
// @Success 200 {object} TriggerResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/triggers/{id}/enable [post]
func (h *TriggerAPIHandler) EnableTriggerHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.ParseUint(vars["id"], 10, 32)
	if err != nil {
		http.Error(w, "Invalid trigger ID", http.StatusBadRequest)
		return
	}

	if err := h.triggerService.EnableTrigger(uint(id)); err != nil {
		http.Error(w, "Failed to enable trigger: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取更新后的触发器
	trigger, err := h.triggerRepo.GetByID(uint(id))
	if err != nil {
		http.Error(w, "Trigger not found", http.StatusNotFound)
		return
	}

	// 记录活动日志
	userID := getUserIDFromContext(r)
	h.activityLogger.LogActivity(
		models.ActivityTypeGeneral,
		"启用触发器",
		fmt.Sprintf("启用了触发器 %s", trigger.Name),
		userID,
		map[string]interface{}{
			"trigger_id":   trigger.ID,
			"trigger_name": trigger.Name,
		},
	)

	// 获取worker状态
	workerStatus := h.triggerService.GetWorkerStatus()

	response := TriggerResponse{
		EmailTrigger: trigger,
	}
	if status, exists := workerStatus[trigger.ID]; exists {
		response.WorkerStatus = status
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// DisableTriggerHandler 禁用触发器
// @Summary Disable a trigger
// @Description Disable a trigger by ID
// @Tags triggers
// @Accept json
// @Produce json
// @Param id path int true "Trigger ID"
// @Success 200 {object} TriggerResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/triggers/{id}/disable [post]
func (h *TriggerAPIHandler) DisableTriggerHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.ParseUint(vars["id"], 10, 32)
	if err != nil {
		http.Error(w, "Invalid trigger ID", http.StatusBadRequest)
		return
	}

	if err := h.triggerService.DisableTrigger(uint(id)); err != nil {
		http.Error(w, "Failed to disable trigger: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取更新后的触发器
	trigger, err := h.triggerRepo.GetByID(uint(id))
	if err != nil {
		http.Error(w, "Trigger not found", http.StatusNotFound)
		return
	}

	// 记录活动日志
	userID := getUserIDFromContext(r)
	h.activityLogger.LogActivity(
		models.ActivityTypeGeneral,
		"禁用触发器",
		fmt.Sprintf("禁用了触发器 %s", trigger.Name),
		userID,
		map[string]interface{}{
			"trigger_id":   trigger.ID,
			"trigger_name": trigger.Name,
		},
	)

	response := TriggerResponse{
		EmailTrigger: trigger,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetTriggerExecutionLogsHandler 获取触发器执行日志
// @Summary Get trigger execution logs
// @Description Get trigger execution logs with pagination and filtering
// @Tags triggers
// @Accept json
// @Produce json
// @Param id path int false "Trigger ID (optional for global logs)"
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 10)"
// @Param status query string false "Filter by status: success, failed, partial"
// @Param start_date query string false "Start date (RFC3339 format)"
// @Param end_date query string false "End date (RFC3339 format)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/triggers/{id}/logs [get]
// @Router /api/trigger-logs [get]
func (h *TriggerAPIHandler) GetTriggerExecutionLogsHandler(w http.ResponseWriter, r *http.Request) {
	// 解析查询参数
	page := 1
	limit := 10

	if p := r.URL.Query().Get("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 100 {
			limit = val
		}
	}

	// 解析触发器ID（可选）
	var triggerID *uint
	vars := mux.Vars(r)
	if idStr, exists := vars["id"]; exists && idStr != "" {
		if id, err := strconv.ParseUint(idStr, 10, 32); err == nil {
			triggerIDVal := uint(id)
			triggerID = &triggerIDVal
		}
	}

	// 解析状态过滤
	var status *models.TriggerExecutionStatus
	if statusStr := r.URL.Query().Get("status"); statusStr != "" {
		statusVal := models.TriggerExecutionStatus(statusStr)
		status = &statusVal
	}

	// 解析日期过滤
	var startDate, endDate *time.Time
	if startDateStr := r.URL.Query().Get("start_date"); startDateStr != "" {
		if parsed, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			startDate = &parsed
		}
	}
	if endDateStr := r.URL.Query().Get("end_date"); endDateStr != "" {
		if parsed, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			endDate = &parsed
		}
	}

	// 获取执行日志
	logs, total, err := h.logRepo.GetAllPaginated(page, limit, triggerID, status, startDate, endDate)
	if err != nil {
		http.Error(w, "Failed to retrieve execution logs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 计算总页数
	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	response := map[string]interface{}{
		"data":        logs,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetTriggerStatsHandler 获取触发器统计信息
// @Summary Get trigger statistics
// @Description Get trigger statistics and worker status
// @Tags triggers
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} ErrorResponse
// @Router /api/trigger-stats [get]
func (h *TriggerAPIHandler) GetTriggerStatsHandler(w http.ResponseWriter, r *http.Request) {
	// 获取触发器总数
	totalCount, err := h.triggerRepo.GetCount()
	if err != nil {
		http.Error(w, "Failed to get trigger count: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取启用的触发器数量
	enabledCount, err := h.triggerRepo.GetCountByStatus(models.TriggerStatusEnabled)
	if err != nil {
		http.Error(w, "Failed to get enabled trigger count: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取禁用的触发器数量
	disabledCount, err := h.triggerRepo.GetCountByStatus(models.TriggerStatusDisabled)
	if err != nil {
		http.Error(w, "Failed to get disabled trigger count: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取worker状态
	workerStatus := h.triggerService.GetWorkerStatus()
	activeWorkers := len(workerStatus)

	response := map[string]interface{}{
		"total_triggers":    totalCount,
		"enabled_triggers":  enabledCount,
		"disabled_triggers": disabledCount,
		"active_workers":    activeWorkers,
		"worker_status":     workerStatus,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
