package repository

import (
	"mailman/internal/models"

	"gorm.io/gorm"
)

// MailboxRepository handles mailbox data operations
type MailboxRepository struct {
	db *gorm.DB
}

// NewMailboxRepository creates a new mailbox repository
func NewMailboxRepository(db *gorm.DB) *MailboxRepository {
	return &MailboxRepository{db: db}
}

// GetByAccountID retrieves all mailboxes for an account
func (r *MailboxRepository) GetByAccountID(accountID uint) ([]models.Mailbox, error) {
	var mailboxes []models.Mailbox
	err := r.db.Where("account_id = ?", accountID).Find(&mailboxes).Error
	return mailboxes, err
}

// SyncMailboxes updates the mailbox list for an account
// It will add new mailboxes, update existing ones, and mark deleted ones
func (r *MailboxRepository) SyncMailboxes(accountID uint, fetchedMailboxes []models.Mailbox) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Get existing mailboxes
		var existingMailboxes []models.Mailbox
		if err := tx.Where("account_id = ?", accountID).Find(&existingMailboxes).Error; err != nil {
			return err
		}

		// Create a map for quick lookup
		existingMap := make(map[string]*models.Mailbox)
		for i := range existingMailboxes {
			existingMap[existingMailboxes[i].Name] = &existingMailboxes[i]
		}

		// Process fetched mailboxes
		fetchedMap := make(map[string]bool)
		for _, mailbox := range fetchedMailboxes {
			fetchedMap[mailbox.Name] = true

			if existing, found := existingMap[mailbox.Name]; found {
				// Update existing mailbox
				existing.Delimiter = mailbox.Delimiter
				existing.Flags = mailbox.Flags
				if err := tx.Save(existing).Error; err != nil {
					return err
				}
			} else {
				// Create new mailbox
				mailbox.AccountID = accountID
				if err := tx.Create(&mailbox).Error; err != nil {
					return err
				}
			}
		}

		// Mark deleted mailboxes (those not in fetched list)
		for _, existing := range existingMailboxes {
			if !fetchedMap[existing.Name] {
				// Add a "deleted" flag to the mailbox
				// We don't actually delete it to preserve history
				if !containsFlag(existing.Flags, "\\Deleted") {
					existing.Flags = append(existing.Flags, "\\Deleted")
					if err := tx.Save(&existing).Error; err != nil {
						return err
					}
				}
			}
		}

		return nil
	})
}

// GetActiveByAccountID retrieves only active (non-deleted) mailboxes
func (r *MailboxRepository) GetActiveByAccountID(accountID uint) ([]models.Mailbox, error) {
	var mailboxes []models.Mailbox
	err := r.db.Where("account_id = ? AND flags NOT LIKE ?", accountID, "%\\\\Deleted%").Find(&mailboxes).Error
	return mailboxes, err
}

// DeleteByAccountID deletes all mailboxes for an account
func (r *MailboxRepository) DeleteByAccountID(accountID uint) error {
	return r.db.Where("account_id = ?", accountID).Delete(&models.Mailbox{}).Error
}

// Helper function to check if a flag exists
func containsFlag(flags models.StringSlice, flag string) bool {
	for _, f := range flags {
		if f == flag {
			return true
		}
	}
	return false
}
