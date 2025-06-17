package services

import (
	"mailman/internal/models"
)

// SyncManager 定义同步管理器接口，允许不同实现之间的互操作性
type SyncManager interface {
	// Start 启动同步管理器
	Start() error

	// Stop 停止同步管理器
	Stop()

	// SyncNow 立即同步指定账户
	SyncNow(accountID uint) (*SyncResult, error)

	// UpdateSubscription 更新账户的同步订阅
	UpdateSubscription(accountID uint, config *models.EmailAccountSyncConfig) error
}

// 确保两种实现都满足接口要求
var _ SyncManager = (*IncrementalSyncManager)(nil)
var _ SyncManager = (*OptimizedIncrementalSyncManager)(nil)
