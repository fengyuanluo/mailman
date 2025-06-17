package repository

import (
	"encoding/json"
	"time"

	"mailman/internal/database"
	"mailman/internal/models"

	"gorm.io/gorm"
)

type ActivityLogRepository struct {
	db *gorm.DB
}

func NewActivityLogRepository() *ActivityLogRepository {
	return &ActivityLogRepository{
		db: database.DB,
	}
}

// Create 创建活动日志
func (r *ActivityLogRepository) Create(log *models.ActivityLog) error {
	return r.db.Create(log).Error
}

// GetRecentActivities 获取最近的活动记录
func (r *ActivityLogRepository) GetRecentActivities(userID *uint, limit int) ([]models.ActivityLog, error) {
	var activities []models.ActivityLog
	query := r.db.Preload("User").Order("created_at DESC").Limit(limit)

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	err := query.Find(&activities).Error
	return activities, err
}

// GetActivitiesByType 根据类型获取活动记录
func (r *ActivityLogRepository) GetActivitiesByType(activityType models.ActivityType, userID *uint, limit int) ([]models.ActivityLog, error) {
	var activities []models.ActivityLog
	query := r.db.Preload("User").Where("type = ?", activityType).Order("created_at DESC").Limit(limit)

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	err := query.Find(&activities).Error
	return activities, err
}

// GetActivitiesByDateRange 获取指定日期范围内的活动
func (r *ActivityLogRepository) GetActivitiesByDateRange(startDate, endDate time.Time, userID *uint) ([]models.ActivityLog, error) {
	var activities []models.ActivityLog
	query := r.db.Preload("User").Where("created_at BETWEEN ? AND ?", startDate, endDate).Order("created_at DESC")

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	err := query.Find(&activities).Error
	return activities, err
}

// GetActivityStats 获取活动统计信息
func (r *ActivityLogRepository) GetActivityStats(userID *uint, days int) (map[string]interface{}, error) {
	startDate := time.Now().AddDate(0, 0, -days)

	// 统计各类型活动数量
	var typeStats []struct {
		Type  models.ActivityType `json:"type"`
		Count int64               `json:"count"`
	}

	query := r.db.Model(&models.ActivityLog{}).
		Select("type, COUNT(*) as count").
		Where("created_at >= ?", startDate).
		Group("type")

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if err := query.Scan(&typeStats).Error; err != nil {
		return nil, err
	}

	// 统计每日活动数量
	var dailyStats []struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}

	dailyQuery := r.db.Model(&models.ActivityLog{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at >= ?", startDate).
		Group("DATE(created_at)").
		Order("date")

	if userID != nil {
		dailyQuery = dailyQuery.Where("user_id = ?", *userID)
	}

	if err := dailyQuery.Scan(&dailyStats).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"type_stats":  typeStats,
		"daily_stats": dailyStats,
		"period_days": days,
	}, nil
}

// DeleteOldActivities 删除旧的活动记录
func (r *ActivityLogRepository) DeleteOldActivities(days int) error {
	cutoffDate := time.Now().AddDate(0, 0, -days)
	return r.db.Where("created_at < ?", cutoffDate).Delete(&models.ActivityLog{}).Error
}

// LogActivity 便捷方法：记录活动
func (r *ActivityLogRepository) LogActivity(activityType models.ActivityType, title, description string, userID *uint, metadata interface{}) error {
	log := &models.ActivityLog{
		Type:        activityType,
		Title:       title,
		Description: description,
		UserID:      userID,
		Status:      "success",
	}

	if metadata != nil {
		metadataJSON, err := json.Marshal(metadata)
		if err != nil {
			return err
		}
		log.Metadata = string(metadataJSON)
	}

	return r.Create(log)
}

// LogFailedActivity 便捷方法：记录失败的活动
func (r *ActivityLogRepository) LogFailedActivity(activityType models.ActivityType, title, description string, userID *uint, metadata interface{}) error {
	log := &models.ActivityLog{
		Type:        activityType,
		Title:       title,
		Description: description,
		UserID:      userID,
		Status:      "failed",
	}

	if metadata != nil {
		metadataJSON, err := json.Marshal(metadata)
		if err != nil {
			return err
		}
		log.Metadata = string(metadataJSON)
	}

	return r.Create(log)
}
