package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"mailman/internal/models"
	"mailman/internal/repository"

	"github.com/gorilla/mux"
)

// RespondWithError 返回错误响应
func RespondWithError(w http.ResponseWriter, code int, message string) {
	RespondWithJSON(w, code, map[string]string{"error": message})
}

// RespondWithJSON 返回JSON响应
func RespondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

// GetRecentActivities 获取最近的活动记录
// @Summary 获取最近的活动记录
// @Description 获取当前用户或所有用户的最近活动记录
// @Tags activities
// @Accept json
// @Produce json
// @Param limit query int false "返回记录数量限制" default(20)
// @Param all query bool false "是否获取所有用户的活动（需要管理员权限）" default(false)
// @Success 200 {array} models.ActivityLogResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/activities/recent [get]
func GetRecentActivities(w http.ResponseWriter, r *http.Request) {
	// 安全地从上下文获取 user
	userValue := r.Context().Value(UserContextKey)
	if userValue == nil {
		RespondWithError(w, http.StatusUnauthorized, "User not authenticated")
		return
	}

	user, ok := userValue.(*models.User)
	if !ok {
		RespondWithError(w, http.StatusInternalServerError, "Invalid user type in context")
		return
	}

	userID := user.ID

	// 解析参数
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	allStr := r.URL.Query().Get("all")
	all := false
	if allStr == "true" {
		all = true
	}

	// 获取活动记录
	activityRepo := repository.NewActivityLogRepository()
	var activities []models.ActivityLog
	var err error

	if all {
		// 获取所有用户的活动记录（需要管理员权限）
		activities, err = activityRepo.GetRecentActivities(nil, limit)
	} else {
		// 获取当前用户的活动记录
		activities, err = activityRepo.GetRecentActivities(&userID, limit)
	}

	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Failed to fetch activities: "+err.Error())
		return
	}

	// 转换为响应格式
	var response []models.ActivityLogResponse
	for _, activity := range activities {
		var user *struct {
			ID       uint   `json:"id"`
			Username string `json:"username"`
			Email    string `json:"email"`
		}

		if activity.User != nil {
			user = &struct {
				ID       uint   `json:"id"`
				Username string `json:"username"`
				Email    string `json:"email"`
			}{
				ID:       activity.User.ID,
				Username: activity.User.Username,
				Email:    activity.User.Email,
			}
		}

		// 解析metadata JSON
		var metadata interface{}
		if activity.Metadata != "" {
			// 这里可以解析JSON，暂时直接使用字符串
			metadata = activity.Metadata
		}

		response = append(response, models.ActivityLogResponse{
			ID:          activity.ID,
			Type:        activity.Type,
			Title:       activity.Title,
			Description: activity.Description,
			Status:      activity.Status,
			CreatedAt:   activity.CreatedAt,
			User:        user,
			Metadata:    metadata,
		})
	}

	RespondWithJSON(w, http.StatusOK, response)
}

// GetActivityStats 获取活动统计信息
// @Summary 获取活动统计信息
// @Description 获取指定时间范围内的活动统计信息
// @Tags activities
// @Accept json
// @Produce json
// @Param days query int false "统计天数" default(7)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/activities/stats [get]
func GetActivityStats(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(uint)

	// 解析参数
	daysStr := r.URL.Query().Get("days")
	days := 7
	if daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 && d <= 365 {
			days = d
		}
	}

	repo := repository.NewActivityLogRepository()
	stats, err := repo.GetActivityStats(&userID, days)

	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "获取统计信息失败")
		return
	}

	RespondWithJSON(w, http.StatusOK, stats)
}

// GetActivitiesByType 根据类型获取活动记录
// @Summary 根据类型获取活动记录
// @Description 获取指定类型的活动记录
// @Tags activities
// @Accept json
// @Produce json
// @Param type path string true "活动类型"
// @Param limit query int false "返回记录数量限制" default(20)
// @Success 200 {array} models.ActivityLogResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/activities/type/{type} [get]
func GetActivitiesByType(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(uint)
	vars := mux.Vars(r)
	activityType := models.ActivityType(vars["type"])

	// 解析参数
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	repo := repository.NewActivityLogRepository()
	activities, err := repo.GetActivitiesByType(activityType, &userID, limit)

	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "获取活动记录失败")
		return
	}

	// 转换为响应格式
	responses := make([]models.ActivityLogResponse, len(activities))
	for i, activity := range activities {
		response := models.ActivityLogResponse{
			ID:          activity.ID,
			Type:        activity.Type,
			Title:       activity.Title,
			Description: activity.Description,
			Status:      activity.Status,
			CreatedAt:   activity.CreatedAt,
		}

		if activity.User != nil {
			response.User = &struct {
				ID       uint   `json:"id"`
				Username string `json:"username"`
				Email    string `json:"email"`
			}{
				ID:       activity.User.ID,
				Username: activity.User.Username,
				Email:    activity.User.Email,
			}
		}

		if activity.Metadata != "" {
			var metadata interface{}
			if err := json.Unmarshal([]byte(activity.Metadata), &metadata); err == nil {
				response.Metadata = metadata
			}
		}

		responses[i] = response
	}

	RespondWithJSON(w, http.StatusOK, responses)
}

// DeleteOldActivities 删除旧的活动记录
// @Summary 删除旧的活动记录
// @Description 删除指定天数之前的活动记录（需要管理员权限）
// @Tags activities
// @Accept json
// @Produce json
// @Param days query int true "保留天数"
// @Success 200 {object} map[string]string
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/activities/cleanup [delete]
func DeleteOldActivities(w http.ResponseWriter, r *http.Request) {
	// TODO: 检查管理员权限

	daysStr := r.URL.Query().Get("days")
	if daysStr == "" {
		RespondWithError(w, http.StatusBadRequest, "请指定保留天数")
		return
	}

	days, err := strconv.Atoi(daysStr)
	if err != nil || days < 1 {
		RespondWithError(w, http.StatusBadRequest, "无效的天数参数")
		return
	}

	repo := repository.NewActivityLogRepository()
	if err := repo.DeleteOldActivities(days); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "删除活动记录失败")
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{
		"message": "成功删除旧的活动记录",
	})
}
