package repository

import (
	"mailman/internal/models"
	"time"

	"gorm.io/gorm"
)

type SyncConfigRepository struct {
	db *gorm.DB
}

func NewSyncConfigRepository(db *gorm.DB) *SyncConfigRepository {
	return &SyncConfigRepository{db: db}
}

// GetByAccountID retrieves sync config by account ID
func (r *SyncConfigRepository) GetByAccountID(accountID uint) (*models.EmailAccountSyncConfig, error) {
	var config models.EmailAccountSyncConfig
	err := r.db.Where("account_id = ?", accountID).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// Create creates a new sync config
func (r *SyncConfigRepository) Create(config *models.EmailAccountSyncConfig) error {
	return r.db.Create(config).Error
}

// Update updates an existing sync config
func (r *SyncConfigRepository) Update(config *models.EmailAccountSyncConfig) error {
	return r.db.Save(config).Error
}

// Delete deletes a sync config
func (r *SyncConfigRepository) Delete(id uint) error {
	return r.db.Delete(&models.EmailAccountSyncConfig{}, id).Error
}

// GetAll retrieves all sync configs
func (r *SyncConfigRepository) GetAll() ([]models.EmailAccountSyncConfig, error) {
	var configs []models.EmailAccountSyncConfig
	err := r.db.Find(&configs).Error
	return configs, err
}

// GetEnabledConfigs retrieves all enabled sync configs
func (r *SyncConfigRepository) GetEnabledConfigs() ([]models.EmailAccountSyncConfig, error) {
	var configs []models.EmailAccountSyncConfig
	err := r.db.Where("enable_auto_sync = ?", true).Find(&configs).Error
	return configs, err
}

// GetEnabledConfigsWithAccounts retrieves all enabled sync configs with account details
// Only returns configs for verified, non-deleted accounts
func (r *SyncConfigRepository) GetEnabledConfigsWithAccounts() ([]models.EmailAccountSyncConfig, error) {
	var configs []models.EmailAccountSyncConfig
	err := r.db.Preload("Account").Preload("Account.MailProvider").
		Joins("JOIN email_accounts ON email_accounts.id = email_account_sync_configs.account_id").
		Where("email_account_sync_configs.enable_auto_sync = ?", true).
		Where("email_accounts.is_verified = ?", true).
		Where("email_accounts.deleted_at IS NULL").
		Find(&configs).Error
	return configs, err
}

// GetVerifiedAccountsWithoutSyncConfig retrieves all verified, non-deleted accounts without sync config
func (r *SyncConfigRepository) GetVerifiedAccountsWithoutSyncConfig() ([]models.EmailAccount, error) {
	var accounts []models.EmailAccount
	err := r.db.Preload("MailProvider").
		Where("is_verified = ?", true).
		Where("deleted_at IS NULL").
		Where("id NOT IN (SELECT account_id FROM email_account_sync_configs)").
		Find(&accounts).Error
	return accounts, err
}

// GetByID retrieves sync config by ID
func (r *SyncConfigRepository) GetByID(id uint) (*models.EmailAccountSyncConfig, error) {
	var config models.EmailAccountSyncConfig
	err := r.db.Preload("Account").Preload("Account.MailProvider").First(&config, id).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// UpdateSyncStatus updates the sync status and error message
func (r *SyncConfigRepository) UpdateSyncStatus(accountID uint, status string, errorMsg string) error {
	updates := map[string]interface{}{
		"sync_status": status,
	}
	if errorMsg != "" {
		updates["last_sync_error"] = errorMsg
	} else {
		updates["last_sync_error"] = gorm.Expr("NULL")
	}

	return r.db.Model(&models.EmailAccountSyncConfig{}).
		Where("account_id = ?", accountID).
		Updates(updates).Error
}

// UpdateLastSyncTime updates the last sync time
func (r *SyncConfigRepository) UpdateLastSyncTime(accountID uint) error {
	return r.db.Model(&models.EmailAccountSyncConfig{}).
		Where("account_id = ?", accountID).
		Update("last_sync_time", gorm.Expr("CURRENT_TIMESTAMP")).Error
}

// UpdateLastSyncMessageID updates the last synced message ID
func (r *SyncConfigRepository) UpdateLastSyncMessageID(accountID uint, messageID string) error {
	return r.db.Model(&models.EmailAccountSyncConfig{}).
		Where("account_id = ?", accountID).
		Update("last_sync_message_id", messageID).Error
}

// CreateDefaultConfigForAccount creates a default sync config for an account
func (r *SyncConfigRepository) CreateDefaultConfigForAccount(accountID uint) error {
	config := &models.EmailAccountSyncConfig{
		AccountID:      accountID,
		EnableAutoSync: true,
		SyncInterval:   300, // 5 minutes default
		SyncFolders:    []string{"INBOX"},
		SyncStatus:     "idle",
	}
	return r.db.Create(config).Error
}

// GetByAccountIDWithAccount retrieves sync config by account ID with account details
func (r *SyncConfigRepository) GetByAccountIDWithAccount(accountID uint) (*models.EmailAccountSyncConfig, error) {
	var config models.EmailAccountSyncConfig
	err := r.db.Preload("Account").Preload("Account.MailProvider").Where("account_id = ?", accountID).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// BulkUpdateSyncStatus updates sync status for multiple accounts
func (r *SyncConfigRepository) BulkUpdateSyncStatus(accountIDs []uint, status string) error {
	return r.db.Model(&models.EmailAccountSyncConfig{}).
		Where("account_id IN ?", accountIDs).
		Update("sync_status", status).Error
}

// GetSyncingConfigs retrieves all configs currently syncing
func (r *SyncConfigRepository) GetSyncingConfigs() ([]models.EmailAccountSyncConfig, error) {
	var configs []models.EmailAccountSyncConfig
	err := r.db.Where("sync_status = ?", "syncing").Find(&configs).Error
	return configs, err
}

// ResetStuckSyncingStatus resets configs stuck in syncing status
func (r *SyncConfigRepository) ResetStuckSyncingStatus() error {
	return r.db.Model(&models.EmailAccountSyncConfig{}).
		Where("sync_status = ?", "syncing").
		Updates(map[string]interface{}{
			"sync_status":     "idle",
			"last_sync_error": "Sync was interrupted",
		}).Error
}

// GetConfigsNeedingSync retrieves configs that need syncing based on interval
func (r *SyncConfigRepository) GetConfigsNeedingSync() ([]models.EmailAccountSyncConfig, error) {
	var configs []models.EmailAccountSyncConfig
	err := r.db.
		Preload("Account").
		Preload("Account.MailProvider").
		Where("enable_auto_sync = ?", true).
		Where("sync_status = ?", "idle").
		Where("last_sync_time IS NULL OR last_sync_time < datetime('now', '-' || sync_interval || ' seconds')").
		Find(&configs).Error
	return configs, err
}

// UpdateSyncInterval updates the sync interval for a config
func (r *SyncConfigRepository) UpdateSyncInterval(accountID uint, interval int) error {
	return r.db.Model(&models.EmailAccountSyncConfig{}).
		Where("account_id = ?", accountID).
		Update("sync_interval", interval).Error
}

// UpdateSyncFolders updates the sync folders for a config
func (r *SyncConfigRepository) UpdateSyncFolders(accountID uint, folders []string) error {
	return r.db.Model(&models.EmailAccountSyncConfig{}).
		Where("account_id = ?", accountID).
		Update("sync_folders", folders).Error
}

// ToggleAutoSync toggles the auto sync setting
func (r *SyncConfigRepository) ToggleAutoSync(accountID uint) error {
	return r.db.Model(&models.EmailAccountSyncConfig{}).
		Where("account_id = ?", accountID).
		Update("enable_auto_sync", gorm.Expr("NOT enable_auto_sync")).Error
}

// GetSyncStats retrieves sync statistics
func (r *SyncConfigRepository) GetSyncStats() (map[string]interface{}, error) {
	var totalConfigs, enabledConfigs, syncingConfigs, errorConfigs int64

	r.db.Model(&models.EmailAccountSyncConfig{}).Count(&totalConfigs)
	r.db.Model(&models.EmailAccountSyncConfig{}).Where("enable_auto_sync = ?", true).Count(&enabledConfigs)
	r.db.Model(&models.EmailAccountSyncConfig{}).Where("sync_status = ?", "syncing").Count(&syncingConfigs)
	r.db.Model(&models.EmailAccountSyncConfig{}).Where("last_sync_error IS NOT NULL AND last_sync_error != ''").Count(&errorConfigs)

	return map[string]interface{}{
		"total":   totalConfigs,
		"enabled": enabledConfigs,
		"syncing": syncingConfigs,
		"errors":  errorConfigs,
	}, nil
}

// GetAllWithPagination retrieves all sync configs with pagination and search
func (r *SyncConfigRepository) GetAllWithPagination(page, limit int, search string) (int, []models.EmailAccountSyncConfig, error) {
	var configs []models.EmailAccountSyncConfig
	var totalCount int64

	// Base query for counting
	baseQuery := r.db.Model(&models.EmailAccountSyncConfig{}).
		Joins("JOIN email_accounts ON email_accounts.id = email_account_sync_configs.account_id")

	if search != "" {
		baseQuery = baseQuery.Where("email_accounts.email LIKE ? OR email_accounts.name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Get total count
	if err := baseQuery.Count(&totalCount).Error; err != nil {
		return 0, nil, err
	}

	// Build query for fetching data
	offset := (page - 1) * limit
	query := r.db.Model(&models.EmailAccountSyncConfig{}).
		Preload("Account").
		Preload("Account.MailProvider").
		Joins("JOIN email_accounts ON email_accounts.id = email_account_sync_configs.account_id")

	// Apply search filter if provided
	if search != "" {
		query = query.Where("email_accounts.email LIKE ? OR email_accounts.name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Apply pagination and ordering
	err := query.
		Offset(offset).
		Limit(limit).
		Order("email_account_sync_configs.updated_at DESC").
		Find(&configs).Error

	if err != nil {
		return 0, nil, err
	}

	return int(totalCount), configs, nil
}

// CreateOrUpdate creates or updates a sync config
func (r *SyncConfigRepository) CreateOrUpdate(config *models.EmailAccountSyncConfig) error {
	var existing models.EmailAccountSyncConfig
	err := r.db.Where("account_id = ?", config.AccountID).First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		// Create new record
		return r.db.Create(config).Error
	}

	// Update existing record
	config.ID = existing.ID
	return r.db.Save(config).Error
}

// RecordSyncStatistics records sync statistics (placeholder for now)
func (r *SyncConfigRepository) RecordSyncStatistics(stats *models.SyncStatistics) error {
	// For now, just update the last sync time
	// In the future, this could store detailed statistics
	if stats != nil && stats.AccountID > 0 {
		return r.UpdateLastSyncTime(stats.AccountID)
	}
	return nil
}

// GetGlobalConfig retrieves global sync configuration
func (r *SyncConfigRepository) GetGlobalConfig() (map[string]interface{}, error) {
	// For now, return default global config
	// In a real implementation, this would be stored in a separate table
	return map[string]interface{}{
		"default_enable_sync":   true,
		"default_sync_interval": 300,
		"default_sync_folders":  []string{"INBOX"},
		"max_sync_workers":      10,
		"max_emails_per_sync":   100,
	}, nil
}

// UpdateGlobalConfig updates global sync configuration
func (r *SyncConfigRepository) UpdateGlobalConfig(config map[string]interface{}) error {
	// For now, this is a no-op
	// In a real implementation, this would update a global config table
	return nil
}

// GetSyncStatistics retrieves sync statistics
func (r *SyncConfigRepository) GetSyncStatistics() (map[string]interface{}, error) {
	// This is already implemented as GetSyncStats
	return r.GetSyncStats()
}

// TemporarySyncConfig operations

// GetTemporaryConfigByAccountID retrieves temporary sync config by account ID
func (r *SyncConfigRepository) GetTemporaryConfigByAccountID(accountID uint) (*models.TemporarySyncConfig, error) {
	var config models.TemporarySyncConfig
	err := r.db.Where("account_id = ? AND expires_at > ?", accountID, time.Now()).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// CreateTemporaryConfig creates a new temporary sync config
func (r *SyncConfigRepository) CreateTemporaryConfig(config *models.TemporarySyncConfig) error {
	// Delete any existing temporary config for this account
	r.db.Where("account_id = ?", config.AccountID).Delete(&models.TemporarySyncConfig{})

	// Create new temporary config
	return r.db.Create(config).Error
}

// DeleteExpiredTemporaryConfigs deletes all expired temporary configs
func (r *SyncConfigRepository) DeleteExpiredTemporaryConfigs() error {
	return r.db.Where("expires_at < ?", time.Now()).Delete(&models.TemporarySyncConfig{}).Error
}

// GetEffectiveSyncConfig returns the effective sync config for an account
// Priority: Temporary Config > User Config > Global Config
func (r *SyncConfigRepository) GetEffectiveSyncConfig(accountID uint) (*models.EmailAccountSyncConfig, error) {
	// First check for temporary config
	tempConfig, err := r.GetTemporaryConfigByAccountID(accountID)
	if err == nil && tempConfig != nil && !tempConfig.IsExpired() {
		// Convert temporary config to regular config format
		return &models.EmailAccountSyncConfig{
			AccountID:      accountID,
			EnableAutoSync: true,
			SyncInterval:   tempConfig.SyncInterval,
			SyncFolders:    tempConfig.SyncFolders,
			SyncStatus:     "idle",
		}, nil
	}

	// Then check for user config
	userConfig, err := r.GetByAccountID(accountID)
	if err == nil && userConfig != nil {
		return userConfig, nil
	}

	// Finally, return global config as EmailAccountSyncConfig
	globalConfig, _ := r.GetGlobalConfig()
	return &models.EmailAccountSyncConfig{
		AccountID:      accountID,
		EnableAutoSync: globalConfig["default_enable_sync"].(bool),
		SyncInterval:   globalConfig["default_sync_interval"].(int),
		SyncFolders:    models.StringSlice(globalConfig["default_sync_folders"].([]string)),
		SyncStatus:     "idle",
	}, nil
}
