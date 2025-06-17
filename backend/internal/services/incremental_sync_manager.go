package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"mailman/internal/models"
	"mailman/internal/repository"
	"mailman/internal/utils"
)

// Add new subscription type for incremental sync
const (
	SubscriptionTypeIncrementalSync SubscriptionType = "incremental_sync"
)

// IncrementalSyncManager manages incremental email synchronization
type IncrementalSyncManager struct {
	scheduler      *EmailFetchScheduler
	syncConfigRepo *repository.SyncConfigRepository
	emailRepo      *repository.EmailRepository
	mailboxRepo    *repository.MailboxRepository
	fetcher        *FetcherService
	subscriptions  map[uint]string // accountID -> subscriptionID
	mu             sync.RWMutex
	ctx            context.Context
	cancel         context.CancelFunc
	logger         *utils.Logger
	wg             sync.WaitGroup // Add WaitGroup to track goroutines
	activityLogger *ActivityLogger
}

// NewIncrementalSyncManager creates a new incremental sync manager
func NewIncrementalSyncManager(
	scheduler *EmailFetchScheduler,
	syncConfigRepo *repository.SyncConfigRepository,
	emailRepo *repository.EmailRepository,
	mailboxRepo *repository.MailboxRepository,
	fetcher *FetcherService,
) *IncrementalSyncManager {
	ctx, cancel := context.WithCancel(context.Background())
	return &IncrementalSyncManager{
		scheduler:      scheduler,
		syncConfigRepo: syncConfigRepo,
		emailRepo:      emailRepo,
		mailboxRepo:    mailboxRepo,
		fetcher:        fetcher,
		subscriptions:  make(map[uint]string),
		ctx:            ctx,
		cancel:         cancel,
		logger:         utils.NewLogger("IncrementalSyncManager"),
		activityLogger: GetActivityLogger(),
	}
}

// Start starts the sync manager
func (m *IncrementalSyncManager) Start() error {
	m.logger.Info("Starting incremental sync manager")

	// Load all enabled sync configurations with account details
	configs, err := m.syncConfigRepo.GetEnabledConfigsWithAccounts()
	if err != nil {
		m.logger.ErrorWithStack(err, "Failed to load sync configs")
		return fmt.Errorf("failed to load sync configs: %w", err)
	}

	m.logger.Info("Loaded %d enabled sync configurations", len(configs))

	// Create subscription for each config
	for _, config := range configs {
		if err := m.createSyncSubscription(config); err != nil {
			m.logger.Error("Failed to create subscription for account %d: %v", config.AccountID, err)
		}
	}

	// Start watching for config changes
	m.wg.Add(1)
	go m.watchConfigChanges()

	return nil
}

// createSyncSubscription creates a sync subscription for an account
func (m *IncrementalSyncManager) createSyncSubscription(config models.EmailAccountSyncConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.logger.Debug("Creating sync subscription for account %d", config.AccountID)

	// Cancel existing subscription if any
	if subID, exists := m.subscriptions[config.AccountID]; exists {
		m.logger.Debug("Cancelling existing subscription %s for account %d", subID, config.AccountID)
		m.scheduler.Unsubscribe(subID)
		delete(m.subscriptions, config.AccountID)
	}

	// Create fetch request for subscription
	req := FetchRequest{
		Type:         SubscriptionTypeIncrementalSync,
		Priority:     PriorityLow,
		EmailAddress: config.Account.EmailAddress,
		StartDate:    config.LastSyncTime,
		Folders:      config.SyncFolders,
		Timeout:      0, // No timeout for incremental sync subscriptions
		Metadata: map[string]interface{}{
			"account_id":     config.AccountID,
			"sync_config_id": config.ID,
		},
	}

	m.logger.Debug("Fetch request: Type=%v, Priority=%v, Email=%s, Folders=%v",
		req.Type, req.Priority, req.EmailAddress, req.Folders)

	// Create subscription with callback
	subID, err := m.scheduler.SubscribeWithCallback(m.ctx, req, m.handleSyncEmail)
	if err != nil {
		m.logger.ErrorWithStack(err, "Failed to create subscription")
		return err
	}

	m.subscriptions[config.AccountID] = subID
	m.logger.Info("Created sync subscription %s for account %d with interval %d seconds",
		subID, config.AccountID, config.SyncInterval)

	// Start a goroutine to periodically trigger sync based on the interval
	m.wg.Add(1)
	go m.periodicSyncTrigger(config.AccountID, config.Account.EmailAddress, time.Duration(config.SyncInterval)*time.Second)

	return nil
}

// handleSyncEmail handles a synced email
func (m *IncrementalSyncManager) handleSyncEmail(email models.Email) error {
	m.logger.Debug("Handling synced email: MessageID=%s, AccountID=%d", email.MessageID, email.AccountID)

	// Check if email already exists
	exists, err := m.emailRepo.CheckDuplicate(email.MessageID, email.AccountID)
	if err != nil {
		m.logger.ErrorWithStack(err, "Failed to check duplicate for email %s", email.MessageID)
		return fmt.Errorf("failed to check duplicate: %w", err)
	}

	if exists {
		m.logger.Debug("Email already exists: %s", email.MessageID)
		return nil
	}

	// Save email to database
	if err := m.emailRepo.Create(&email); err != nil {
		m.logger.ErrorWithStack(err, "Failed to save email %s", email.MessageID)
		return fmt.Errorf("failed to save email: %w", err)
	}

	// Update sync status
	// 注意：这里更新 LastSyncTime 是因为成功获取到了新邮件
	// 所以 LastSyncTime 记录的是最后一次成功获取到新邮件的时间
	config, err := m.syncConfigRepo.GetByAccountID(email.AccountID)
	if err != nil {
		m.logger.Error("Failed to get sync config for account %d: %v", email.AccountID, err)
		return err
	}

	now := time.Now()
	config.LastSyncTime = &now
	config.LastSyncMessageID = email.MessageID
	config.SyncStatus = models.SyncStatusIdle

	if err := m.syncConfigRepo.CreateOrUpdate(config); err != nil {
		m.logger.ErrorWithStack(err, "Failed to update sync status for account %d", email.AccountID)
		return fmt.Errorf("failed to update sync status: %w", err)
	}

	m.logger.Info("Synced email %s for account %d", email.MessageID, email.AccountID)

	// Record statistics
	stats := &models.SyncStatistics{
		AccountID:      email.AccountID,
		SyncDate:       time.Now(),
		EmailsSynced:   1,
		SyncDurationMs: 0, // Will be calculated by the scheduler
		ErrorsCount:    0,
	}
	if err := m.syncConfigRepo.RecordSyncStatistics(stats); err != nil {
		m.logger.Warn("Failed to record statistics: %v", err)
	}

	return nil
}

// watchConfigChanges monitors configuration changes
func (m *IncrementalSyncManager) watchConfigChanges() {
	defer m.wg.Done()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	m.logger.Debug("Started watching for config changes")

	for {
		select {
		case <-m.ctx.Done():
			m.logger.Debug("Stopping config watcher - context cancelled")
			return
		case <-ticker.C:
			m.checkConfigChanges()
		}
	}
}

// checkConfigChanges checks for configuration changes
func (m *IncrementalSyncManager) checkConfigChanges() {
	m.logger.Debug("Checking for configuration changes")

	configs, err := m.syncConfigRepo.GetEnabledConfigsWithAccounts()
	if err != nil {
		m.logger.Error("Failed to check config changes: %v", err)
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Check for new or updated configs
	for _, config := range configs {
		if _, exists := m.subscriptions[config.AccountID]; !exists {
			// New config, create subscription
			m.logger.Info("Found new config for account %d", config.AccountID)
			if err := m.createSyncSubscription(config); err != nil {
				m.logger.Error("Failed to create subscription for account %d: %v", config.AccountID, err)
			}
		}
	}

	// Check for removed configs
	for accountID, subID := range m.subscriptions {
		found := false
		for _, config := range configs {
			if config.AccountID == accountID {
				found = true
				break
			}
		}
		if !found {
			// Config removed, cancel subscription
			m.logger.Info("Config removed for account %d, cancelling subscription", accountID)
			m.scheduler.Unsubscribe(subID)
			delete(m.subscriptions, accountID)
		}
	}
}

// UpdateSubscription updates a subscription when config changes
func (m *IncrementalSyncManager) UpdateSubscription(accountID uint, config *models.EmailAccountSyncConfig) error {
	m.logger.Info("Updating subscription for account %d", accountID)

	m.mu.Lock()

	// Cancel existing subscription
	if subID, exists := m.subscriptions[accountID]; exists {
		m.logger.Debug("Cancelling existing subscription %s", subID)
		m.scheduler.Unsubscribe(subID)
		delete(m.subscriptions, accountID)
	}

	// Unlock before calling createSyncSubscription to avoid deadlock
	m.mu.Unlock()

	// Create new subscription if enabled
	if config.EnableAutoSync {
		m.logger.Debug("Creating new subscription as auto-sync is enabled")
		return m.createSyncSubscription(*config)
	}

	m.logger.Debug("Auto-sync disabled, not creating new subscription")
	return nil
}

// SyncNow triggers immediate sync for an account
func (m *IncrementalSyncManager) SyncNow(accountID uint) (*SyncResult, error) {
	start := time.Now()
	m.logger.Info("SyncNow triggered for account %d", accountID)

	config, err := m.syncConfigRepo.GetByAccountID(accountID)
	if err != nil {
		m.logger.ErrorWithStack(err, "Failed to get sync config for account %d", accountID)
		return nil, fmt.Errorf("failed to get sync config: %w", err)
	}

	// First, sync mailboxes if we have the dependencies
	if m.mailboxRepo != nil && m.fetcher != nil && config.Account.ID > 0 {
		m.logger.Debug("Fetching latest mailboxes from IMAP")
		// Fetch latest mailboxes from IMAP
		mailboxes, err := m.fetcher.GetMailboxes(config.Account)
		if err == nil && len(mailboxes) > 0 {
			m.logger.Info("Fetched %d mailboxes, syncing to database", len(mailboxes))
			// Sync to database
			if syncErr := m.mailboxRepo.SyncMailboxes(accountID, mailboxes); syncErr != nil {
				m.logger.Warn("Failed to sync mailboxes for account %d: %v", accountID, syncErr)
			}
		} else if err != nil {
			m.logger.Warn("Failed to fetch mailboxes: %v", err)
		}
	}

	// Update sync status
	if err := m.syncConfigRepo.UpdateSyncStatus(accountID, models.SyncStatusSyncing, ""); err != nil {
		m.logger.Error("Failed to update sync status: %v", err)
		return nil, err
	}

	// Log sync started activity
	m.activityLogger.LogSyncActivity(models.ActivitySyncStarted, config.Account.EmailAddress, nil, nil)

	startTime := time.Now()
	emailsSynced := 0
	var lastError error

	// Create a one-time fetch request
	fetchReq := FetchRequest{
		Type:         SubscriptionTypeRealtime,
		Priority:     PriorityHigh,
		EmailAddress: config.Account.EmailAddress,
		StartDate:    config.LastSyncTime,
		Folders:      config.SyncFolders,
		Timeout:      30 * time.Second,
	}

	m.logger.Debug("Creating one-time fetch request: Email=%s, Folders=%v",
		fetchReq.EmailAddress, fetchReq.Folders)

	// Subscribe and get email channel
	emailChan, err := m.scheduler.Subscribe(context.Background(), fetchReq)
	if err != nil {
		lastError = err
		m.logger.ErrorWithStack(err, "Failed to subscribe for sync")
		m.syncConfigRepo.UpdateSyncStatus(accountID, models.SyncStatusError, err.Error())
		return nil, err
	}

	// Collect emails from channel with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var emails []models.Email
	for {
		select {
		case email, ok := <-emailChan:
			if !ok {
				// Channel closed
				m.logger.Debug("Email channel closed")
				goto ProcessEmails
			}
			emails = append(emails, email)
			if len(emails) >= 100 {
				// Limit reached
				m.logger.Debug("Email limit reached: %d emails", len(emails))
				goto ProcessEmails
			}
		case <-ctx.Done():
			// Timeout
			m.logger.Debug("Sync timeout reached")
			goto ProcessEmails
		}
	}

ProcessEmails:
	m.logger.Info("Processing %d emails", len(emails))

	// Process each email
	for _, email := range emails {
		if err := m.handleSyncEmail(email); err != nil {
			m.logger.Error("Failed to sync email %s: %v", email.MessageID, err)
			lastError = err
		} else {
			emailsSynced++
		}
	}

	// Update sync status
	status := models.SyncStatusIdle
	errorMsg := ""
	if lastError != nil {
		status = models.SyncStatusError
		errorMsg = lastError.Error()
	}
	m.syncConfigRepo.UpdateSyncStatus(accountID, status, errorMsg)

	// Record statistics
	duration := time.Since(startTime)
	stats := &models.SyncStatistics{
		AccountID:      accountID,
		SyncDate:       time.Now(),
		EmailsSynced:   emailsSynced,
		SyncDurationMs: int(duration.Milliseconds()),
		ErrorsCount:    0,
	}
	if lastError != nil {
		stats.ErrorsCount = 1
	}
	m.syncConfigRepo.RecordSyncStatistics(stats)

	m.logger.Info("SyncNow completed for account %d: %d emails synced in %v (total time: %v)",
		accountID, emailsSynced, duration, time.Since(start))

	// Log sync activity based on result
	if lastError != nil {
		m.activityLogger.LogSyncActivity(models.ActivitySyncFailed, config.Account.EmailAddress, nil, map[string]interface{}{
			"error":         lastError.Error(),
			"emails_synced": emailsSynced,
		})
	} else {
		m.activityLogger.LogSyncActivity(models.ActivitySyncCompleted, config.Account.EmailAddress, nil, map[string]interface{}{
			"emails_synced": emailsSynced,
			"duration_ms":   duration.Milliseconds(),
		})

		// Also log account synced activity
		m.activityLogger.LogAccountActivity(models.ActivityAccountSynced, &config.Account, nil)
	}

	return &SyncResult{
		EmailsSynced: emailsSynced,
		Duration:     duration,
		Error:        lastError,
	}, nil
}

// Stop stops the sync manager
func (m *IncrementalSyncManager) Stop() {
	m.logger.Info("Stopping incremental sync manager")

	// Cancel context to signal all goroutines to stop
	m.cancel()

	m.mu.Lock()
	// Cancel all subscriptions
	for accountID, subID := range m.subscriptions {
		m.scheduler.Unsubscribe(subID)
		delete(m.subscriptions, accountID)
		m.logger.Debug("Cancelled subscription for account %d", accountID)
	}
	m.mu.Unlock()

	// Wait for all goroutines to finish
	m.logger.Debug("Waiting for all goroutines to finish...")
	m.wg.Wait()

	m.logger.Info("Incremental sync manager stopped")
}

// SyncResult represents the result of a sync operation
type SyncResult struct {
	EmailsSynced int
	Duration     time.Duration
	Error        error
}

// periodicSyncTrigger periodically triggers sync for an account
func (m *IncrementalSyncManager) periodicSyncTrigger(accountID uint, emailAddress string, interval time.Duration) {
	defer m.wg.Done()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	m.logger.Info("Starting periodic sync trigger for account %d with interval %v", accountID, interval)

	// Wait for the first interval before triggering
	firstTrigger := time.After(interval)

	for {
		select {
		case <-firstTrigger:
			// First trigger after interval
			firstTrigger = nil // Disable first trigger
		case <-ticker.C:
			// Subsequent triggers
		case <-m.ctx.Done():
			m.logger.Debug("Stopping periodic sync for account %d - context cancelled", accountID)
			return
		}

		// Check if we should trigger (skip if firstTrigger is not nil and not fired yet)
		if firstTrigger != nil {
			continue
		}

		// Check if subscription still exists
		m.mu.RLock()
		subID, exists := m.subscriptions[accountID]
		m.mu.RUnlock()

		if !exists {
			m.logger.Debug("Stopping periodic sync for account %d - subscription removed", accountID)
			return
		}

		// Get the subscription to check if it's still active
		sub := m.scheduler.subscriptionMgr.GetSubscription(subID)
		if sub == nil {
			m.logger.Warn("Subscription %s not found in manager, but exists in our map - this might be a race condition", subID)
			// Try to recover by checking if the subscription was recreated
			time.Sleep(100 * time.Millisecond)

			m.mu.RLock()
			subID, exists = m.subscriptions[accountID]
			m.mu.RUnlock()

			if !exists {
				m.logger.Debug("Stopping periodic sync for account %d - subscription definitely removed", accountID)
				return
			}

			sub = m.scheduler.subscriptionMgr.GetSubscription(subID)
			if sub == nil {
				m.logger.Debug("Stopping periodic sync for account %d - subscription not recoverable", accountID)
				return
			}
		}

		// Trigger the fetch
		m.logger.Info("Triggering periodic sync for account %d", accountID)

		// Use the email address directly instead of relying on subscription filter
		// This is more robust in case the subscription object is being modified
		m.scheduler.triggerFetch(emailAddress)

		// 注意：同步时间的更新在 handleSyncEmail 方法中处理
		// 这意味着 LastSyncTime 实际上记录的是最后一次成功获取到新邮件的时间
		// 而不是最后一次尝试同步的时间
	}
}
