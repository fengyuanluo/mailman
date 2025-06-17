package services

import (
	"fmt"
	"log"
	"time"

	"mailman/internal/models"
)

// 修复方案：在 IncrementalSyncManager 中添加一个新方法来处理同步完成后的时间更新

// processFetchComplete 处理获取完成后的逻辑，确保更新同步时间
func (m *IncrementalSyncManager) processFetchComplete(accountID uint, emailsProcessed int, hasNewEmails bool) error {
	// 获取当前配置
	config, err := m.syncConfigRepo.GetByAccountID(accountID)
	if err != nil {
		return fmt.Errorf("failed to get sync config: %w", err)
	}

	// 无论是否有新邮件，都更新最后同步时间
	now := time.Now()
	config.LastSyncTime = &now
	config.SyncStatus = models.SyncStatusIdle

	// 只有在没有新邮件时才需要强制更新，有新邮件时 handleSyncEmail 已经更新过了
	if !hasNewEmails {
		if err := m.syncConfigRepo.CreateOrUpdate(config); err != nil {
			return fmt.Errorf("failed to update sync time: %w", err)
		}
		log.Printf("[SyncManager] Updated last sync time for account %d (no new emails)", accountID)
	}

	// 记录统计信息
	stats := &models.SyncStatistics{
		AccountID:      accountID,
		SyncDate:       now,
		EmailsSynced:   emailsProcessed,
		SyncDurationMs: 0, // 由调度器计算
		ErrorsCount:    0,
	}
	if err := m.syncConfigRepo.RecordSyncStatistics(stats); err != nil {
		log.Printf("[SyncManager] Failed to record statistics: %v", err)
	}

	return nil
}

// 修改后的 handleSyncBatch 方法，用于批量处理邮件
func (m *IncrementalSyncManager) handleSyncBatch(emails []models.Email) (int, bool, error) {
	newEmailCount := 0
	hasNewEmails := false

	for _, email := range emails {
		// 检查邮件是否已存在
		exists, err := m.emailRepo.CheckDuplicate(email.MessageID, email.AccountID)
		if err != nil {
			log.Printf("[SyncManager] Error checking duplicate for %s: %v", email.MessageID, err)
			continue
		}

		if exists {
			log.Printf("[SyncManager] Email already exists: %s", email.MessageID)
			continue
		}

		// 保存新邮件
		if err := m.emailRepo.Create(&email); err != nil {
			log.Printf("[SyncManager] Failed to save email %s: %v", email.MessageID, err)
			continue
		}

		// 更新同步配置
		config, err := m.syncConfigRepo.GetByAccountID(email.AccountID)
		if err != nil {
			log.Printf("[SyncManager] Failed to get config for account %d: %v", email.AccountID, err)
			continue
		}

		now := time.Now()
		config.LastSyncTime = &now
		config.LastSyncMessageID = email.MessageID
		config.SyncStatus = models.SyncStatusIdle

		if err := m.syncConfigRepo.CreateOrUpdate(config); err != nil {
			log.Printf("[SyncManager] Failed to update sync status: %v", err)
			continue
		}

		newEmailCount++
		hasNewEmails = true
		log.Printf("[SyncManager] Synced new email %s for account %d", email.MessageID, email.AccountID)
	}

	return newEmailCount, hasNewEmails, nil
}
