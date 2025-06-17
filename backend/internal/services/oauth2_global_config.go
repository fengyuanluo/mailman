package services

import (
	"fmt"
	"mailman/internal/models"
	"mailman/internal/repository"
)

// OAuth2GlobalConfigService handles OAuth2 global configuration business logic
type OAuth2GlobalConfigService struct {
	repo *repository.OAuth2GlobalConfigRepository
}

// NewOAuth2GlobalConfigService creates a new OAuth2GlobalConfigService
func NewOAuth2GlobalConfigService(repo *repository.OAuth2GlobalConfigRepository) *OAuth2GlobalConfigService {
	return &OAuth2GlobalConfigService{
		repo: repo,
	}
}

// CreateOrUpdateConfig creates or updates OAuth2 global configuration
func (s *OAuth2GlobalConfigService) CreateOrUpdateConfig(config *models.OAuth2GlobalConfig) error {
	// Validate required fields
	if config.ProviderType == "" {
		return fmt.Errorf("provider type is required")
	}
	if config.ClientID == "" {
		return fmt.Errorf("client ID is required")
	}
	if config.ClientSecret == "" {
		return fmt.Errorf("client secret is required")
	}
	if config.RedirectURI == "" {
		return fmt.Errorf("redirect URI is required")
	}

	// Set default scopes if not provided
	if len(config.Scopes) == 0 {
		switch config.ProviderType {
		case models.ProviderTypeGmail:
			config.Scopes = models.StringSlice{"https://mail.google.com/"}
		case models.ProviderTypeOutlook:
			config.Scopes = models.StringSlice{"https://outlook.office.com/IMAP.AccessAsUser.All", "offline_access"}
		}
	}

	return s.repo.CreateOrUpdate(config)
}

// GetConfigByProvider retrieves OAuth2 configuration for a specific provider
func (s *OAuth2GlobalConfigService) GetConfigByProvider(providerType models.MailProviderType) (*models.OAuth2GlobalConfig, error) {
	return s.repo.GetByProviderType(providerType)
}

// GetAllConfigs retrieves all OAuth2 configurations
func (s *OAuth2GlobalConfigService) GetAllConfigs() ([]models.OAuth2GlobalConfig, error) {
	return s.repo.GetAll()
}

// GetEnabledConfigs retrieves all enabled OAuth2 configurations
func (s *OAuth2GlobalConfigService) GetEnabledConfigs() ([]models.OAuth2GlobalConfig, error) {
	return s.repo.GetEnabled()
}

// EnableConfig enables OAuth2 configuration for a provider
func (s *OAuth2GlobalConfigService) EnableConfig(providerType models.MailProviderType) error {
	config, err := s.repo.GetByProviderType(providerType)
	if err != nil {
		return err
	}

	config.IsEnabled = true
	return s.repo.Update(config)
}

// DisableConfig disables OAuth2 configuration for a provider
func (s *OAuth2GlobalConfigService) DisableConfig(providerType models.MailProviderType) error {
	config, err := s.repo.GetByProviderType(providerType)
	if err != nil {
		return err
	}

	config.IsEnabled = false
	return s.repo.Update(config)
}

// DeleteConfig deletes OAuth2 configuration for a provider
func (s *OAuth2GlobalConfigService) DeleteConfig(id uint) error {
	return s.repo.Delete(id)
}

// IsProviderEnabled checks if OAuth2 is enabled for a provider
func (s *OAuth2GlobalConfigService) IsProviderEnabled(providerType models.MailProviderType) bool {
	config, err := s.repo.GetByProviderType(providerType)
	if err != nil {
		return false
	}
	return config.IsEnabled
}

// GetProviderConfig gets OAuth2 configuration for generating auth URLs
func (s *OAuth2GlobalConfigService) GetProviderConfig(providerType models.MailProviderType) (*models.OAuth2GlobalConfig, error) {
	config, err := s.repo.GetByProviderType(providerType)
	if err != nil {
		return nil, fmt.Errorf("OAuth2 configuration not found for provider %s", providerType)
	}

	if !config.IsEnabled {
		return nil, fmt.Errorf("OAuth2 is not enabled for provider %s", providerType)
	}

	return config, nil
}
