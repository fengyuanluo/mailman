package api

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"mailman/internal/models"
	"mailman/internal/repository"

	"github.com/gorilla/websocket"
)

// SimplifiedWebSocketHandler handles WebSocket connections for real-time email updates
// This version queries the database instead of directly fetching from email servers
type SimplifiedWebSocketHandler struct {
	emailRepo   *repository.EmailRepository
	accountRepo *repository.EmailAccountRepository
	upgrader    websocket.Upgrader
}

// NewSimplifiedWebSocketHandler creates a new simplified WebSocket handler
func NewSimplifiedWebSocketHandler(
	emailRepo *repository.EmailRepository,
	accountRepo *repository.EmailAccountRepository,
) *SimplifiedWebSocketHandler {
	return &SimplifiedWebSocketHandler{
		emailRepo:   emailRepo,
		accountRepo: accountRepo,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// Allow all origins in development
				// TODO: Implement proper origin checking for production
				return true
			},
		},
	}
}

// WaitEmailWebSocketHandler handles WebSocket connections for waiting for emails
func (h *SimplifiedWebSocketHandler) WaitEmailWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WebSocket] Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	// Read initial request
	var request WaitEmailWebSocketRequest
	if err := conn.ReadJSON(&request); err != nil {
		h.sendError(conn, "Invalid request format: "+err.Error())
		return
	}

	// Get email address from request
	var emailAddress string
	if request.Email != nil {
		emailAddress = *request.Email
	} else if request.AccountID != nil {
		// Get account by ID
		account, err := h.accountRepo.GetByID(*request.AccountID)
		if err != nil {
			h.sendError(conn, "Account not found")
			return
		}
		emailAddress = account.EmailAddress
	} else {
		h.sendError(conn, "Either email or accountId must be provided")
		return
	}

	log.Printf("[WebSocket] New connection for email: %s", emailAddress)

	// Get account information
	account, err := h.accountRepo.GetByEmail(emailAddress)
	if err != nil {
		h.sendError(conn, "Account not found")
		return
	}

	// Parse start time
	startTime := time.Now()
	if request.StartTime != nil {
		parsedTime, err := parseStartTime(*request.StartTime)
		if err == nil {
			startTime = parsedTime
		}
	}

	// Create context for cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle client disconnection
	go func() {
		for {
			if _, _, err := conn.NextReader(); err != nil {
				cancel()
				return
			}
		}
	}()

	// Send initial status
	h.sendMessage(conn, "status", "Connected and monitoring emails", nil)

	// Start monitoring loop
	ticker := time.NewTicker(1 * time.Second) // Check every second
	defer ticker.Stop()

	processedMessageIDs := make(map[string]bool)
	checkCount := 0

	for {
		select {
		case <-ctx.Done():
			log.Printf("[WebSocket] Client disconnected for %s", emailAddress)
			return

		case <-ticker.C:
			checkCount++

			// Query database for new emails
			emails, err := h.emailRepo.GetEmailsByAccountIDSince(account.ID, startTime)
			if err != nil {
				log.Printf("[WebSocket] Error querying emails: %v", err)
				continue
			}

			// Process new emails
			for _, email := range emails {
				// Skip if already processed
				if processedMessageIDs[email.MessageID] {
					continue
				}

				// Check if email is addressed to the account
				if !h.isEmailAddressedToAccount(&email, account) {
					continue
				}

				processedMessageIDs[email.MessageID] = true

				// Send email to client
				h.sendMessage(conn, "email_found", "Email found", map[string]interface{}{
					"email": email,
				})

				log.Printf("[WebSocket] Found matching email: %s", email.Subject)

				// Update last check time
				if email.Date.After(startTime) {
					startTime = email.Date
				}
			}

			// Send periodic status update
			if checkCount%30 == 0 { // Every 30 seconds
				h.sendMessage(conn, "status", "Still monitoring...", map[string]interface{}{
					"emails_checked": len(emails),
					"matches_found":  len(processedMessageIDs),
				})
			}

			// Check timeout
			if request.Timeout > 0 && time.Since(startTime) > time.Duration(request.Timeout)*time.Second {
				h.sendMessage(conn, "timeout", "Monitoring timeout reached", map[string]interface{}{
					"emails_found": len(processedMessageIDs),
				})
				return
			}
		}
	}
}

// isEmailAddressedToAccount checks if email is addressed to the account
func (h *SimplifiedWebSocketHandler) isEmailAddressedToAccount(email *models.Email, account *models.EmailAccount) bool {
	accountEmail := account.EmailAddress

	// Check To field
	for _, to := range email.To {
		if containsIgnoreCase(to, accountEmail) {
			return true
		}
	}

	// Check Cc field
	for _, cc := range email.Cc {
		if containsIgnoreCase(cc, accountEmail) {
			return true
		}
	}

	// Check Bcc field
	for _, bcc := range email.Bcc {
		if containsIgnoreCase(bcc, accountEmail) {
			return true
		}
	}

	return false
}

// sendMessage sends a message to the WebSocket client
func (h *SimplifiedWebSocketHandler) sendMessage(conn *websocket.Conn, msgType string, message string, data interface{}) {
	msg := WebSocketMessage{
		Type:    msgType,
		Message: message,
		Data:    data,
	}

	if err := conn.WriteJSON(msg); err != nil {
		log.Printf("[WebSocket] Error sending message: %v", err)
	}
}

// sendError sends an error message to the WebSocket client
func (h *SimplifiedWebSocketHandler) sendError(conn *websocket.Conn, errorMsg string) {
	h.sendMessage(conn, "error", errorMsg, nil)
}

// parseStartTime parses various time formats
func parseStartTime(startTime string) (time.Time, error) {
	// Try different time formats
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05Z",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, startTime); err == nil {
			return t, nil
		}
	}

	// Try parsing as Unix timestamp
	var timestamp int64
	if _, err := fmt.Sscanf(startTime, "%d", &timestamp); err == nil {
		return time.Unix(timestamp, 0), nil
	}

	return time.Time{}, fmt.Errorf("unable to parse time: %s", startTime)
}

// containsIgnoreCase performs case-insensitive string contains check
func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}
