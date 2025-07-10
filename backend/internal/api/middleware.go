package api

import (
	"context"
	"mailman/internal/services"
	"mailman/internal/utils"
	"net/http"
	"strings"
	"time"
)

// ContextKey is a custom type for context keys
type ContextKey string

const (
	// UserContextKey is the key for storing user in context
	UserContextKey ContextKey = "user"
)

// AuthMiddleware creates an authentication middleware
func AuthMiddleware(authService *services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			// Check for Bearer token
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			token := parts[1]

			// 使用请求上下文验证会话，确保请求取消时验证也会取消
			// 这避免了在请求已终止的情况下验证会话继续执行
			user, err := authService.ValidateSessionWithContext(r.Context(), token)
			if err != nil {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			// Add user to context
			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// PublicEndpoint is a middleware that marks an endpoint as public (no auth required)
func PublicEndpoint(next http.Handler) http.Handler {
	return next
}

// LoggingMiddleware creates a logging middleware for HTTP requests
func LoggingMiddleware(logger *utils.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Create a custom response writer to capture status code
			lrw := &loggingResponseWriter{
				ResponseWriter: w,
				statusCode:     http.StatusOK,
			}

			// Log request with verbose flag set to false for normal logging
			logger.LogHTTPRequest(r, false)

			// Call the next handler
			next.ServeHTTP(lrw, r)

			// Log response
			duration := time.Since(start)

			// Create a minimal response object for logging
			resp := &http.Response{
				StatusCode: lrw.statusCode,
				Request:    r,
			}
			logger.LogHTTPResponse(resp, duration, false)
		})
	}
}

// loggingResponseWriter wraps http.ResponseWriter to capture status code
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader captures the status code
func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// Write ensures we capture the status code even if WriteHeader isn't called
func (lrw *loggingResponseWriter) Write(b []byte) (int, error) {
	if lrw.statusCode == 0 {
		lrw.statusCode = http.StatusOK
	}
	return lrw.ResponseWriter.Write(b)
}
