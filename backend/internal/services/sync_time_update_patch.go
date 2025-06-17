package services

// 这个文件包含了修复同步时间更新问题的补丁代码
// 可以将这些方法添加到 incremental_sync_manager.go 中

import (
	"log"
)

// ensureSyncTimeUpdate 确保同步时间总是被更新
// 这个方法应该在每次同步完成后调用，无论是否有新邮件
func (m *IncrementalSyncManager) ensureSyncTimeUpdate(accountID uint) {
	// 使用已有的 UpdateLastSyncTime 方法
	if err := m.syncConfigRepo.UpdateLastSyncTime(accountID); err != nil {
		log.Printf("[SyncManager] Failed to update last sync time for account %d: %v", accountID, err)
	} else {
		log.Printf("[SyncManager] Successfully updated last sync time for account %d", accountID)
	}
}

// 修改后的 periodicSyncTrigger 方法片段
// 在第426行 m.scheduler.triggerFetch(emailAddress) 之后添加：
/*
func (m *IncrementalSyncManager) periodicSyncTrigger(accountID uint, emailAddress string, interval time.Duration) {
	// ... 现有代码 ...

	// 在第426行之后添加：
	m.scheduler.triggerFetch(emailAddress)

	// 新增：延迟一段时间后更新同步时间
	// 这确保即使没有新邮件，同步时间也会更新
	go func() {
		time.Sleep(5 * time.Second) // 等待同步完成
		m.ensureSyncTimeUpdate(accountID)
	}()
}
*/

// 另一种方案：修改 createSyncSubscription 中的回调
// 这是一个更优雅的解决方案，可以替换第97行的回调
/*
subID, err := m.scheduler.SubscribeWithCallback(m.ctx, req, func(email models.Email) error {
	err := m.handleSyncEmail(email)

	// 新增：记录是否有新邮件
	if err == nil {
		// 标记这次同步有新邮件
		m.markSyncHasNewEmails(email.AccountID)
	}

	return err
})

// 然后在同步周期结束时检查并更新时间
*/

// 最简单的修复：直接修改 handleSyncEmail
// 在第113行添加一个新方法调用
/*
func (m *IncrementalSyncManager) handleSyncEmail(email models.Email) error {
	// 新增：先更新同步时间，确保总是更新
	m.ensureSyncTimeUpdate(email.AccountID)

	// 检查邮件是否已存在
	exists, err := m.emailRepo.CheckDuplicate(email.MessageID, email.AccountID)
	// ... 其余代码保持不变 ...
}
*/
