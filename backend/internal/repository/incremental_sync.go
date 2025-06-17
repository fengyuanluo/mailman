package repository

import (
	"mailman/internal/models"
	"time"

	"gorm.io/gorm"
)

// IncrementalSyncRepository handles database operations for incremental sync records
type IncrementalSyncRepository struct {
	db *gorm.DB
}

// NewIncrementalSyncRepository creates a new IncrementalSyncRepository
func NewIncrementalSyncRepository(db *gorm.DB) *IncrementalSyncRepository {
	return &IncrementalSyncRepository{db: db}
}

// GetByAccountAndMailbox retrieves the incremental sync record for a specific account and mailbox
func (r *IncrementalSyncRepository) GetByAccountAndMailbox(accountID uint, mailboxName string) (*models.IncrementalSyncRecord, error) {
	var record models.IncrementalSyncRecord
	err := r.db.Where("account_id = ? AND mailbox_name = ?", accountID, mailboxName).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

// CreateOrUpdate creates a new incremental sync record or updates an existing one
func (r *IncrementalSyncRepository) CreateOrUpdate(record *models.IncrementalSyncRecord) error {
	var existing models.IncrementalSyncRecord
	err := r.db.Where("account_id = ? AND mailbox_name = ?", record.AccountID, record.MailboxName).First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		// Create new record
		return r.db.Create(record).Error
	} else if err != nil {
		return err
	}

	// Update existing record
	existing.LastSyncEndTime = record.LastSyncEndTime
	existing.LastSyncStartTime = record.LastSyncStartTime
	existing.EmailsProcessed = record.EmailsProcessed
	return r.db.Save(&existing).Error
}

// GetAllByAccount retrieves all incremental sync records for a specific account
func (r *IncrementalSyncRepository) GetAllByAccount(accountID uint) ([]models.IncrementalSyncRecord, error) {
	var records []models.IncrementalSyncRecord
	err := r.db.Where("account_id = ?", accountID).Find(&records).Error
	return records, err
}

// Delete removes an incremental sync record
func (r *IncrementalSyncRepository) Delete(accountID uint, mailboxName string) error {
	return r.db.Where("account_id = ? AND mailbox_name = ?", accountID, mailboxName).Delete(&models.IncrementalSyncRecord{}).Error
}

// UpdateLastSyncTime updates only the last sync time for a record
func (r *IncrementalSyncRepository) UpdateLastSyncTime(accountID uint, mailboxName string, startTime, endTime time.Time, emailsProcessed int) error {
	return r.db.Model(&models.IncrementalSyncRecord{}).
		Where("account_id = ? AND mailbox_name = ?", accountID, mailboxName).
		Updates(map[string]interface{}{
			"last_sync_start_time": startTime,
			"last_sync_end_time":   endTime,
			"emails_processed":     emailsProcessed,
			"updated_at":           time.Now(),
		}).Error
}
