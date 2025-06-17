package api

import (
	"mailman/internal/models"
	"time"
)

// OpenAI Configuration Types

// OpenAIConfigRequest represents the request to create/update OpenAI configuration
type OpenAIConfigRequest struct {
	Name        string            `json:"name" binding:"required"`
	ChannelType string            `json:"channel_type" binding:"required,oneof=openai gemini claude"`
	BaseURL     string            `json:"base_url" binding:"required"`
	APIKey      string            `json:"api_key" binding:"required"`
	Model       string            `json:"model" binding:"required"`
	Headers     map[string]string `json:"headers,omitempty"`
	IsActive    bool              `json:"is_active"`
}

// OpenAIConfigResponse represents the response for OpenAI configuration
type OpenAIConfigResponse struct {
	ID          uint              `json:"id"`
	Name        string            `json:"name"`
	ChannelType string            `json:"channel_type"`
	BaseURL     string            `json:"base_url"`
	APIKey      string            `json:"api_key"` // Will be masked in response
	Model       string            `json:"model"`
	Headers     map[string]string `json:"headers,omitempty"`
	IsActive    bool              `json:"is_active"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// AI Prompt Template Types

// AIPromptTemplateRequest represents the request to create/update AI prompt template
type AIPromptTemplateRequest struct {
	Scenario     string            `json:"scenario" binding:"required"`
	Name         string            `json:"name" binding:"required"`
	Description  string            `json:"description,omitempty"`
	SystemPrompt string            `json:"system_prompt" binding:"required"`
	UserPrompt   string            `json:"user_prompt,omitempty"`
	Variables    map[string]string `json:"variables,omitempty"`
	MaxTokens    int               `json:"max_tokens"`
	Temperature  float64           `json:"temperature"`
	IsActive     bool              `json:"is_active"`
}

// AIPromptTemplateResponse represents the response for AI prompt template
type AIPromptTemplateResponse struct {
	ID           uint              `json:"id"`
	Scenario     string            `json:"scenario"`
	Name         string            `json:"name"`
	Description  string            `json:"description,omitempty"`
	SystemPrompt string            `json:"system_prompt"`
	UserPrompt   string            `json:"user_prompt,omitempty"`
	Variables    map[string]string `json:"variables,omitempty"`
	MaxTokens    int               `json:"max_tokens"`
	Temperature  float64           `json:"temperature"`
	IsActive     bool              `json:"is_active"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
}

// AI Generation Types

// GenerateEmailTemplateRequest represents the request to generate an email template using AI
type GenerateEmailTemplateRequest struct {
	UserInput    string `json:"user_input" binding:"required"`
	Scenario     string `json:"scenario"`
	TemplateName string `json:"template_name" binding:"required"`
	Description  string `json:"description,omitempty"`
}

// GenerateEmailTemplateResponse represents the response for AI-generated email template
type GenerateEmailTemplateResponse struct {
	ID               uint                            `json:"id"`
	Name             string                          `json:"name"`
	Description      string                          `json:"description,omitempty"`
	UserInput        string                          `json:"user_input"`
	GeneratedContent string                          `json:"generated_content"`
	ExtractorConfig  models.ExtractorTemplateConfigs `json:"extractor_config"`
	Model            string                          `json:"model"`
	TokensUsed       int                             `json:"tokens_used"`
	CreatedAt        time.Time                       `json:"created_at"`
}

// CallOpenAIRequest represents the request to call OpenAI API directly
type CallOpenAIRequest struct {
	ConfigID       uint              `json:"config_id" binding:"required"`
	SystemPrompt   string            `json:"system_prompt"`
	UserMessage    string            `json:"user_message" binding:"required"`
	TemplateID     uint              `json:"template_id,omitempty"`
	Variables      map[string]string `json:"variables,omitempty"`
	MaxTokens      int               `json:"max_tokens,omitempty"`
	Temperature    float64           `json:"temperature,omitempty"`
	ResponseFormat string            `json:"response_format,omitempty"` // "text" or "json"
}

// CallOpenAIResponse represents the response from calling OpenAI API
type CallOpenAIResponse struct {
	Content      string  `json:"content"`
	Model        string  `json:"model"`
	TokensUsed   int     `json:"tokens_used"`
	Temperature  float64 `json:"temperature"`
	ResponseType string  `json:"response_type"` // "text" or "json"
}

// TestOpenAIConfigResponse represents the response from testing an OpenAI configuration
type TestOpenAIConfigResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	Response     string `json:"response,omitempty"`
	ResponseTime int64  `json:"response_time_ms"`
	ChannelType  string `json:"channel_type"`
	Model        string `json:"model"`
	TokensUsed   int    `json:"tokens_used,omitempty"`
}

// Helper functions

// MaskAPIKey masks the API key for security
func MaskAPIKey(apiKey string) string {
	if len(apiKey) <= 8 {
		return "****"
	}
	return apiKey[:4] + "****" + apiKey[len(apiKey)-4:]
}

// ConvertOpenAIConfigToResponse converts model to response
func ConvertOpenAIConfigToResponse(config *models.OpenAIConfig) OpenAIConfigResponse {
	headers := make(map[string]string)
	if config.Headers != nil {
		headers = config.Headers
	}

	return OpenAIConfigResponse{
		ID:          config.ID,
		Name:        config.Name,
		ChannelType: string(config.ChannelType),
		BaseURL:     config.BaseURL,
		APIKey:      config.APIKey, // 不再脱敏，直接返回原始API密钥
		Model:       config.Model,
		Headers:     headers,
		IsActive:    config.IsActive,
		CreatedAt:   config.CreatedAt,
		UpdatedAt:   config.UpdatedAt,
	}
}

// ConvertAIPromptTemplateToResponse converts model to response
func ConvertAIPromptTemplateToResponse(template *models.AIPromptTemplate) AIPromptTemplateResponse {
	variables := make(map[string]string)
	if template.Variables != nil {
		variables = template.Variables
	}

	return AIPromptTemplateResponse{
		ID:           template.ID,
		Scenario:     template.Scenario,
		Name:         template.Name,
		Description:  template.Description,
		SystemPrompt: template.SystemPrompt,
		UserPrompt:   template.UserPrompt,
		Variables:    variables,
		MaxTokens:    template.MaxTokens,
		Temperature:  template.Temperature,
		IsActive:     template.IsActive,
		CreatedAt:    template.CreatedAt,
		UpdatedAt:    template.UpdatedAt,
	}
}
