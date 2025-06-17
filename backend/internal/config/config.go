package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	OpenAI   OpenAIConfig
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	Host string
	Port string
}

// DatabaseConfig holds database-related configuration
type DatabaseConfig struct {
	Driver   string
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// OpenAIConfig holds OpenAI-related configuration
type OpenAIConfig struct {
	BaseURL     string
	APIKey      string
	Model       string
	MaxTokens   int
	Temperature float64
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Host: getEnv("SERVER_HOST", "localhost"),
			Port: getEnv("SERVER_PORT", "8080"),
		},
		Database: DatabaseConfig{
			Driver:   getEnv("DB_DRIVER", "sqlite"),
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "mailman"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "mailman.db"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		OpenAI: OpenAIConfig{
			BaseURL:     getEnv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
			APIKey:      getEnv("OPENAI_API_KEY", ""),
			Model:       getEnv("OPENAI_MODEL", "gpt-3.5-turbo"),
			MaxTokens:   getEnvAsInt("OPENAI_MAX_TOKENS", 1000),
			Temperature: getEnvAsFloat("OPENAI_TEMPERATURE", 0.7),
		},
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as integer or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

// getEnvAsBool gets an environment variable as boolean or returns a default value
func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}

// getEnvAsFloat gets an environment variable as float or returns a default value
func getEnvAsFloat(key string, defaultValue float64) float64 {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseFloat(valueStr, 64); err == nil {
		return value
	}
	return defaultValue
}

// ServerAddress returns the full server address
func (c *Config) ServerAddress() string {
	return fmt.Sprintf("%s:%s", c.Server.Host, c.Server.Port)
}
