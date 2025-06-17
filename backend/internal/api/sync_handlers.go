package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"mailman/internal/models"
	"mailman/internal/repository"
	"mailman/internal/services"
	"mailman/internal/utils"

	"github.com/gorilla/mux"
)

// SyncHandlers handles sync configuration related requests
type SyncHandlers struct {
	syncConfigRepo *repository.SyncConfigRepository
	syncManager    services.SyncManager // 使用接口类型代替具体实现
	mailboxRepo    *repository.MailboxRepository
	fetcher        *services.FetcherService
	accountRepo    *repository.EmailAccountRepository
	logger         *utils.Logger
	activityLogger *services.ActivityLogger
}

// NewSyncHandlers creates a new sync handlers instance
func NewSyncHandlers(
	syncConfigRepo *repository.SyncConfigRepository,
	syncManager services.SyncManager, // 使用接口类型代替具体实现
	mailboxRepo *repository.MailboxRepository,
	fetcher *services.FetcherService,
	accountRepo *repository.EmailAccountRepository,
) *SyncHandlers {
	return &SyncHandlers{
		syncConfigRepo: syncConfigRepo,
		syncManager:    syncManager,
		mailboxRepo:    mailboxRepo,
		fetcher:        fetcher,
		accountRepo:    accountRepo,
		logger:         utils.NewLogger("SyncHandlers"),
		activityLogger: services.GetActivityLogger(),
	}
}

// GetAccountMailboxes retrieves all mailboxes for an account
func (h *SyncHandlers) GetAccountMailboxes(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	vars := mux.Vars(r)
	accountIDStr := vars["id"]

	h.logger.Debug("GetAccountMailboxes called for account: %s", accountIDStr)

	accountID, err := strconv.ParseUint(accountIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid account ID: %s, error: %v", accountIDStr, err)
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	// First, try to fetch mailboxes from IMAP server
	// Get the account details first
	h.logger.Debug("Fetching account details for ID: %d", accountID)
	account, err := h.accountRepo.GetByID(uint(accountID))
	if err != nil {
		h.logger.Error("Failed to get account %d: %v", accountID, err)
		http.Error(w, "Failed to get account", http.StatusInternalServerError)
		return
	}

	h.logger.Info("Fetching mailboxes from IMAP server for account: %s", account.EmailAddress)
	fetchedMailboxes, err := h.fetcher.GetMailboxes(*account)
	if err == nil && len(fetchedMailboxes) > 0 {
		h.logger.Info("Fetched %d mailboxes from IMAP server", len(fetchedMailboxes))
		// Sync the fetched mailboxes to database
		if syncErr := h.mailboxRepo.SyncMailboxes(uint(accountID), fetchedMailboxes); syncErr != nil {
			h.logger.Warn("Failed to sync mailboxes to database: %v", syncErr)
		} else {
			h.logger.Debug("Successfully synced mailboxes to database")
		}
	} else if err != nil {
		h.logger.Warn("Failed to fetch mailboxes from IMAP: %v", err)
	}

	// Get mailboxes from database (includes both active and deleted)
	h.logger.Debug("Retrieving mailboxes from database")
	mailboxes, err := h.mailboxRepo.GetByAccountID(uint(accountID))
	if err != nil {
		h.logger.Error("Failed to get mailboxes from database: %v", err)
		http.Error(w, "Failed to get mailboxes", http.StatusInternalServerError)
		return
	}

	h.logger.Debug("Found %d mailboxes in database", len(mailboxes))

	// Format response with mailbox status
	type MailboxResponse struct {
		ID        uint     `json:"id"`
		Name      string   `json:"name"`
		Delimiter string   `json:"delimiter"`
		Flags     []string `json:"flags"`
		IsDeleted bool     `json:"is_deleted"`
	}

	var response []MailboxResponse
	for _, mailbox := range mailboxes {
		isDeleted := false
		for _, flag := range mailbox.Flags {
			if flag == "\\Deleted" {
				isDeleted = true
				break
			}
		}
		response = append(response, MailboxResponse{
			ID:        mailbox.ID,
			Name:      mailbox.Name,
			Delimiter: mailbox.Delimiter,
			Flags:     mailbox.Flags,
			IsDeleted: isDeleted,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("GetAccountMailboxes completed in %v", time.Since(start))
}

// GetAccountSyncConfig retrieves sync configuration for an account
func (h *SyncHandlers) GetAccountSyncConfig(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	vars := mux.Vars(r)
	accountIDStr := vars["id"]

	h.logger.Debug("GetAccountSyncConfig called for account: %s", accountIDStr)

	accountID, err := strconv.ParseUint(accountIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid account ID: %s, error: %v", accountIDStr, err)
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	config, err := h.syncConfigRepo.GetByAccountID(uint(accountID))
	if err != nil {
		// If config not found, create default config
		if err.Error() == "record not found" {
			h.logger.Info("No sync config found for account %d, creating default", accountID)
			if createErr := h.syncConfigRepo.CreateDefaultConfigForAccount(uint(accountID)); createErr != nil {
				h.logger.Error("Failed to create default config: %v", createErr)
				http.Error(w, "Failed to create default config", http.StatusInternalServerError)
				return
			}

			// Retrieve the newly created config
			config, err = h.syncConfigRepo.GetByAccountID(uint(accountID))
			if err != nil {
				h.logger.Error("Failed to retrieve newly created config: %v", err)
				http.Error(w, "Failed to retrieve config", http.StatusInternalServerError)
				return
			}
		} else {
			h.logger.Error("Failed to get config: %v", err)
			http.Error(w, "Failed to get config", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(config); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("GetAccountSyncConfig completed in %v", time.Since(start))
}

// CreateAccountSyncConfig creates a new sync configuration for an account
func (h *SyncHandlers) CreateAccountSyncConfig(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	vars := mux.Vars(r)
	accountIDStr := vars["id"]

	h.logger.Debug("CreateAccountSyncConfig called for account: %s", accountIDStr)
	h.logger.LogHTTPRequest(r, true)

	accountID, err := strconv.ParseUint(accountIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid account ID: %s, error: %v", accountIDStr, err)
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	var req UpdateSyncConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.logger.Debug("Request data: EnableAutoSync=%v, SyncInterval=%v, SyncFolders=%v",
		req.EnableAutoSync, req.SyncInterval, req.SyncFolders)

	// Validate sync interval
	if req.SyncInterval != nil && *req.SyncInterval < 5 {
		h.logger.Warn("Invalid sync interval: %d", *req.SyncInterval)
		http.Error(w, "Sync interval must be at least 5 seconds", http.StatusBadRequest)
		return
	}

	// Validate folders
	if req.SyncFolders != nil && len(req.SyncFolders) == 0 {
		h.logger.Warn("No sync folders specified")
		http.Error(w, "At least one sync folder must be specified", http.StatusBadRequest)
		return
	}

	// Check if config already exists
	_, err = h.syncConfigRepo.GetByAccountID(uint(accountID))
	if err == nil {
		h.logger.Warn("Sync config already exists for account %d", accountID)
		http.Error(w, "Sync config already exists for this account", http.StatusConflict)
		return
	}

	// Create new config
	config := &models.EmailAccountSyncConfig{
		AccountID:      uint(accountID),
		EnableAutoSync: true,
		SyncInterval:   300,
		SyncFolders:    models.StringSlice{"INBOX"},
		SyncStatus:     "idle",
	}

	// Apply request values
	if req.EnableAutoSync != nil {
		config.EnableAutoSync = *req.EnableAutoSync
	}
	if req.SyncInterval != nil {
		config.SyncInterval = *req.SyncInterval
	}
	if req.SyncFolders != nil {
		config.SyncFolders = models.StringSlice(req.SyncFolders)
	}

	h.logger.Info("Creating sync config for account %d: AutoSync=%v, Interval=%d, Folders=%v",
		accountID, config.EnableAutoSync, config.SyncInterval, config.SyncFolders)

	// Save config
	if err := h.syncConfigRepo.CreateOrUpdate(config); err != nil {
		h.logger.ErrorWithStack(err, "Failed to create config")
		http.Error(w, "Failed to create config", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(config); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("CreateAccountSyncConfig completed in %v", time.Since(start))
}

// UpdateAccountSyncConfig updates sync configuration for an account
func (h *SyncHandlers) UpdateAccountSyncConfig(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	vars := mux.Vars(r)
	accountIDStr := vars["id"]

	h.logger.Debug("UpdateAccountSyncConfig called for account: %s", accountIDStr)
	h.logger.LogHTTPRequest(r, true)

	accountID, err := strconv.ParseUint(accountIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid account ID: %s, error: %v", accountIDStr, err)
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	var req UpdateSyncConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.logger.Debug("Update request: EnableAutoSync=%v, SyncInterval=%v, SyncFolders=%v",
		req.EnableAutoSync, req.SyncInterval, req.SyncFolders)

	// Validate sync interval
	if req.SyncInterval != nil && *req.SyncInterval < 5 {
		h.logger.Warn("Invalid sync interval: %d", *req.SyncInterval)
		http.Error(w, "Sync interval must be at least 5 seconds", http.StatusBadRequest)
		return
	}

	// Validate folders
	if req.SyncFolders != nil && len(req.SyncFolders) == 0 {
		h.logger.Warn("No sync folders specified")
		http.Error(w, "At least one sync folder must be specified", http.StatusBadRequest)
		return
	}

	// Get existing config
	config, err := h.syncConfigRepo.GetByAccountID(uint(accountID))
	if err != nil {
		h.logger.Error("Config not found for account %d: %v", accountID, err)
		http.Error(w, "Config not found", http.StatusNotFound)
		return
	}

	h.logger.Debug("Current config: AutoSync=%v, Interval=%d, Folders=%v",
		config.EnableAutoSync, config.SyncInterval, config.SyncFolders)

	// Update fields
	if req.EnableAutoSync != nil {
		config.EnableAutoSync = *req.EnableAutoSync
	}
	if req.SyncInterval != nil {
		config.SyncInterval = *req.SyncInterval
	}
	if req.SyncFolders != nil {
		config.SyncFolders = models.StringSlice(req.SyncFolders)
	}

	h.logger.Info("Updating sync config for account %d: AutoSync=%v, Interval=%d, Folders=%v",
		accountID, config.EnableAutoSync, config.SyncInterval, config.SyncFolders)

	// Save updated config
	if err := h.syncConfigRepo.CreateOrUpdate(config); err != nil {
		h.logger.ErrorWithStack(err, "Failed to update config")
		http.Error(w, "Failed to update config", http.StatusInternalServerError)
		return
	}

	// Update subscription in sync manager
	if err := h.syncManager.UpdateSubscription(uint(accountID), config); err != nil {
		h.logger.Warn("Failed to update subscription in sync manager: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(config); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("UpdateAccountSyncConfig completed in %v", time.Since(start))
}

// DeleteAccountSyncConfig deletes sync configuration for an account
func (h *SyncHandlers) DeleteAccountSyncConfig(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	vars := mux.Vars(r)
	accountIDStr := vars["id"]

	h.logger.Debug("DeleteAccountSyncConfig called for account: %s", accountIDStr)

	accountID, err := strconv.ParseUint(accountIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid account ID: %s, error: %v", accountIDStr, err)
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	// Get the config first to get its ID
	config, err := h.syncConfigRepo.GetByAccountID(uint(accountID))
	if err != nil {
		h.logger.Error("Config not found for account %d: %v", accountID, err)
		http.Error(w, "Config not found", http.StatusNotFound)
		return
	}

	h.logger.Info("Deleting sync config ID %d for account %d", config.ID, accountID)

	// Delete the config by ID
	if err := h.syncConfigRepo.Delete(config.ID); err != nil {
		h.logger.ErrorWithStack(err, "Failed to delete config")
		http.Error(w, "Failed to delete config", http.StatusInternalServerError)
		return
	}

	// Remove from sync manager (if the method exists)
	// For now, we'll just ignore this as the sync manager will handle missing configs

	w.WriteHeader(http.StatusNoContent)
	h.logger.Info("DeleteAccountSyncConfig completed in %v", time.Since(start))
}

// SyncNow triggers immediate sync for an account
func (h *SyncHandlers) SyncNow(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	vars := mux.Vars(r)
	accountIDStr := vars["id"]

	h.logger.Debug("SyncNow called for account: %s", accountIDStr)

	accountID, err := strconv.ParseUint(accountIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid account ID: %s, error: %v", accountIDStr, err)
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	h.logger.Info("Triggering immediate sync for account %d", accountID)

	syncStart := time.Now()
	result, err := h.syncManager.SyncNow(uint(accountID))
	syncDuration := time.Since(syncStart)

	if err != nil {
		h.logger.ErrorWithStack(err, "Sync failed for account %d", accountID)
		http.Error(w, "Sync failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	h.logger.Info("Sync completed for account %d: %d emails synced in %v",
		accountID, result.EmailsSynced, syncDuration)

	// Log activity
	userID := getUserIDFromContext(r)
	if result.EmailsSynced > 0 {
		h.activityLogger.LogSyncActivity(
			models.ActivitySyncCompleted,
			fmt.Sprintf("账户 %d", accountID),
			userID,
			map[string]interface{}{
				"emails_synced": result.EmailsSynced,
				"duration_ms":   syncDuration.Milliseconds(),
			},
		)
	}

	response := SyncNowResponse{
		Success:      true,
		EmailsSynced: result.EmailsSynced,
		Duration:     result.Duration.String(),
	}

	if result.Error != nil {
		response.Success = false
		response.Error = result.Error.Error()
		h.logger.Warn("Sync had errors: %v", result.Error)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("SyncNow handler completed in %v", time.Since(start))
}

// GetGlobalSyncConfig retrieves global sync configuration
func (h *SyncHandlers) GetGlobalSyncConfig(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	h.logger.Debug("GetGlobalSyncConfig called")

	config, err := h.syncConfigRepo.GetGlobalConfig()
	if err != nil {
		h.logger.Error("Failed to get global config: %v", err)
		http.Error(w, "Failed to get global config", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(config); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("GetGlobalSyncConfig completed in %v", time.Since(start))
}

// UpdateGlobalSyncConfig updates global sync configuration
func (h *SyncHandlers) UpdateGlobalSyncConfig(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	h.logger.Debug("UpdateGlobalSyncConfig called")
	h.logger.LogHTTPRequest(r, true)

	var req UpdateGlobalSyncConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate sync interval
	if req.DefaultSyncInterval != nil && *req.DefaultSyncInterval < 5 {
		h.logger.Warn("Invalid sync interval: %d", *req.DefaultSyncInterval)
		http.Error(w, "Sync interval must be at least 5 seconds", http.StatusBadRequest)
		return
	}

	// Validate folders
	if req.DefaultSyncFolders != nil && len(req.DefaultSyncFolders) == 0 {
		h.logger.Warn("No sync folders specified")
		http.Error(w, "At least one sync folder must be specified", http.StatusBadRequest)
		return
	}

	// Get current global config
	globalConfig, err := h.syncConfigRepo.GetGlobalConfig()
	if err != nil {
		h.logger.Error("Failed to get global config: %v", err)
		http.Error(w, "Failed to get global config", http.StatusInternalServerError)
		return
	}

	// Since GetGlobalConfig returns map[string]interface{}, we need to update it
	if req.DefaultEnableSync != nil {
		globalConfig["default_enable_sync"] = *req.DefaultEnableSync
	}
	if req.DefaultSyncInterval != nil {
		globalConfig["default_sync_interval"] = *req.DefaultSyncInterval
	}
	if req.DefaultSyncFolders != nil {
		globalConfig["default_sync_folders"] = req.DefaultSyncFolders
	}
	if req.MaxSyncWorkers != nil && *req.MaxSyncWorkers > 0 {
		globalConfig["max_sync_workers"] = *req.MaxSyncWorkers
	}
	if req.MaxEmailsPerSync != nil && *req.MaxEmailsPerSync > 0 {
		globalConfig["max_emails_per_sync"] = *req.MaxEmailsPerSync
	}

	h.logger.Info("Updating global sync config: %+v", globalConfig)

	// Save updated config
	if err := h.syncConfigRepo.UpdateGlobalConfig(globalConfig); err != nil {
		h.logger.ErrorWithStack(err, "Failed to update global config")
		http.Error(w, "Failed to update global config", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(globalConfig); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("UpdateGlobalSyncConfig completed in %v", time.Since(start))
}

// GetSyncStatistics retrieves sync statistics for an account
func (h *SyncHandlers) GetSyncStatistics(w http.ResponseWriter, r *http.Request) {
	h.logger.Debug("GetSyncStatistics called - not implemented yet")

	// TODO: Implement this properly
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Not implemented yet",
	})
}

// GetAllSyncConfigs retrieves all sync configurations with pagination
func (h *SyncHandlers) GetAllSyncConfigs(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	h.logger.Debug("GetAllSyncConfigs called")

	// Parse query parameters
	page := 1
	limit := 20
	search := r.URL.Query().Get("search")
	status := r.URL.Query().Get("status")

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	h.logger.Debug("Query params: page=%d, limit=%d, search=%s, status=%s", page, limit, search, status)

	// Get total count and configs
	totalCount, configs, err := h.syncConfigRepo.GetAllWithPagination(page, limit, search)
	if err != nil {
		h.logger.Error("Failed to get sync configs: %v", err)
		http.Error(w, "Failed to get sync configs", http.StatusInternalServerError)
		return
	}

	// Filter by status if provided
	if status != "" && status != "all" {
		var filteredConfigs []models.EmailAccountSyncConfig
		for _, config := range configs {
			if config.SyncStatus == status {
				filteredConfigs = append(filteredConfigs, config)
			}
		}
		configs = filteredConfigs
		h.logger.Debug("Filtered configs by status '%s': %d results", status, len(configs))
	}

	// Calculate pagination info
	totalPages := (totalCount + limit - 1) / limit

	response := GetAllSyncConfigsResponse{
		Configs:     configs,
		TotalCount:  totalCount,
		Page:        page,
		Limit:       limit,
		TotalPages:  totalPages,
		HasNext:     page < totalPages,
		HasPrevious: page > 1,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("GetAllSyncConfigs completed in %v: returned %d configs", time.Since(start), len(configs))
}

// CreateTemporarySyncConfig creates a temporary sync configuration for an account
func (h *SyncHandlers) CreateTemporarySyncConfig(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	vars := mux.Vars(r)
	accountIDStr := vars["id"]

	h.logger.Debug("CreateTemporarySyncConfig called for account: %s", accountIDStr)
	h.logger.LogHTTPRequest(r, true)

	accountID, err := strconv.ParseUint(accountIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid account ID: %s, error: %v", accountIDStr, err)
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	var req CreateTemporarySyncConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate sync interval
	if req.SyncInterval < 1 {
		req.SyncInterval = 5 // Default to 5 seconds
	}

	// Validate folders
	if len(req.SyncFolders) == 0 {
		req.SyncFolders = []string{"INBOX"} // Default to INBOX
	}

	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(req.DurationMinutes) * time.Minute)
	if req.DurationMinutes <= 0 {
		expiresAt = time.Now().Add(30 * time.Minute) // Default to 30 minutes
	}

	// Create temporary config
	tempConfig := &models.TemporarySyncConfig{
		AccountID:    uint(accountID),
		SyncInterval: req.SyncInterval,
		SyncFolders:  models.StringSlice(req.SyncFolders),
		ExpiresAt:    expiresAt,
	}

	h.logger.Info("Creating temporary sync config for account %d: Interval=%d, Folders=%v, ExpiresAt=%v",
		accountID, tempConfig.SyncInterval, tempConfig.SyncFolders, tempConfig.ExpiresAt)

	// Save temporary config
	if err := h.syncConfigRepo.CreateTemporaryConfig(tempConfig); err != nil {
		h.logger.ErrorWithStack(err, "Failed to create temporary config")
		http.Error(w, "Failed to create temporary config", http.StatusInternalServerError)
		return
	}

	// Update subscription in sync manager with the effective config
	effectiveConfig, err := h.syncConfigRepo.GetEffectiveSyncConfig(uint(accountID))
	if err == nil && effectiveConfig != nil {
		if err := h.syncManager.UpdateSubscription(uint(accountID), effectiveConfig); err != nil {
			h.logger.Warn("Failed to update subscription in sync manager: %v", err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(tempConfig); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("CreateTemporarySyncConfig completed in %v", time.Since(start))
}

// GetEffectiveSyncConfig retrieves the effective sync configuration for an account
func (h *SyncHandlers) GetEffectiveSyncConfig(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	vars := mux.Vars(r)
	accountIDStr := vars["id"]

	h.logger.Debug("GetEffectiveSyncConfig called for account: %s", accountIDStr)

	accountID, err := strconv.ParseUint(accountIDStr, 10, 32)
	if err != nil {
		h.logger.Error("Invalid account ID: %s, error: %v", accountIDStr, err)
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	config, err := h.syncConfigRepo.GetEffectiveSyncConfig(uint(accountID))
	if err != nil {
		h.logger.Error("Failed to get effective config: %v", err)
		http.Error(w, "Failed to get effective config", http.StatusInternalServerError)
		return
	}

	// Add a flag to indicate if this is a temporary config
	response := map[string]interface{}{
		"config":       config,
		"is_temporary": false,
	}

	// Check if there's an active temporary config
	tempConfig, err := h.syncConfigRepo.GetTemporaryConfigByAccountID(uint(accountID))
	if err == nil && tempConfig != nil && !tempConfig.IsExpired() {
		response["is_temporary"] = true
		response["expires_at"] = tempConfig.ExpiresAt
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.logger.Error("Failed to encode response: %v", err)
	}

	h.logger.Info("GetEffectiveSyncConfig completed in %v", time.Since(start))
}

// Request/Response types

type UpdateSyncConfigRequest struct {
	EnableAutoSync *bool    `json:"enable_auto_sync,omitempty"`
	SyncInterval   *int     `json:"sync_interval,omitempty"`
	SyncFolders    []string `json:"sync_folders,omitempty"`
}

type CreateTemporarySyncConfigRequest struct {
	SyncInterval    int      `json:"sync_interval"`
	SyncFolders     []string `json:"sync_folders"`
	DurationMinutes int      `json:"duration_minutes"`
}

type UpdateGlobalSyncConfigRequest struct {
	DefaultEnableSync   *bool    `json:"default_enable_sync,omitempty"`
	DefaultSyncInterval *int     `json:"default_sync_interval,omitempty"`
	DefaultSyncFolders  []string `json:"default_sync_folders,omitempty"`
	MaxSyncWorkers      *int     `json:"max_sync_workers,omitempty"`
	MaxEmailsPerSync    *int     `json:"max_emails_per_sync,omitempty"`
}

type SyncNowResponse struct {
	Success      bool   `json:"success"`
	EmailsSynced int    `json:"emails_synced"`
	Duration     string `json:"duration"`
	Error        string `json:"error,omitempty"`
}

type SyncStatisticsResponse struct {
	AccountID         uint                    `json:"account_id"`
	Days              int                     `json:"days"`
	TotalEmailsSynced int                     `json:"total_emails_synced"`
	TotalErrors       int                     `json:"total_errors"`
	AverageDurationMs int                     `json:"average_duration_ms"`
	DailyStats        []models.SyncStatistics `json:"daily_stats"`
}

type GetAllSyncConfigsResponse struct {
	Configs     []models.EmailAccountSyncConfig `json:"configs"`
	TotalCount  int                             `json:"total_count"`
	Page        int                             `json:"page"`
	Limit       int                             `json:"limit"`
	TotalPages  int                             `json:"total_pages"`
	HasNext     bool                            `json:"has_next"`
	HasPrevious bool                            `json:"has_previous"`
}
