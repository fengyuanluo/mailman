package services

import (
	"time"
)

// EmailSubscription 是 Subscription 的别名，用于外部接口
type EmailSubscription = Subscription

// EventType 定义事件类型
type EventType string

const (
	EventTypeNewEmail      EventType = "new_email"
	EventTypeFetchStart    EventType = "fetch_start"
	EventTypeFetchComplete EventType = "fetch_complete"
	EventTypeFetchError    EventType = "fetch_error"
	EventTypeSubscribed    EventType = "subscribed"
	EventTypeUnsubscribed  EventType = "unsubscribed"
)

// EmailEvent 定义邮件事件
type EmailEvent struct {
	Type           EventType
	SubscriptionID string
	Timestamp      time.Time
	Data           interface{}
	Error          error
}

// EventChannel 定义事件通道类型
type EventChannel chan EmailEvent

// EventSubscriber 事件订阅者
type EventSubscriber struct {
	ID      string
	Channel EventChannel
	Filter  func(event EmailEvent) bool
}
