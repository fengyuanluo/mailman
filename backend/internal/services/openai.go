package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mailman/internal/models"
	"net/http"
	"strings"
	"time"
)

// OpenAIService handles interactions with OpenAI API
type OpenAIService struct {
	*BaseAIService
}

// NewOpenAIService creates a new OpenAI service instance (deprecated, use NewAIProvider)
func NewOpenAIService(config *models.OpenAIConfig) *OpenAIService {
	return &OpenAIService{
		BaseAIService: &BaseAIService{
			Config: config,
			Client: &http.Client{
				Timeout: 240 * time.Second,
			},
		},
	}
}

// ChatCompletionRequest represents the request structure for OpenAI chat completion
type ChatCompletionRequest struct {
	Model       string                  `json:"model"`
	Messages    []ChatCompletionMessage `json:"messages"`
	Temperature float64                 `json:"temperature,omitempty"`
	MaxTokens   int                     `json:"max_tokens,omitempty"`
}

// ChatCompletionMessage represents a message in the chat completion
type ChatCompletionMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Message is an alias for ChatCompletionMessage for backward compatibility
type Message = ChatCompletionMessage

// ChatCompletionResponse represents the response from OpenAI
type ChatCompletionResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// GenerateEmailTemplate generates an email extraction template using AI
func (s *OpenAIService) GenerateEmailTemplate(systemPrompt, userInput string, maxTokens int, temperature float64) (*ChatCompletionResponse, error) {
	if s.Config == nil || s.Config.APIKey == "" {
		return nil, fmt.Errorf("OpenAI configuration is not set or API key is missing")
	}

	// Prepare the request
	reqBody := ChatCompletionRequest{
		Model: s.Config.Model,
		Messages: []ChatCompletionMessage{
			{
				Role:    "system",
				Content: systemPrompt,
			},
			{
				Role:    "user",
				Content: userInput,
			},
		},
		Temperature: temperature,
		MaxTokens:   maxTokens,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create the HTTP request
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/chat/completions", strings.TrimSuffix(s.Config.BaseURL, "/")), bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.Config.APIKey))

	// Add custom headers if any
	if s.Config.Headers != nil {
		for key, value := range s.Config.Headers {
			req.Header.Set(key, value)
		}
	}

	// Debug: Log request body
	fmt.Printf("[OpenAI DEBUG] Request Body: %s\n", string(jsonData))

	// Send the request
	// Debug: Before sending request in GenerateEmailTemplate
	fmt.Printf("[OpenAI DEBUG] GenerateEmailTemplate: About to call s.Client.Do(req) - Time: %s\n", time.Now().Format("15:04:05.000"))
	fmt.Printf("[OpenAI DEBUG] Request URL: %s\n", req.URL.String())
	resp, err := s.Client.Do(req)
	fmt.Printf("[OpenAI DEBUG] GenerateEmailTemplate: s.client.Do(req) returned - Time: %s\n", time.Now().Format("15:04:05.000"))
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read the response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		var errorResp map[string]interface{}
		if err := json.Unmarshal(body, &errorResp); err == nil {
			if errorMsg, ok := errorResp["error"].(map[string]interface{}); ok {
				return nil, fmt.Errorf("OpenAI API error: %v", errorMsg["message"])
			}
		}
		return nil, fmt.Errorf("OpenAI API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	// Parse the response
	var completionResp ChatCompletionResponse
	if err := json.Unmarshal(body, &completionResp); err != nil {
		// Log the actual response body for debugging
		fmt.Printf("[OpenAI DEBUG] Failed to parse response. Status: %d, Body: %s\n", resp.StatusCode, string(body))
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &completionResp, nil
}

// CallAI implements the AIProvider interface
func (s *OpenAIService) CallAI(messages []Message, maxTokens int, temperature float64) (*ChatCompletionResponse, error) {
	return s.CallOpenAI(messages, maxTokens, temperature)
}

// CallOpenAI is a generic method to call OpenAI API with custom messages
func (s *OpenAIService) CallOpenAI(messages []Message, maxTokens int, temperature float64) (*ChatCompletionResponse, error) {
	if s.Config == nil || s.Config.APIKey == "" {
		return nil, fmt.Errorf("OpenAI configuration is not set or API key is missing")
	}

	// Prepare the request
	reqBody := ChatCompletionRequest{
		Model:       s.Config.Model,
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create the HTTP request
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/chat/completions", strings.TrimSuffix(s.Config.BaseURL, "/")), bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.Config.APIKey))

	// Add custom headers if any
	if s.Config.Headers != nil {
		for key, value := range s.Config.Headers {
			req.Header.Set(key, value)
		}
	}

	// Debug: Log request body
	fmt.Printf("[OpenAI DEBUG] Request Body: %s\n", string(jsonData))

	// Send the request
	// Debug: Before sending request
	fmt.Printf("[OpenAI DEBUG] About to call s.Client.Do(req) at line 183 - Time: %s\n", time.Now().Format("15:04:05.000"))
	fmt.Printf("[OpenAI DEBUG] Request URL: %s\n", req.URL.String())
	fmt.Printf("[OpenAI DEBUG] Client timeout: %v\n", s.Client.Timeout)
	resp, err := s.Client.Do(req)
	fmt.Printf("[OpenAI DEBUG] s.client.Do(req) returned - Time: %s\n", time.Now().Format("15:04:05.000"))
	fmt.Printf("[OpenAI DEBUG] Error: %v, Response: %v\n", err, resp != nil)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Debug: Check response headers
	fmt.Printf("[OpenAI DEBUG] Response Status: %d\n", resp.StatusCode)
	fmt.Printf("[OpenAI DEBUG] Response Content-Type: %s\n", resp.Header.Get("Content-Type"))
	fmt.Printf("[OpenAI DEBUG] Response Headers: %v\n", resp.Header)

	// Read the response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Debug: Log response body (first 500 chars)
	bodyPreview := string(body)
	if len(bodyPreview) > 500 {
		bodyPreview = bodyPreview[:500] + "..."
	}
	fmt.Printf("[OpenAI DEBUG] Response Body Preview: %s\n", bodyPreview)

	// Check if response is HTML (error page)
	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "text/html") {
		return nil, fmt.Errorf("received HTML response instead of JSON. This might indicate an authentication error or wrong endpoint. Status: %d", resp.StatusCode)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		var errorResp map[string]interface{}
		if err := json.Unmarshal(body, &errorResp); err == nil {
			if errorMsg, ok := errorResp["error"].(map[string]interface{}); ok {
				return nil, fmt.Errorf("OpenAI API error: %v", errorMsg["message"])
			}
		}
		return nil, fmt.Errorf("OpenAI API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	// Use HandleAPIResponse to handle both streaming and non-streaming responses
	completionResp, err := HandleAPIResponse(resp, body)
	if err != nil {
		// Log the actual response body for debugging
		fmt.Printf("[OpenAI DEBUG] Failed to parse response. Status: %d, Body: %s\n", resp.StatusCode, string(body))
		return nil, err
	}

	return completionResp, nil
}

// ParseExtractorTemplate parses AI-generated content into ExtractorTemplateConfig
func (s *OpenAIService) ParseExtractorTemplate(content string) (models.ExtractorTemplateConfigs, error) {
	// Try to parse the content as JSON
	var configs models.ExtractorTemplateConfigs

	// First, try to find JSON content in the response
	startIdx := strings.Index(content, "[")
	endIdx := strings.LastIndex(content, "]")

	if startIdx != -1 && endIdx != -1 && endIdx > startIdx {
		jsonContent := content[startIdx : endIdx+1]
		if err := json.Unmarshal([]byte(jsonContent), &configs); err != nil {
			return nil, fmt.Errorf("failed to parse extractor configuration: %w", err)
		}
		return configs, nil
	}

	return nil, fmt.Errorf("no valid JSON configuration found in the response")
}
