package services

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/emersion/go-sasl"
)

// OAuth2Config represents OAuth2 configuration
type OAuth2Config struct {
	ClientID     string
	ClientSecret string
	RefreshToken string
	AccessToken  string
	TokenURL     string
}

// OAuth2Service handles OAuth2 authentication
type OAuth2Service struct {
	httpClient *http.Client
}

// NewOAuth2Service creates a new OAuth2Service
func NewOAuth2Service() *OAuth2Service {
	return &OAuth2Service{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// RefreshAccessToken refreshes the access token using refresh token (legacy method for Outlook)
func (s *OAuth2Service) RefreshAccessToken(clientID, refreshToken string) (string, error) {
	// Legacy method - assumes empty client_secret for backward compatibility
	return s.RefreshAccessTokenForProvider("outlook", clientID, "", refreshToken)
}

// RefreshAccessTokenForProvider refreshes the access token for a specific provider
func (s *OAuth2Service) RefreshAccessTokenForProvider(providerType string, clientID, clientSecret, refreshToken string) (string, error) {
	var tokenURL, scope string

	switch providerType {
	case "gmail":
		tokenURL = "https://oauth2.googleapis.com/token"
		scope = "https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
	case "outlook":
		tokenURL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
		scope = "https://outlook.office.com/IMAP.AccessAsUser.All offline_access"
	default:
		return "", fmt.Errorf("unsupported provider type: %s", providerType)
	}

	// Log the request for debugging (hide sensitive data)
	fmt.Printf("OAuth2: Refreshing token for provider: %s, client_id: %s\n", providerType, clientID)
	fmt.Printf("OAuth2: Refresh token length: %d\n", len(refreshToken))

	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)
	data.Set("scope", scope)

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to refresh token: %w", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	// Log response status for debugging
	fmt.Printf("OAuth2: Response status: %d\n", resp.StatusCode)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		// Log raw response if JSON parsing fails
		fmt.Printf("OAuth2: Failed to parse JSON. Raw response: %s\n", string(body))
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if errorMsg, ok := result["error"]; ok {
		errorDesc, _ := result["error_description"].(string)
		errorCodes, _ := result["error_codes"].([]interface{})
		correlationId, _ := result["correlation_id"].(string)

		// Provide detailed error information
		errInfo := fmt.Sprintf("OAuth2 error: %v - %s", errorMsg, errorDesc)
		if len(errorCodes) > 0 {
			errInfo += fmt.Sprintf(" (Error codes: %v)", errorCodes)
		}
		if correlationId != "" {
			errInfo += fmt.Sprintf(" (Correlation ID: %s)", correlationId)
		}

		// Common error explanations
		if errorMsg == "invalid_grant" {
			errInfo += "\nPossible causes: 1) Refresh token expired 2) Token already used 3) Invalid client_id 4) User revoked permissions"
		}

		return "", fmt.Errorf(errInfo)
	}

	accessToken, ok := result["access_token"].(string)
	if !ok {
		// Log the entire response for debugging
		fmt.Printf("OAuth2: No access_token in response. Full response: %+v\n", result)
		return "", fmt.Errorf("access_token not found in response")
	}

	fmt.Printf("OAuth2: Successfully obtained access token (length: %d)\n", len(accessToken))
	return accessToken, nil
}

// GenerateAuthURL generates OAuth2 authorization URL for a provider
func (s *OAuth2Service) GenerateAuthURL(providerType string, clientID, redirectURI, state string) (string, error) {
	var authURL, scope string

	switch providerType {
	case "gmail":
		authURL = "https://accounts.google.com/o/oauth2/auth"
		scope = "https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
	case "outlook":
		authURL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
		scope = "https://outlook.office.com/IMAP.AccessAsUser.All offline_access"
	default:
		return "", fmt.Errorf("unsupported provider type: %s", providerType)
	}

	params := url.Values{}
	params.Set("client_id", clientID)
	params.Set("redirect_uri", redirectURI)
	params.Set("response_type", "code")
	params.Set("scope", scope)
	params.Set("state", state)
	params.Set("access_type", "offline")
	params.Set("prompt", "consent")

	return fmt.Sprintf("%s?%s", authURL, params.Encode()), nil
}

// ExchangeCodeForTokens exchanges authorization code for tokens
func (s *OAuth2Service) ExchangeCodeForTokens(providerType, clientID, clientSecret, code, redirectURI string) (accessToken, refreshToken string, err error) {
	var tokenURL string

	switch providerType {
	case "gmail":
		tokenURL = "https://oauth2.googleapis.com/token"
	case "outlook":
		tokenURL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
	default:
		return "", "", fmt.Errorf("unsupported provider type: %s", providerType)
	}

	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("redirect_uri", redirectURI)

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to exchange code: %w", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("failed to read response: %w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", fmt.Errorf("failed to parse response: %w", err)
	}

	if errorMsg, ok := result["error"]; ok {
		errorDesc, _ := result["error_description"].(string)
		return "", "", fmt.Errorf("OAuth2 error: %v - %s", errorMsg, errorDesc)
	}

	accessToken, ok := result["access_token"].(string)
	if !ok {
		return "", "", fmt.Errorf("access_token not found in response")
	}

	refreshToken, ok = result["refresh_token"].(string)
	if !ok {
		return "", "", fmt.Errorf("refresh_token not found in response")
	}

	return accessToken, refreshToken, nil
}

// GenerateOAuth2AuthString generates the OAuth2 authentication string for IMAP
func (s *OAuth2Service) GenerateOAuth2AuthString(email, accessToken string) string {
	authString := fmt.Sprintf("user=%s\x01auth=Bearer %s\x01\x01", email, accessToken)
	return base64.StdEncoding.EncodeToString([]byte(authString))
}

// OAuth2SASLClient implements the SASL XOAUTH2 mechanism
type OAuth2SASLClient struct {
	email       string
	accessToken string
}

// NewOAuth2SASLClient creates a new OAuth2 SASL client
func NewOAuth2SASLClient(email, accessToken string) sasl.Client {
	return &OAuth2SASLClient{
		email:       email,
		accessToken: accessToken,
	}
}

// Start begins the SASL authentication
func (c *OAuth2SASLClient) Start() (mech string, ir []byte, err error) {
	mech = "XOAUTH2"
	ir = []byte(fmt.Sprintf("user=%s\x01auth=Bearer %s\x01\x01", c.email, c.accessToken))
	fmt.Printf("OAuth2 SASL: Starting authentication for %s\n", c.email)
	fmt.Printf("OAuth2 SASL: Access token length: %d\n", len(c.accessToken))
	fmt.Printf("OAuth2 SASL: Initial response length: %d\n", len(ir))
	return
}

// Next continues the SASL authentication
func (c *OAuth2SASLClient) Next(challenge []byte) (response []byte, err error) {
	fmt.Printf("OAuth2 SASL: Next called with challenge length: %d\n", len(challenge))
	if len(challenge) > 0 {
		fmt.Printf("OAuth2 SASL: Challenge content: %s\n", string(challenge))
	}
	// OAuth2 doesn't require additional steps
	return nil, nil
}
