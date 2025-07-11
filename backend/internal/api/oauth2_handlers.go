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
	configService      *services.OAuth2GlobalConfigService
	oauth2Service      *services.OAuth2Service
	authSessionService *services.OAuth2AuthSessionService
}

// NewOAuth2Handler creates a new OAuth2Handler
func NewOAuth2Handler(configService *services.OAuth2GlobalConfigService, oauth2Service *services.OAuth2Service, authSessionService *services.OAuth2AuthSessionService) *OAuth2Handler {
	return &OAuth2Handler{
		configService:      configService,
		oauth2Service:      oauth2Service,
		authSessionService: authSessionService,
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

	// 强制Gmail使用固定scope，不允许用户编辑
	if config.ProviderType == models.ProviderTypeGmail {
		config.Scopes = models.StringSlice{"https://mail.google.com/", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"}
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

// GetGlobalConfigByProvider retrieves OAuth2 global configuration by provider (backward compatibility)
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

// GetGlobalConfigsByProvider retrieves all OAuth2 global configurations by provider type
func (h *OAuth2Handler) GetGlobalConfigsByProvider(w http.ResponseWriter, r *http.Request) {
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

	configs, err := h.configService.GetConfigsByProviderType(mailProviderType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(configs)
}

// GetGlobalConfigByID retrieves OAuth2 global configuration by ID
func (h *OAuth2Handler) GetGlobalConfigByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		http.Error(w, "invalid ID format", http.StatusBadRequest)
		return
	}

	config, err := h.configService.GetConfigByID(uint(id))
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

	// Check for optional config_id parameter
	configIDParam := r.URL.Query().Get("config_id")

	var config *models.OAuth2GlobalConfig
	var err error

	// Priority 1: Use specific config ID if provided (new multi-config support)
	if configIDParam != "" {
		configID, err := strconv.ParseUint(configIDParam, 10, 32)
		if err != nil {
			http.Error(w, "invalid config_id parameter", http.StatusBadRequest)
			return
		}

		config, err = h.configService.GetConfigByID(uint(configID))
		if err != nil {
			http.Error(w, fmt.Sprintf("OAuth2 config not found: %v", err), http.StatusNotFound)
			return
		}

		// Verify config provider type matches
		if config.ProviderType != mailProviderType {
			http.Error(w, fmt.Sprintf("config provider type mismatch: expected %s, got %s", mailProviderType, config.ProviderType), http.StatusBadRequest)
			return
		}
	} else {
		// Priority 2: Fallback to default provider type lookup (backward compatibility)
		config, err = h.configService.GetProviderConfig(mailProviderType)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
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

	if state == "" {
		http.Error(w, "missing state parameter", http.StatusBadRequest)
		return
	}

	// 验证会话状态
	session, err := h.authSessionService.GetSessionByState(state)
	if err != nil {
		fmt.Printf("Failed to get session by state: %v\n", err)
		h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusFailed, "invalid session")
		http.Error(w, "invalid session", http.StatusBadRequest)
		return
	}

	// 检查会话是否已过期
	if session.IsExpired() {
		h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusExpired, "session expired")
		http.Error(w, "session expired", http.StatusGone)
		return
	}

	// 检查会话状态
	if session.Status != models.OAuth2AuthSessionStatusPending {
		http.Error(w, "session already processed", http.StatusConflict)
		return
	}

	var mailProviderType models.MailProviderType
	switch providerType {
	case "gmail":
		mailProviderType = models.ProviderTypeGmail
	case "outlook":
		mailProviderType = models.ProviderTypeOutlook
	default:
		h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusFailed, "unsupported provider type")
		http.Error(w, "unsupported provider type", http.StatusBadRequest)
		return
	}

	// Use the OAuth2 config from the session (which supports multi-config)
	config, err := h.configService.GetConfigByID(session.ProviderID)
	if err != nil {
		h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusFailed, "provider config not found")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Verify the config provider type matches the callback provider type
	if config.ProviderType != mailProviderType {
		h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusFailed, "provider type mismatch")
		http.Error(w, "provider type mismatch", http.StatusBadRequest)
		return
	}

	// 交换授权码获取令牌
	accessToken, refreshToken, err := h.oauth2Service.ExchangeCodeForTokens(
		providerType,
		config.ClientID,
		config.ClientSecret,
		code,
		config.RedirectURI,
	)
	if err != nil {
		h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusFailed, fmt.Sprintf("token exchange failed: %v", err))
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取用户邮箱信息
	var userEmail string
	var userInfo models.JSONMap

	if providerType == "gmail" {
		fmt.Printf("开始获取Gmail用户信息，access_token: %s\n", accessToken[:20]+"...")

		userInfoResp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + accessToken)
		if err != nil {
			fmt.Printf("获取用户信息请求失败: %v\n", err)
			h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusFailed, "failed to get user info")
			http.Error(w, "failed to get user info", http.StatusInternalServerError)
			return
		}
		defer userInfoResp.Body.Close()

		if userInfoResp.StatusCode == 200 {
			var responseData map[string]interface{}
			if err := json.NewDecoder(userInfoResp.Body).Decode(&responseData); err != nil {
				fmt.Printf("解析响应失败: %v\n", err)
				h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusFailed, "failed to parse user info")
				http.Error(w, "failed to parse user info", http.StatusInternalServerError)
				return
			}

			fmt.Printf("API响应数据: %+v\n", responseData)

			// 提取邮箱
			if email, ok := responseData["email"]; ok && email != nil {
				userEmail = email.(string)
				fmt.Printf("从UserInfo API获取邮箱: %s\n", userEmail)
			}

			// 保存完整用户信息，转换为JSONMap格式
			userInfo = make(models.JSONMap)
			for k, v := range responseData {
				if v != nil {
					userInfo[k] = fmt.Sprintf("%v", v)
				}
			}
		} else {
			h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusFailed, "user info API error")
			http.Error(w, "user info API error", http.StatusInternalServerError)
			return
		}
		fmt.Printf("最终获取的邮箱地址: %s\n", userEmail)
	}

	// 更新会话状态为成功，并保存认证数据
	err = h.authSessionService.CompleteAuthFlow(
		state,
		userEmail,
		accessToken,
		refreshToken,
		"Bearer",
		time.Now().Add(time.Hour).Unix(),
		userInfo,
	)
	if err != nil {
		fmt.Printf("Failed to complete auth flow: %v\n", err)
		h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusFailed, "failed to save auth data")
		http.Error(w, "failed to save auth data", http.StatusInternalServerError)
		return
	}

	// 构建前端重定向URL
	frontendUrl := "http://localhost:3000"
	if frontendEnv := r.Header.Get("X-Frontend-URL"); frontendEnv != "" {
		frontendUrl = frontendEnv
	}

	// 重定向到成功页面，携带state参数用于前端轮询获取结果
	callbackUrl := fmt.Sprintf("%s/oauth2/success?state=%s&provider=%s", frontendUrl, state, providerType)

	fmt.Printf("重定向到前端成功页面: %s\n", callbackUrl)
	http.Redirect(w, r, callbackUrl, http.StatusFound)
}

// StartOAuth2Session 创建OAuth2授权会话并返回授权URL
func (h *OAuth2Handler) StartOAuth2Session(w http.ResponseWriter, r *http.Request) {
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

	// 检查是否指定了特定的配置ID
	var config *models.OAuth2GlobalConfig
	var err error

	configIDStr := r.URL.Query().Get("config_id")
	if configIDStr != "" {
		// 通过配置ID获取特定的OAuth2配置
		configID, parseErr := strconv.ParseUint(configIDStr, 10, 32)
		if parseErr != nil {
			http.Error(w, "invalid config_id format", http.StatusBadRequest)
			return
		}

		config, err = h.configService.GetConfigByID(uint(configID))
		if err != nil {
			http.Error(w, fmt.Sprintf("OAuth2 config not found: %v", err), http.StatusNotFound)
			return
		}

		// 验证配置类型是否匹配
		if config.ProviderType != mailProviderType {
			http.Error(w, fmt.Sprintf("config provider type mismatch: expected %s, got %s", mailProviderType, config.ProviderType), http.StatusBadRequest)
			return
		}
	} else {
		// 回退到默认的provider type查找
		config, err = h.configService.GetProviderConfig(mailProviderType)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	// 生成唯一的state参数
	state, err := generateRandomString(32)
	if err != nil {
		http.Error(w, "failed to generate state", http.StatusInternalServerError)
		return
	}

	// 创建授权会话
	session, err := h.authSessionService.CreateSession(uint(config.ID), state, 10) // 10分钟过期
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 生成授权URL
	authURL, err := h.oauth2Service.GenerateAuthURL(providerType, config.ClientID, config.RedirectURI, state)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"session_id": session.ID,
		"state":      state,
		"auth_url":   authURL,
		"expires_at": session.ExpiresAt.Unix(),
	})
}

// PollOAuth2SessionStatus 轮询OAuth2授权会话状态
func (h *OAuth2Handler) PollOAuth2SessionStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	state := vars["state"]

	if state == "" {
		http.Error(w, "state parameter is required", http.StatusBadRequest)
		return
	}

	session, err := h.authSessionService.GetSessionByState(state)
	if err != nil {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	// 检查会话是否过期
	if session.IsExpired() {
		// 更新状态为expired
		h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusExpired, "session expired")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":     "expired",
			"error_msg":  "session expired",
			"expires_at": session.ExpiresAt.Unix(),
		})
		return
	}

	response := map[string]interface{}{
		"status":     string(session.Status),
		"expires_at": session.ExpiresAt.Unix(),
	}

	// 如果授权成功，包含账户信息
	if session.Status == models.OAuth2AuthSessionStatusSuccess {
		response["emailAddress"] = session.EmailAddress
		response["customSettings"] = session.GetCustomSettings()
	}

	// 如果有错误信息，包含错误
	if session.ErrorMsg != "" {
		response["error_msg"] = session.ErrorMsg
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CancelOAuth2Session 取消OAuth2授权会话
func (h *OAuth2Handler) CancelOAuth2Session(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	state := vars["state"]

	if state == "" {
		http.Error(w, "state parameter is required", http.StatusBadRequest)
		return
	}

	err := h.authSessionService.UpdateStatus(state, models.OAuth2AuthSessionStatusCancelled, "user cancelled")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "session cancelled successfully"})
}

// ExchangeToken manually exchanges authorization code for tokens
func (h *OAuth2Handler) ExchangeToken(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Provider    string `json:"provider"`
		Code        string `json:"code"`
		RedirectURI string `json:"redirect_uri"`
		ConfigID    *uint  `json:"config_id,omitempty"` // Optional: specific OAuth2 config to use
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

	var config *models.OAuth2GlobalConfig
	var err error

	// Priority 1: Use specific config ID if provided (new multi-config support)
	if request.ConfigID != nil && *request.ConfigID > 0 {
		config, err = h.configService.GetConfigByID(*request.ConfigID)
		if err != nil {
			http.Error(w, fmt.Sprintf("OAuth2 config not found: %v", err), http.StatusNotFound)
			return
		}

		// Verify config provider type matches
		if config.ProviderType != mailProviderType {
			http.Error(w, fmt.Sprintf("config provider type mismatch: expected %s, got %s", mailProviderType, config.ProviderType), http.StatusBadRequest)
			return
		}
	} else {
		// Priority 2: Fallback to default provider type lookup (backward compatibility)
		config, err = h.configService.GetProviderConfig(mailProviderType)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
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
		ConfigID     *uint  `json:"config_id,omitempty"` // Optional: specific OAuth2 config to use
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

	var config *models.OAuth2GlobalConfig
	var err error

	// Priority 1: Use specific config ID if provided (new multi-config support)
	if request.ConfigID != nil && *request.ConfigID > 0 {
		config, err = h.configService.GetConfigByID(*request.ConfigID)
		if err != nil {
			http.Error(w, fmt.Sprintf("OAuth2 config not found: %v", err), http.StatusNotFound)
			return
		}

		// Verify config provider type matches
		if config.ProviderType != mailProviderType {
			http.Error(w, fmt.Sprintf("config provider type mismatch: expected %s, got %s", mailProviderType, config.ProviderType), http.StatusBadRequest)
			return
		}
	} else {
		// Priority 2: Fallback to default provider type lookup (backward compatibility)
		config, err = h.configService.GetProviderConfig(mailProviderType)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	newAccessToken, err := h.oauth2Service.RefreshAccessTokenForProvider(
		request.Provider,
		config.ClientID,
		config.ClientSecret,
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
