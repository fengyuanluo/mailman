package repository

import (
	"errors"
	"mailman/internal/models"

	"gorm.io/gorm"
)

// MailProviderRepository handles database operations for MailProvider
type MailProviderRepository struct {
	db *gorm.DB
}

// NewMailProviderRepository creates a new MailProviderRepository
func NewMailProviderRepository(db *gorm.DB) *MailProviderRepository {
	return &MailProviderRepository{db: db}
}

// Create creates a new mail provider
func (r *MailProviderRepository) Create(provider *models.MailProvider) error {
	return r.db.Create(provider).Error
}

// GetByID retrieves a mail provider by ID
func (r *MailProviderRepository) GetByID(id uint) (*models.MailProvider, error) {
	var provider models.MailProvider
	err := r.db.First(&provider, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("mail provider not found")
		}
		return nil, err
	}
	return &provider, nil
}

// GetByName retrieves a mail provider by name
func (r *MailProviderRepository) GetByName(name string) (*models.MailProvider, error) {
	var provider models.MailProvider
	err := r.db.Where("name = ?", name).First(&provider).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("mail provider not found")
		}
		return nil, err
	}
	return &provider, nil
}

// GetByType retrieves all mail providers of a specific type
func (r *MailProviderRepository) GetByType(providerType models.MailProviderType) ([]models.MailProvider, error) {
	var providers []models.MailProvider
	err := r.db.Where("type = ?", providerType).Find(&providers).Error
	return providers, err
}

// GetAll retrieves all mail providers
func (r *MailProviderRepository) GetAll() ([]models.MailProvider, error) {
	var providers []models.MailProvider
	err := r.db.Find(&providers).Error
	return providers, err
}

// Update updates a mail provider
func (r *MailProviderRepository) Update(provider *models.MailProvider) error {
	return r.db.Save(provider).Error
}

// Delete soft deletes a mail provider
func (r *MailProviderRepository) Delete(id uint) error {
	return r.db.Delete(&models.MailProvider{}, id).Error
}

// SeedDefaultProviders seeds the database with default mail providers
func (r *MailProviderRepository) SeedDefaultProviders() error {
	defaultProviders := []models.MailProvider{
		{
			Name:       "Gmail",
			Type:       models.ProviderTypeGmail,
			IMAPServer: "imap.gmail.com",
			IMAPPort:   993,
			SMTPServer: "smtp.gmail.com",
			SMTPPort:   587,
		},
		{
			Name:       "Outlook",
			Type:       models.ProviderTypeOutlook,
			IMAPServer: "outlook.office365.com",
			IMAPPort:   993,
			SMTPServer: "smtp.office365.com",
			SMTPPort:   587,
		},
		{
			Name:       "Yahoo",
			Type:       models.ProviderTypeCustom,
			IMAPServer: "imap.mail.yahoo.com",
			IMAPPort:   993,
			SMTPServer: "smtp.mail.yahoo.com",
			SMTPPort:   587,
		},
		{
			Name:       "iCloud",
			Type:       models.ProviderTypeCustom,
			IMAPServer: "imap.mail.me.com",
			IMAPPort:   993,
			SMTPServer: "smtp.mail.me.com",
			SMTPPort:   587,
		},
	}

	for _, provider := range defaultProviders {
		// Check if provider already exists
		existing, err := r.GetByName(provider.Name)
		if err == nil && existing != nil {
			continue
		}

		if err := r.Create(&provider); err != nil {
			return err
		}
	}

	return nil
}
