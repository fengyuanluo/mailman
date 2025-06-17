package api

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"time"

	"mailman/internal/models"
	"mailman/internal/services"

	"github.com/gorilla/mux"
)

// OAuth2Handler handles OAuth2 related API endpoints
type OAuth2Handler struct {
	configService *services.OAuth2GlobalConfigService
	oauth2Service *services.OAuth2Service
}

// NewOAuth2Handler creates a new OAuth2Handler
func NewOAuth2Handler(configService *services.OAuth2GlobalConfigService, oauth2Service *services.OAuth2Service) *OAuth2Handler {
	return &OAuth2Handler{
		configService: configService,
		oauth2Service: oauth2Service,
	}
}

// generateRandomString generates a random string for state parameter
func generateRandomString(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)

	for i := range result {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		result[i] = charset[num.Int64()]
	}

	return string(result), nil
}

// CreateOrUpdateGlobalConfig creates or updates OAuth2 global configuration
func (h *OAuth2Handler) CreateOrUpdateGlobalConfig(w http.ResponseWriter, r *http.Request) {
	var config models.OAuth2GlobalConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.configService.CreateOrUpdateConfig(&config); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

// GetGlobalConfigs retrieves all OAuth2 global configurations
func (h *OAuth2Handler) GetGlobalConfigs(w http.ResponseWriter, r *http.Request) {
	configs, err := h.configService.GetAllConfigs()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(configs)
}

// GetGlobalConfigByProvider retrieves OAuth2 global configuration by provider
func (h *OAuth2Handler) GetGlobalConfigByProvider(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	providerType := vars["provider"]

	var mailProviderType models.MailProviderType
	switch providerType {
	case "gmail":
		mailProviderType = models.ProviderTypeGmail
	case "outlook":
		mailProviderType = models.ProviderTypeOutlook
	default:
		http.Error(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	config, err := h.configService.GetConfigByProvider(mailProviderType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

// EnableProvider enables OAuth2 for a provider
func (h *OAuth2Handler) EnableProvider(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	providerType := vars["provider"]

	var mailProviderType models.MailProviderType
	switch providerType {
	case "gmail":
		mailProviderType = models.ProviderTypeGmail
	case "outlook":
		mailProviderType = models.ProviderTypeOutlook
	default:
		http.Error(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	if err := h.configService.EnableConfig(mailProviderType); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "provider enabled successfully"})
}

// DisableProvider disables OAuth2 for a provider
func (h *OAuth2Handler) DisableProvider(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	providerType := vars["provider"]

	var mailProviderType models.MailProviderType
	switch providerType {
	case "gmail":
		mailProviderType = models.ProviderTypeGmail
	case "outlook":
		mailProviderType = models.ProviderTypeOutlook
	default:
		http.Error(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	if err := h.configService.DisableConfig(mailProviderType); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "provider disabled successfully"})
}

// DeleteGlobalConfig deletes OAuth2 global configuration
func (h *OAuth2Handler) DeleteGlobalConfig(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if err := h.configService.DeleteConfig(uint(id)); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "configuration deleted successfully"})
}

// GetAuthURL generates OAuth2 authorization URL
func (h *OAuth2Handler) GetAuthURL(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	providerType := vars["provider"]

	var mailProviderType models.MailProviderType
	switch providerType {
	case "gmail":
		mailProviderType = models.ProviderTypeGmail
	case "outlook":
		mailProviderType = models.ProviderTypeOutlook
	default:
		http.Error(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	config, err := h.configService.GetProviderConfig(mailProviderType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Generate state for security
	state, err := generateRandomString(32)
	if err != nil {
		http.Error(w, "failed to generate state", http.StatusInternalServerError)
		return
	}

	// Store state in cookie (simplified version)
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth2_state",
		Value:    state,
		MaxAge:   3600,
		Path:     "/",
		HttpOnly: true,
	})

	authURL, err := h.oauth2Service.GenerateAuthURL(providerType, config.ClientID, config.RedirectURI, state)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"auth_url": authURL,
		"state":    state,
	})
}

// HandleCallback handles OAuth2 callback
func (h *OAuth2Handler) HandleCallback(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	providerType := vars["provider"]
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	// Verify state
	stateCookie, err := r.Cookie("oauth2_state")
	if err != nil || stateCookie.Value != state {
		http.Error(w, "invalid state parameter", http.StatusBadRequest)
		return
	}

	// Clear state cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "oauth2_state",
		Value:  "",
		MaxAge: -1,
		Path:   "/",
	})

	var mailProviderType models.MailProviderType
	switch providerType {
	case "gmail":
		mailProviderType = models.ProviderTypeGmail
	case "outlook":
		mailProviderType = models.ProviderTypeOutlook
	default:
		http.Error(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	config, err := h.configService.GetProviderConfig(mailProviderType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	accessToken, refreshToken, err := h.oauth2Service.ExchangeCodeForTokens(
		providerType,
		config.ClientID,
		config.ClientSecret,
		code,
		config.RedirectURI,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 构建前端重定向URL，包含token信息
	frontendUrl := "http://localhost:3000" // 可以从环境变量获取
	if frontendEnv := r.Header.Get("X-Frontend-URL"); frontendEnv != "" {
		frontendUrl = frontendEnv
	}

	// 创建回调URL，将token信息作为查询参数传递
	callbackUrl := fmt.Sprintf("%s/oauth2/success?provider=%s&access_token=%s&refresh_token=%s&expires_at=%d",
		frontendUrl,
		providerType,
		accessToken,
		refreshToken,
		time.Now().Add(time.Hour).Unix(),
	)

	// 重定向到前端
	http.Redirect(w, r, callbackUrl, http.StatusFound)
}

// ExchangeToken manually exchanges authorization code for tokens
func (h *OAuth2Handler) ExchangeToken(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Provider    string `json:"provider"`
		Code        string `json:"code"`
		RedirectURI string `json:"redirect_uri"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if request.Provider == "" || request.Code == "" {
		http.Error(w, "provider and code are required", http.StatusBadRequest)
		return
	}

	var mailProviderType models.MailProviderType
	switch request.Provider {
	case "gmail":
		mailProviderType = models.ProviderTypeGmail
	case "outlook":
		mailProviderType = models.ProviderTypeOutlook
	default:
		http.Error(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	config, err := h.configService.GetProviderConfig(mailProviderType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	redirectURI := request.RedirectURI
	if redirectURI == "" {
		redirectURI = config.RedirectURI
	}

	accessToken, refreshToken, err := h.oauth2Service.ExchangeCodeForTokens(
		request.Provider,
		config.ClientID,
		config.ClientSecret,
		request.Code,
		redirectURI,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"provider":      request.Provider,
		"expires_at":    time.Now().Add(time.Hour).Unix(),
	})
}

// RefreshTokenHandler refreshes access token using refresh token
func (h *OAuth2Handler) RefreshTokenHandler(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Provider     string `json:"provider"`
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if request.Provider == "" || request.RefreshToken == "" {
		http.Error(w, "provider and refresh_token are required", http.StatusBadRequest)
		return
	}

	var mailProviderType models.MailProviderType
	switch request.Provider {
	case "gmail":
		mailProviderType = models.ProviderTypeGmail
	case "outlook":
		mailProviderType = models.ProviderTypeOutlook
	default:
		http.Error(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	config, err := h.configService.GetProviderConfig(mailProviderType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	newAccessToken, err := h.oauth2Service.RefreshAccessTokenForProvider(
		request.Provider,
		config.ClientID,
		request.RefreshToken,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token":  newAccessToken,
		"refresh_token": request.RefreshToken, // 重用原始刷新令牌
		"provider":      request.Provider,
		"expires_at":    time.Now().Add(time.Hour).Unix(),
	})
}
