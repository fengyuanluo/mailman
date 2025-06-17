package services

import (
	"log"
	"mailman/internal/models"
	"time"
)

// AddWorkerCleanup 为现有的WorkerPool添加清理功能
// 这是一个补丁方案，可以在不修改原有代码的情况下添加清理机制
func (p *WorkerPool) AddWorkerCleanup() {
	// 启动清理协程
	go func() {
		ticker := time.NewTicker(1 * time.Minute) // 每分钟检查一次
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				p.cleanupIdleWorkers()
			case <-p.shutdownCh:
				return
			}
		}
	}()

	log.Println("[WorkerPool] Worker cleanup routine started")
}

// cleanupIdleWorkers 清理没有订阅的Worker
func (p *WorkerPool) cleanupIdleWorkers() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for mailbox, worker := range p.workers {
		// 检查是否有活跃订阅
		subs := p.scheduler.subscriptionMgr.GetSubscriptionsByRealMailbox(mailbox)

		if len(subs) == 0 {
			worker.mu.Lock()
			fetching := worker.Fetching
			lastFetch := worker.LastFetchTime
			worker.mu.Unlock()

			// 如果没有订阅且不在获取中，且超过5分钟没有活动
			if !fetching && time.Since(lastFetch) > 5*time.Minute {
				log.Printf("[WorkerPool] Cleaning up idle worker for %s (no subscriptions, idle for %v)",
					mailbox, time.Since(lastFetch))

				// 关闭Worker
				close(worker.shutdownCh)
				delete(p.workers, mailbox)
			}
		}
	}
}

// 修改后的订阅钩子设置
func (s *EmailFetchScheduler) setupSubscriptionHooksWithCleanup() {
	s.subscriptionMgr.hooks = SubscriptionHooks{
		OnSubscribe: func(sub *Subscription) error {
			log.Printf("[Scheduler] New subscription: %s for %s", sub.ID, sub.Filter.EmailAddress)
			return nil
		},
		OnUnsubscribe: func(sub *Subscription) error {
			log.Printf("[Scheduler] Subscription removed: %s", sub.ID)

			// 检查是否需要清理Worker
			go func() {
				// 延迟100ms执行，确保订阅已经从管理器中移除
				time.Sleep(100 * time.Millisecond)
				s.workerPool.RemoveWorkerIfNoSubscriptions(sub.Filter.RealMailbox)
			}()

			return nil
		},
		OnEmailMatch: func(sub *Subscription, email models.Email) error {
			return nil
		},
		OnError: func(sub *Subscription, err error) {
			log.Printf("[Scheduler] Subscription %s error: %v", sub.ID, err)
		},
		OnExpire: func(sub *Subscription) {
			log.Printf("[Scheduler] Subscription %s expired", sub.ID)
		},
	}
}
