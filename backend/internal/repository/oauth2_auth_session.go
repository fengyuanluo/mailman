package repository

import (
	"fmt"
	"time"

	"mailman/internal/models"

	"gorm.io/gorm"
)

// OAuth2AuthSessionRepository 定义OAuth2授权会话数据访问接口
type OAuth2AuthSessionRepository interface {
	Create(session *models.OAuth2AuthSession) error
	GetByState(state string) (*models.OAuth2AuthSession, error)
	UpdateStatus(state string, status models.OAuth2AuthSessionStatus, errorMsg string) error
	UpdateWithAuthData(state string, authData *OAuth2AuthData) error
	CleanupExpired() error
	DeleteByState(state string) error
}

// OAuth2AuthData 包含授权成功后的数据
type OAuth2AuthData struct {
	EmailAddress   string
	AccessToken    string
	RefreshToken   string
	TokenExpiresAt int64
	TokenType      string
	UserInfo       models.JSONMap
}

// oauth2AuthSessionRepository 实现OAuth2AuthSessionRepository接口
type oauth2AuthSessionRepository struct {
	db *gorm.DB
}

// NewOAuth2AuthSessionRepository 创建新的OAuth2授权会话仓库实例
func NewOAuth2AuthSessionRepository(db *gorm.DB) OAuth2AuthSessionRepository {
	return &oauth2AuthSessionRepository{db: db}
}

// Create 创建新的OAuth2授权会话
func (r *oauth2AuthSessionRepository) Create(session *models.OAuth2AuthSession) error {
	return r.db.Create(session).Error
}

// GetByState 根据state获取OAuth2授权会话
func (r *oauth2AuthSessionRepository) GetByState(state string) (*models.OAuth2AuthSession, error) {
	var session models.OAuth2AuthSession
	err := r.db.Preload("Provider").Where("state = ? AND deleted_at IS NULL", state).First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// UpdateStatus 更新OAuth2授权会话状态
func (r *oauth2AuthSessionRepository) UpdateStatus(state string, status models.OAuth2AuthSessionStatus, errorMsg string) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}

	if errorMsg != "" {
		updates["error_msg"] = errorMsg
	}

	return r.db.Model(&models.OAuth2AuthSession{}).Where("state = ? AND deleted_at IS NULL", state).Updates(updates).Error
}

// UpdateWithAuthData 更新OAuth2授权会话的认证数据
func (r *oauth2AuthSessionRepository) UpdateWithAuthData(state string, authData *OAuth2AuthData) error {
	updates := map[string]interface{}{
		"status":           models.OAuth2AuthSessionStatusSuccess,
		"email_address":    authData.EmailAddress,
		"access_token":     authData.AccessToken,
		"refresh_token":    authData.RefreshToken,
		"token_expires_at": authData.TokenExpiresAt,
		"token_type":       authData.TokenType,
		"user_info":        authData.UserInfo,
		"updated_at":       time.Now(),
	}

	return r.db.Model(&models.OAuth2AuthSession{}).Where("state = ? AND deleted_at IS NULL", state).Updates(updates).Error
}

// CleanupExpired 清理过期的OAuth2授权会话
func (r *oauth2AuthSessionRepository) CleanupExpired() error {
	now := time.Now()

	// 软删除过期的会话
	result := r.db.Model(&models.OAuth2AuthSession{}).
		Where("expires_at < ? AND deleted_at IS NULL", now).
		Update("deleted_at", now)

	if result.Error != nil {
		return result.Error
	}

	// 同时更新状态为expired
	return r.db.Model(&models.OAuth2AuthSession{}).
		Where("expires_at < ? AND status NOT IN (?, ?) AND deleted_at IS NOT NULL",
			now, models.OAuth2AuthSessionStatusExpired, models.OAuth2AuthSessionStatusSuccess).
		Update("status", models.OAuth2AuthSessionStatusExpired).Error
}

// DeleteByState 根据state删除OAuth2授权会话
func (r *oauth2AuthSessionRepository) DeleteByState(state string) error {
	return r.db.Where("state = ?", state).Delete(&models.OAuth2AuthSession{}).Error
}

// CreateSessionWithExpiry 创建带过期时间的OAuth2授权会话
func (r *oauth2AuthSessionRepository) CreateSessionWithExpiry(providerID uint, state string, expiryMinutes int) (*models.OAuth2AuthSession, error) {
	session := &models.OAuth2AuthSession{
		State:      state,
		ProviderID: providerID,
		Status:     models.OAuth2AuthSessionStatusPending,
		ExpiresAt:  time.Now().Add(time.Duration(expiryMinutes) * time.Minute),
	}

	err := r.Create(session)
	if err != nil {
		return nil, fmt.Errorf("failed to create OAuth2 auth session: %w", err)
	}

	// 重新获取以确保包含所有关联数据
	return r.GetByState(state)
}
