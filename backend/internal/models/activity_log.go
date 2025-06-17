package models

import (
	"time"
)

// ActivityType 定义活动类型
type ActivityType string

const (
	// 邮件相关活动
	ActivityEmailReceived ActivityType = "email_received"
	ActivityEmailSent     ActivityType = "email_sent"
	ActivityEmailDeleted  ActivityType = "email_deleted"
	ActivityEmailMoved    ActivityType = "email_moved"

	// 账户相关活动
	ActivityAccountAdded    ActivityType = "account_added"
	ActivityAccountUpdated  ActivityType = "account_updated"
	ActivityAccountDeleted  ActivityType = "account_deleted"
	ActivityAccountVerified ActivityType = "account_verified"
	ActivityAccountSynced   ActivityType = "account_synced"

	// 同步相关活动
	ActivitySyncStarted   ActivityType = "sync_started"
	ActivitySyncCompleted ActivityType = "sync_completed"
	ActivitySyncFailed    ActivityType = "sync_failed"

	// 订阅相关活动
	ActivitySubscribed   ActivityType = "subscribed"
	ActivityUnsubscribed ActivityType = "unsubscribed"

	// AI相关活动
	ActivityAIExtraction      ActivityType = "ai_extraction"
	ActivityAITemplateCreated ActivityType = "ai_template_created"

	// 用户相关活动
	ActivityUserLogin  ActivityType = "user_login"
	ActivityUserLogout ActivityType = "user_logout"

	// 触发器相关活动
	ActivityTriggerCreated  ActivityType = "trigger_created"
	ActivityTriggerUpdated  ActivityType = "trigger_updated"
	ActivityTriggerDeleted  ActivityType = "trigger_deleted"
	ActivityTriggerEnabled  ActivityType = "trigger_enabled"
	ActivityTriggerDisabled ActivityType = "trigger_disabled"
	ActivityTriggerExecuted ActivityType = "trigger_executed"

	// 通用活动类型
	ActivityTypeGeneral ActivityType = "general"
)

// ActivityLog 活动日志模型
type ActivityLog struct {
	ID        uint       `gorm:"primarykey" json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *DeletedAt `gorm:"index" json:"deleted_at,omitempty" swaggertype:"object"`

	// 基本信息
	Type        ActivityType `gorm:"type:varchar(50);not null;index" json:"type"`
	Title       string       `gorm:"type:varchar(255);not null" json:"title"`
	Description string       `gorm:"type:text" json:"description"`

	// 关联信息
	UserID *uint `gorm:"index" json:"user_id,omitempty"`
	User   *User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// 可选的关联实体
	EmailID   *uint `gorm:"index" json:"email_id,omitempty"`
	AccountID *uint `gorm:"index" json:"account_id,omitempty"`

	// 额外的元数据（JSON格式）
	Metadata string `gorm:"type:text" json:"metadata,omitempty"`

	// 活动状态
	Status string `gorm:"type:varchar(50);default:'success'" json:"status"` // success, failed, pending

	// IP地址（用于登录等活动）
	IPAddress string `gorm:"type:varchar(45)" json:"ip_address,omitempty"`
}

// ActivityLogResponse API响应结构
type ActivityLogResponse struct {
	ID          uint         `json:"id"`
	Type        ActivityType `json:"type"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Status      string       `json:"status"`
	CreatedAt   time.Time    `json:"created_at"`
	User        *struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	} `json:"user,omitempty"`
	Metadata interface{} `json:"metadata,omitempty"`
}

// GetActivityTypeInfo 获取活动类型的显示信息
func GetActivityTypeInfo(activityType ActivityType) (icon string, color string) {
	switch activityType {
	case ActivityEmailReceived:
		return "mail", "blue"
	case ActivityEmailSent:
		return "send", "green"
	case ActivityEmailDeleted:
		return "trash", "red"
	case ActivityAccountAdded, ActivityAccountUpdated:
		return "user-plus", "purple"
	case ActivityAccountSynced, ActivitySyncCompleted:
		return "check-circle", "green"
	case ActivitySyncFailed:
		return "x-circle", "red"
	case ActivitySubscribed:
		return "bell", "blue"
	case ActivityUnsubscribed:
		return "bell-off", "gray"
	case ActivityAIExtraction, ActivityAITemplateCreated:
		return "cpu", "purple"
	case ActivityUserLogin:
		return "log-in", "blue"
	case ActivityUserLogout:
		return "log-out", "gray"
	default:
		return "activity", "gray"
	}
}
