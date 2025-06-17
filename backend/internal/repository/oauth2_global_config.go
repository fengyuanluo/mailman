package repository

import (
	"errors"
	"mailman/internal/models"

	"gorm.io/gorm"
)

// OAuth2GlobalConfigRepository handles database operations for OAuth2GlobalConfig
type OAuth2GlobalConfigRepository struct {
	db *gorm.DB
}

// NewOAuth2GlobalConfigRepository creates a new OAuth2GlobalConfigRepository
func NewOAuth2GlobalConfigRepository(db *gorm.DB) *OAuth2GlobalConfigRepository {
	return &OAuth2GlobalConfigRepository{db: db}
}

// Create creates a new OAuth2 global config
func (r *OAuth2GlobalConfigRepository) Create(config *models.OAuth2GlobalConfig) error {
	return r.db.Create(config).Error
}

// GetByID retrieves an OAuth2 global config by ID
func (r *OAuth2GlobalConfigRepository) GetByID(id uint) (*models.OAuth2GlobalConfig, error) {
	var config models.OAuth2GlobalConfig
	err := r.db.First(&config, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("OAuth2 global config not found")
		}
		return nil, err
	}
	return &config, nil
}

// GetByProviderType retrieves an OAuth2 global config by provider type
func (r *OAuth2GlobalConfigRepository) GetByProviderType(providerType models.MailProviderType) (*models.OAuth2GlobalConfig, error) {
	var config models.OAuth2GlobalConfig
	err := r.db.Where("provider_type = ? AND is_enabled = ?", providerType, true).First(&config).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("OAuth2 global config not found")
		}
		return nil, err
	}
	return &config, nil
}

// GetAll retrieves all OAuth2 global configs
func (r *OAuth2GlobalConfigRepository) GetAll() ([]models.OAuth2GlobalConfig, error) {
	var configs []models.OAuth2GlobalConfig
	err := r.db.Find(&configs).Error
	return configs, err
}

// GetEnabled retrieves all enabled OAuth2 global configs
func (r *OAuth2GlobalConfigRepository) GetEnabled() ([]models.OAuth2GlobalConfig, error) {
	var configs []models.OAuth2GlobalConfig
	err := r.db.Where("is_enabled = ?", true).Find(&configs).Error
	return configs, err
}

// Update updates an OAuth2 global config
func (r *OAuth2GlobalConfigRepository) Update(config *models.OAuth2GlobalConfig) error {
	return r.db.Save(config).Error
}

// Delete soft deletes an OAuth2 global config
func (r *OAuth2GlobalConfigRepository) Delete(id uint) error {
	return r.db.Delete(&models.OAuth2GlobalConfig{}, id).Error
}

// CreateOrUpdate creates or updates an OAuth2 global config for a provider
func (r *OAuth2GlobalConfigRepository) CreateOrUpdate(config *models.OAuth2GlobalConfig) error {
	var existing models.OAuth2GlobalConfig
	err := r.db.Where("provider_type = ?", config.ProviderType).First(&existing).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new
			return r.Create(config)
		}
		return err
	}

	// Update existing
	config.ID = existing.ID
	config.CreatedAt = existing.CreatedAt
	return r.Update(config)
}

// SeedDefaultConfigs seeds the database with default OAuth2 configs
func (r *OAuth2GlobalConfigRepository) SeedDefaultConfigs() error {
	// Check if Gmail config already exists
	_, err := r.GetByProviderType(models.ProviderTypeGmail)
	if err == nil {
		// Already exists, skip seeding
		return nil
	}

	// Create default Gmail config (disabled by default)
	gmailConfig := &models.OAuth2GlobalConfig{
		ProviderType: models.ProviderTypeGmail,
		ClientID:     "",
		ClientSecret: "",
		RedirectURI:  "",
		Scopes:       models.StringSlice{"https://mail.google.com/"},
		IsEnabled:    false,
	}

	return r.Create(gmailConfig)
}
