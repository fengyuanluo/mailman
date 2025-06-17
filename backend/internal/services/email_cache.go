package services

import (
	"sync"
	"time"

	"mailman/internal/models"
)

// EmailCache 邮件缓存
type EmailCache struct {
	cache         map[string]*MailboxCache // key: realMailbox
	cacheDuration time.Duration
	hits          int64
	misses        int64
	mu            sync.RWMutex
}

// MailboxCache 邮箱缓存
type MailboxCache struct {
	RealMailbox   string
	Emails        []*models.Email
	LastFetchTime time.Time
	FetchError    error
	mu            sync.RWMutex
}

// CacheStats 缓存统计
type CacheStats struct {
	TotalMailboxes int
	TotalEmails    int
	HitRate        float64
	Hits           int64
	Misses         int64
}

// NewEmailCache 创建邮件缓存
func NewEmailCache(cacheDuration time.Duration) *EmailCache {
	return &EmailCache{
		cache:         make(map[string]*MailboxCache),
		cacheDuration: cacheDuration,
	}
}

// Get 获取缓存的邮件
func (c *EmailCache) Get(realMailbox string) ([]*models.Email, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	mailboxCache, exists := c.cache[realMailbox]
	if !exists {
		c.misses++
		return nil, false
	}

	mailboxCache.mu.RLock()
	defer mailboxCache.mu.RUnlock()

	// 检查缓存是否过期
	if time.Since(mailboxCache.LastFetchTime) > c.cacheDuration {
		c.misses++
		return nil, false
	}

	c.hits++
	return mailboxCache.Emails, true
}

// Set 设置缓存
func (c *EmailCache) Set(realMailbox string, emails []*models.Email, fetchError error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	mailboxCache, exists := c.cache[realMailbox]
	if !exists {
		mailboxCache = &MailboxCache{
			RealMailbox: realMailbox,
		}
		c.cache[realMailbox] = mailboxCache
	}

	mailboxCache.mu.Lock()
	defer mailboxCache.mu.Unlock()

	mailboxCache.Emails = emails
	mailboxCache.LastFetchTime = time.Now()
	mailboxCache.FetchError = fetchError
}

// GetWithError 获取缓存的邮件和错误
func (c *EmailCache) GetWithError(realMailbox string) ([]*models.Email, error, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	mailboxCache, exists := c.cache[realMailbox]
	if !exists {
		c.misses++
		return nil, nil, false
	}

	mailboxCache.mu.RLock()
	defer mailboxCache.mu.RUnlock()

	// 检查缓存是否过期
	if time.Since(mailboxCache.LastFetchTime) > c.cacheDuration {
		c.misses++
		return nil, nil, false
	}

	c.hits++
	return mailboxCache.Emails, mailboxCache.FetchError, true
}

// Invalidate 使缓存失效
func (c *EmailCache) Invalidate(realMailbox string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.cache, realMailbox)
}

// InvalidateAll 使所有缓存失效
func (c *EmailCache) InvalidateAll() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.cache = make(map[string]*MailboxCache)
}

// GetStats 获取缓存统计
func (c *EmailCache) GetStats() CacheStats {
	c.mu.RLock()
	defer c.mu.RUnlock()

	totalEmails := 0
	for _, mailboxCache := range c.cache {
		mailboxCache.mu.RLock()
		totalEmails += len(mailboxCache.Emails)
		mailboxCache.mu.RUnlock()
	}

	total := c.hits + c.misses
	hitRate := float64(0)
	if total > 0 {
		hitRate = float64(c.hits) / float64(total)
	}

	return CacheStats{
		TotalMailboxes: len(c.cache),
		TotalEmails:    totalEmails,
		HitRate:        hitRate,
		Hits:           c.hits,
		Misses:         c.misses,
	}
}

// Cleanup 清理过期缓存
func (c *EmailCache) Cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for mailbox, mailboxCache := range c.cache {
		mailboxCache.mu.RLock()
		if now.Sub(mailboxCache.LastFetchTime) > c.cacheDuration {
			delete(c.cache, mailbox)
		}
		mailboxCache.mu.RUnlock()
	}
}

// StartCleanupRoutine 启动清理协程
func (c *EmailCache) StartCleanupRoutine(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			c.Cleanup()
		}
	}()
}

// GetLastFetchTime 获取最后获取时间
func (c *EmailCache) GetLastFetchTime(realMailbox string) (time.Time, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	mailboxCache, exists := c.cache[realMailbox]
	if !exists {
		return time.Time{}, false
	}

	mailboxCache.mu.RLock()
	defer mailboxCache.mu.RUnlock()

	return mailboxCache.LastFetchTime, true
}

// IsStale 检查缓存是否过期
func (c *EmailCache) IsStale(realMailbox string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	mailboxCache, exists := c.cache[realMailbox]
	if !exists {
		return true
	}

	mailboxCache.mu.RLock()
	defer mailboxCache.mu.RUnlock()

	return time.Since(mailboxCache.LastFetchTime) > c.cacheDuration
}

// Prefetch 预取邮件（用于预测性加载）
func (c *EmailCache) Prefetch(realMailbox string, fetchFunc func() ([]*models.Email, error)) {
	// 如果缓存已存在且未过期，不需要预取
	if _, ok := c.Get(realMailbox); ok {
		return
	}

	// 异步预取
	go func() {
		emails, err := fetchFunc()
		c.Set(realMailbox, emails, err)
	}()
}

// GetHitRate 获取缓存命中率
func (c *EmailCache) GetHitRate() float64 {
	c.mu.RLock()
	defer c.mu.RUnlock()

	total := c.hits + c.misses
	if total == 0 {
		return 0
	}
	return float64(c.hits) / float64(total)
}

// GetEmailsInRange 获取指定时间范围内的邮件
func (c *EmailCache) GetEmailsInRange(realMailbox string, startTime, endTime time.Time) ([]*models.Email, bool) {
	emails, ok := c.Get(realMailbox)
	if !ok {
		return nil, false
	}

	// 检查缓存是否覆盖到请求的时间范围
	// 找出缓存中最新的邮件时间
	var latestCachedTime time.Time
	for _, email := range emails {
		if email.Date.After(latestCachedTime) {
			latestCachedTime = email.Date
		}
	}

	// 如果请求的结束时间比缓存中最新邮件时间晚超过30秒
	// 说明可能有新邮件，返回缓存未命中
	if !endTime.IsZero() && !latestCachedTime.IsZero() {
		if endTime.Sub(latestCachedTime) > 30*time.Second {
			c.misses++
			return nil, false
		}
	}

	// 过滤时间范围内的邮件
	var filteredEmails []*models.Email
	for _, email := range emails {
		if (startTime.IsZero() || email.Date.After(startTime) || email.Date.Equal(startTime)) &&
			(endTime.IsZero() || email.Date.Before(endTime) || email.Date.Equal(endTime)) {
			filteredEmails = append(filteredEmails, email)
		}
	}

	return filteredEmails, true
}

// AddEmails 添加邮件到缓存（增量更新）
func (c *EmailCache) AddEmails(realMailbox string, newEmails []*models.Email) {
	c.mu.Lock()
	defer c.mu.Unlock()

	mailboxCache, exists := c.cache[realMailbox]
	if !exists {
		// 如果缓存不存在，创建新的
		c.cache[realMailbox] = &MailboxCache{
			RealMailbox:   realMailbox,
			Emails:        newEmails,
			LastFetchTime: time.Now(),
		}
		return
	}

	mailboxCache.mu.Lock()
	defer mailboxCache.mu.Unlock()

	// 创建一个 map 来存储现有邮件的 ID
	existingIDs := make(map[string]bool)
	for _, email := range mailboxCache.Emails {
		existingIDs[email.MessageID] = true
	}

	// 只添加新邮件
	for _, email := range newEmails {
		if !existingIDs[email.MessageID] {
			mailboxCache.Emails = append(mailboxCache.Emails, email)
		}
	}

	mailboxCache.LastFetchTime = time.Now()
}

// GetEmailCount 获取缓存中的邮件数量
func (c *EmailCache) GetEmailCount(realMailbox string) int {
	c.mu.RLock()
	defer c.mu.RUnlock()

	mailboxCache, exists := c.cache[realMailbox]
	if !exists {
		return 0
	}

	mailboxCache.mu.RLock()
	defer mailboxCache.mu.RUnlock()

	return len(mailboxCache.Emails)
}

// GetAllCachedMailboxes 获取所有缓存的邮箱
func (c *EmailCache) GetAllCachedMailboxes() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	mailboxes := make([]string, 0, len(c.cache))
	for mailbox := range c.cache {
		mailboxes = append(mailboxes, mailbox)
	}
	return mailboxes
}
