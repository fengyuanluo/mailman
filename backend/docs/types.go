package docs

import "time"

// swag:type DeletedAt
type DeletedAt struct {
	Time  time.Time `json:"time"`
	Valid bool      `json:"valid"`
}
