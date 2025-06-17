package services

import (
	"fmt"
	"log"
	"sync"
	"time"
)

// WorkerPoolOptimized 优化的工作池，支持自动清理
type WorkerPoolOptimized struct {
	maxWorkers      int
	workers         map[string]*MailboxWorker // key: realMailbox
	scheduler       *EmailFetchScheduler
	shutdownCh      chan struct{}
	wg              sync.WaitGroup
	mu              sync.RWMutex
	cleanupInterval time.Duration
	idleTimeout     time.Duration
}

// NewWorkerPoolOptimized 创建优化的工作池
func NewWorkerPoolOptimized(maxWorkers int, scheduler *EmailFetchScheduler) *WorkerPoolOptimized {
	return &WorkerPoolOptimized{
		maxWorkers:      maxWorkers,
		workers:         make(map[string]*MailboxWorker),
		scheduler:       scheduler,
		shutdownCh:      make(chan struct{}),
		cleanupInterval: 1 * time.Minute, // 每分钟检查一次
		idleTimeout:     5 * time.Minute, // 5分钟无活动则清理
	}
}

// Start 启动工作池
func (p *WorkerPoolOptimized) Start() {
	log.Printf("[WorkerPoolOptimized] Started with max workers: %d", p.maxWorkers)

	// 启动清理协程
	p.wg.Add(1)
	go p.cleanupRoutine()
}

// cleanupRoutine 定期清理空闲Worker
func (p *WorkerPoolOptimized) cleanupRoutine() {
	defer p.wg.Done()

	ticker := time.NewTicker(p.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			p.cleanupIdleWorkers()
		case <-p.shutdownCh:
			return
		}
	}
}

// cleanupIdleWorkers 清理空闲的Worker
func (p *WorkerPoolOptimized) cleanupIdleWorkers() {
	p.mu.Lock()
	defer p.mu.Unlock()

	now := time.Now()
	for mailbox, worker := range p.workers {
		// 检查是否有活跃订阅
		subs := p.scheduler.subscriptionMgr.GetSubscriptionsByRealMailbox(mailbox)

		worker.mu.Lock()
		lastFetch := worker.LastFetchTime
		fetching := worker.Fetching
		worker.mu.Unlock()

		// 如果没有订阅且超过空闲时间，清理Worker
		if len(subs) == 0 && !fetching && now.Sub(lastFetch) > p.idleTimeout {
			log.Printf("[WorkerPoolOptimized] Cleaning up idle worker for %s (no subscriptions, idle for %v)",
				mailbox, now.Sub(lastFetch))

			// 关闭Worker
			close(worker.shutdownCh)
			delete(p.workers, mailbox)
		}
	}
}

// RemoveWorker 手动移除Worker（供订阅管理器调用）
func (p *WorkerPoolOptimized) RemoveWorker(realMailbox string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if worker, exists := p.workers[realMailbox]; exists {
		log.Printf("[WorkerPoolOptimized] Removing worker for %s", realMailbox)
		close(worker.shutdownCh)
		delete(p.workers, realMailbox)
	}
}

// TriggerFetch 触发邮件获取（与原实现相同）
func (p *WorkerPoolOptimized) TriggerFetch(realMailbox string) {
	p.mu.Lock()
	worker, exists := p.workers[realMailbox]
	if !exists {
		// 创建新的工作器
		worker = p.createWorker(realMailbox)
		p.workers[realMailbox] = worker

		// 启动工作器
		p.wg.Add(1)
		go worker.RunOptimized()
	}
	p.mu.Unlock()

	// 非阻塞发送触发信号
	select {
	case worker.FetchTrigger <- struct{}{}:
		log.Printf("[WorkerPoolOptimized] Triggered fetch for %s", realMailbox)
	default:
		// 已经有待处理的触发信号
		log.Printf("[WorkerPoolOptimized] Fetch already pending for %s", realMailbox)
	}
}

// createWorker 创建工作器
func (p *WorkerPoolOptimized) createWorker(realMailbox string) *MailboxWorker {
	return &MailboxWorker{
		ID:           fmt.Sprintf("worker_%s_%d", realMailbox, time.Now().Unix()),
		RealMailbox:  realMailbox,
		FetchTrigger: make(chan struct{}, 1),
		scheduler:    p.scheduler,
		shutdownCh:   make(chan struct{}),
	}
}

// RunOptimized Worker的优化运行方法
func (w *MailboxWorker) RunOptimized() {
	defer w.scheduler.workerPool.wg.Done()

	log.Printf("[Worker %s] Started for mailbox %s (optimized)", w.ID, w.RealMailbox)

	// 防抖动定时器
	debounceTimer := time.NewTimer(0)
	debounceTimer.Stop()

	// 空闲检查定时器
	idleCheckTimer := time.NewTimer(30 * time.Second)
	defer idleCheckTimer.Stop()

	for {
		select {
		case <-w.FetchTrigger:
			// 重置防抖动定时器
			debounceTimer.Stop()
			debounceTimer = time.NewTimer(w.scheduler.config.MinFetchInterval)

			// 重置空闲检查定时器
			idleCheckTimer.Stop()
			idleCheckTimer.Reset(30 * time.Second)

		case <-debounceTimer.C:
			// 执行获取
			shouldExit := w.performFetchOptimized()
			if shouldExit {
				log.Printf("[Worker %s] No subscriptions, shutting down", w.ID)
				return
			}

			// 重置空闲检查定时器
			idleCheckTimer.Stop()
			idleCheckTimer.Reset(30 * time.Second)

		case <-idleCheckTimer.C:
			// 检查是否还有订阅
			subs := w.scheduler.subscriptionMgr.GetSubscriptionsByRealMailbox(w.RealMailbox)
			if len(subs) == 0 {
				log.Printf("[Worker %s] No subscriptions during idle check, shutting down", w.ID)
				return
			}

			// 继续等待
			idleCheckTimer.Reset(30 * time.Second)

		case <-w.shutdownCh:
			log.Printf("[Worker %s] Shutting down", w.ID)
			return

		case <-w.scheduler.shutdownCh:
			log.Printf("[Worker %s] Scheduler shutdown", w.ID)
			return
		}
	}
}

// performFetchOptimized 优化的获取方法，返回是否应该退出
func (w *MailboxWorker) performFetchOptimized() bool {
	w.mu.Lock()
	if w.Fetching {
		w.mu.Unlock()
		return false
	}
	w.Fetching = true
	w.mu.Unlock()

	defer func() {
		w.mu.Lock()
		w.Fetching = false
		w.LastFetchTime = time.Now()
		w.mu.Unlock()
	}()

	log.Printf("[Worker %s] Starting fetch for %s", w.ID, w.RealMailbox)

	// 获取该邮箱的所有订阅
	subscriptions := w.scheduler.subscriptionMgr.GetSubscriptionsByRealMailbox(w.RealMailbox)
	if len(subscriptions) == 0 {
		log.Printf("[Worker %s] No active subscriptions, will exit", w.ID)
		return true // 返回true表示应该退出
	}

	// ... 其余获取逻辑与原实现相同 ...

	return false
}
