package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"mailman/internal/models"
	"mailman/internal/repository"
	"sort"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/robertkrimen/otto"
)

// TriggerWorker 触发器工作器
type TriggerWorker struct {
	ID            uint
	TriggerID     uint
	Trigger       *models.EmailTrigger
	Context       context.Context
	CancelFunc    context.CancelFunc
	LastCheckTime time.Time
	IsRunning     bool
	mu            sync.RWMutex
}

// TriggerService 触发器服务
type TriggerService struct {
	triggerRepo         *repository.TriggerRepository
	logRepo             *repository.TriggerExecutionLogRepository
	emailRepo           *repository.EmailRepository
	extractorService    *ExtractorService
	subscriptionManager *SubscriptionManager

	// Worker管理
	workers    map[uint]*TriggerWorker // key: triggerID
	workersMu  sync.RWMutex
	shutdownCh chan struct{}
	wg         sync.WaitGroup
}

// NewTriggerService 创建触发器服务
func NewTriggerService(
	triggerRepo *repository.TriggerRepository,
	logRepo *repository.TriggerExecutionLogRepository,
	emailRepo *repository.EmailRepository,
	subscriptionManager *SubscriptionManager,
) *TriggerService {
	return &TriggerService{
		triggerRepo:         triggerRepo,
		logRepo:             logRepo,
		emailRepo:           emailRepo,
		extractorService:    NewExtractorService(),
		subscriptionManager: subscriptionManager,
		workers:             make(map[uint]*TriggerWorker),
		shutdownCh:          make(chan struct{}),
	}
}

// Start 启动触发器服务
func (s *TriggerService) Start() error {
	log.Printf("[TriggerService] Starting trigger service...")

	// 加载所有启用的触发器
	triggers, err := s.triggerRepo.GetByStatus(models.TriggerStatusEnabled)
	if err != nil {
		return fmt.Errorf("failed to load enabled triggers: %w", err)
	}

	// 为每个启用的触发器创建worker
	for _, trigger := range triggers {
		if err := s.startWorker(&trigger); err != nil {
			log.Printf("[TriggerService] Failed to start worker for trigger %d: %v", trigger.ID, err)
		}
	}

	log.Printf("[TriggerService] Started %d trigger workers", len(s.workers))
	return nil
}

// Stop 停止触发器服务
func (s *TriggerService) Stop() {
	log.Printf("[TriggerService] Stopping trigger service...")

	close(s.shutdownCh)

	// 停止所有workers
	s.workersMu.Lock()
	for _, worker := range s.workers {
		worker.CancelFunc()
	}
	s.workersMu.Unlock()

	// 等待所有workers退出
	s.wg.Wait()

	log.Printf("[TriggerService] Trigger service stopped")
}

// CreateTrigger 创建触发器
func (s *TriggerService) CreateTrigger(trigger *models.EmailTrigger) error {
	if err := s.triggerRepo.Create(trigger); err != nil {
		return err
	}

	// 如果触发器是启用状态，立即启动worker
	if trigger.Status == models.TriggerStatusEnabled {
		if err := s.startWorker(trigger); err != nil {
			log.Printf("[TriggerService] Failed to start worker for new trigger %d: %v", trigger.ID, err)
		}
	}

	return nil
}

// UpdateTrigger 更新触发器
func (s *TriggerService) UpdateTrigger(trigger *models.EmailTrigger) error {
	// 获取旧的触发器信息
	oldTrigger, err := s.triggerRepo.GetByID(trigger.ID)
	if err != nil {
		return err
	}

	// 更新数据库
	if err := s.triggerRepo.Update(trigger); err != nil {
		return err
	}

	// 处理worker状态变化
	s.workersMu.Lock()
	worker, exists := s.workers[trigger.ID]
	s.workersMu.Unlock()

	if trigger.Status == models.TriggerStatusEnabled {
		if exists {
			// 如果worker已存在，检查是否需要重启（检查间隔变化）
			if oldTrigger.CheckInterval != trigger.CheckInterval {
				log.Printf("[TriggerService] Restarting worker for trigger %d due to interval change", trigger.ID)
				s.stopWorker(trigger.ID)
				if err := s.startWorker(trigger); err != nil {
					log.Printf("[TriggerService] Failed to restart worker for trigger %d: %v", trigger.ID, err)
				}
			} else {
				// 更新worker中的触发器配置
				worker.mu.Lock()
				worker.Trigger = trigger
				worker.mu.Unlock()
			}
		} else {
			// 启动新的worker
			if err := s.startWorker(trigger); err != nil {
				log.Printf("[TriggerService] Failed to start worker for updated trigger %d: %v", trigger.ID, err)
			}
		}
	} else {
		// 触发器被禁用，停止worker
		if exists {
			s.stopWorker(trigger.ID)
		}
	}

	return nil
}

// DeleteTrigger 删除触发器
func (s *TriggerService) DeleteTrigger(id uint) error {
	// 停止worker
	s.stopWorker(id)

	// 删除触发器
	return s.triggerRepo.Delete(id)
}

// EnableTrigger 启用触发器
func (s *TriggerService) EnableTrigger(id uint) error {
	trigger, err := s.triggerRepo.GetByID(id)
	if err != nil {
		return err
	}

	if err := s.triggerRepo.UpdateStatus(id, models.TriggerStatusEnabled); err != nil {
		return err
	}

	trigger.Status = models.TriggerStatusEnabled
	return s.startWorker(trigger)
}

// DisableTrigger 禁用触发器
func (s *TriggerService) DisableTrigger(id uint) error {
	if err := s.triggerRepo.UpdateStatus(id, models.TriggerStatusDisabled); err != nil {
		return err
	}

	s.stopWorker(id)
	return nil
}

// startWorker 启动触发器worker
func (s *TriggerService) startWorker(trigger *models.EmailTrigger) error {
	s.workersMu.Lock()
	defer s.workersMu.Unlock()

	// 检查worker是否已存在
	if _, exists := s.workers[trigger.ID]; exists {
		return fmt.Errorf("worker for trigger %d already exists", trigger.ID)
	}

	// 创建worker上下文
	ctx, cancel := context.WithCancel(context.Background())

	worker := &TriggerWorker{
		ID:            uint(len(s.workers) + 1),
		TriggerID:     trigger.ID,
		Trigger:       trigger,
		Context:       ctx,
		CancelFunc:    cancel,
		LastCheckTime: time.Now(),
		IsRunning:     false,
	}

	s.workers[trigger.ID] = worker

	// 启动worker goroutine
	s.wg.Add(1)
	go s.runWorker(worker)

	log.Printf("[TriggerService] Started worker for trigger %d (%s) with interval %ds",
		trigger.ID, trigger.Name, trigger.CheckInterval)

	return nil
}

// stopWorker 停止触发器worker
func (s *TriggerService) stopWorker(triggerID uint) {
	s.workersMu.Lock()
	worker, exists := s.workers[triggerID]
	if exists {
		delete(s.workers, triggerID)
	}
	s.workersMu.Unlock()

	if exists {
		worker.CancelFunc()
		log.Printf("[TriggerService] Stopped worker for trigger %d", triggerID)
	}
}

// runWorker 运行触发器worker
func (s *TriggerService) runWorker(worker *TriggerWorker) {
	defer s.wg.Done()

	worker.mu.Lock()
	interval := time.Duration(worker.Trigger.CheckInterval) * time.Second
	worker.mu.Unlock()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("[TriggerService] Worker %d for trigger %d started with interval %v",
		worker.ID, worker.TriggerID, interval)

	for {
		select {
		case <-worker.Context.Done():
			log.Printf("[TriggerService] Worker %d for trigger %d stopped", worker.ID, worker.TriggerID)
			return

		case <-s.shutdownCh:
			log.Printf("[TriggerService] Worker %d for trigger %d stopped due to service shutdown", worker.ID, worker.TriggerID)
			return

		case <-ticker.C:
			worker.mu.Lock()
			worker.IsRunning = true
			trigger := worker.Trigger
			lastCheckTime := worker.LastCheckTime
			worker.mu.Unlock()

			// 执行触发器检查
			if err := s.executeTrigger(trigger, lastCheckTime); err != nil {
				log.Printf("[TriggerService] Error executing trigger %d: %v", trigger.ID, err)
			}

			worker.mu.Lock()
			worker.LastCheckTime = time.Now()
			worker.IsRunning = false
			worker.mu.Unlock()
		}
	}
}

// executeTrigger 执行触发器
func (s *TriggerService) executeTrigger(trigger *models.EmailTrigger, lastCheckTime time.Time) error {
	startTime := time.Now()

	// 构建邮件搜索选项
	searchOptions := repository.EmailSearchOptions{
		StartDate:    &lastCheckTime,
		EndDate:      &startTime,
		FromQuery:    trigger.From,
		ToQuery:      trigger.To,
		SubjectQuery: trigger.Subject,
		MailboxName:  "",
		Limit:        100, // 限制每次检查的邮件数量
		Offset:       0,
		SortBy:       "date DESC",
	}

	// 如果指定了邮箱地址，需要找到对应的账户
	if trigger.EmailAddress != "" {
		searchOptions.ToQuery = trigger.EmailAddress
	}

	// 搜索符合条件的邮件
	emails, _, err := s.emailRepo.SearchEmails(searchOptions)
	if err != nil {
		return fmt.Errorf("failed to search emails: %w", err)
	}

	log.Printf("[TriggerService] Trigger %d found %d emails to process", trigger.ID, len(emails))

	// 处理每封邮件
	for _, email := range emails {
		if err := s.processEmailWithTrigger(trigger, email, startTime); err != nil {
			log.Printf("[TriggerService] Error processing email %d with trigger %d: %v", email.ID, trigger.ID, err)
		}
	}

	return nil
}

// processEmailWithTrigger 使用触发器处理邮件
func (s *TriggerService) processEmailWithTrigger(trigger *models.EmailTrigger, email models.Email, startTime time.Time) error {
	executionStartTime := time.Now()

	// 创建执行日志
	executionLog := &models.TriggerExecutionLog{
		TriggerID:       trigger.ID,
		EmailID:         email.ID,
		Status:          models.TriggerExecutionStatusFailed,
		StartTime:       executionStartTime,
		InputParams:     make(models.JSONMap),
		ConditionResult: false,
		ActionResults:   make(models.TriggerActionResults, 0),
	}

	// 设置输入参数
	executionLog.InputParams["email_id"] = fmt.Sprintf("%d", email.ID)
	executionLog.InputParams["trigger_id"] = fmt.Sprintf("%d", trigger.ID)
	executionLog.InputParams["check_time"] = startTime.Format(time.RFC3339)

	defer func() {
		executionLog.EndTime = time.Now()
		executionLog.ExecutionMs = executionLog.EndTime.Sub(executionLog.StartTime).Milliseconds()

		// 保存执行日志（如果启用了日志）
		if trigger.EnableLogging {
			if err := s.logRepo.Create(executionLog); err != nil {
				log.Printf("[TriggerService] Failed to save execution log: %v", err)
			}
		}

		// 更新触发器统计信息
		s.updateTriggerStatistics(trigger, executionLog.Status == models.TriggerExecutionStatusSuccess, executionLog.ErrorMessage)
	}()

	// 1. 评估触发条件
	conditionResult, err := s.evaluateCondition(trigger.Condition, email)
	if err != nil {
		executionLog.ConditionError = err.Error()
		executionLog.ErrorMessage = fmt.Sprintf("Condition evaluation failed: %v", err)
		return err
	}

	executionLog.ConditionResult = conditionResult

	// 如果条件不满足，直接返回
	if !conditionResult {
		executionLog.Status = models.TriggerExecutionStatusSuccess
		return nil
	}

	// 2. 执行触发动作
	modifiedEmail := email
	allActionsSucceeded := true
	var actionResults []models.TriggerActionResult

	// 按顺序执行动作
	actions := trigger.Actions
	sort.Slice(actions, func(i, j int) bool {
		return actions[i].Order < actions[j].Order
	})

	for _, action := range actions {
		if !action.Enabled {
			continue
		}

		actionStartTime := time.Now()
		result := models.TriggerActionResult{
			ActionName: action.Name,
			ActionType: string(action.Type),
			Success:    false,
		}

		// 执行动作
		outputEmail, err := s.executeAction(action, modifiedEmail)
		actionEndTime := time.Now()
		result.ExecutionMs = actionEndTime.Sub(actionStartTime).Milliseconds()

		if err != nil {
			result.Error = err.Error()
			allActionsSucceeded = false
			log.Printf("[TriggerService] Action %s failed for email %d: %v", action.Name, email.ID, err)
		} else {
			result.Success = true
			result.OutputData = map[string]interface{}{
				"modified": outputEmail.ID != modifiedEmail.ID ||
					outputEmail.Subject != modifiedEmail.Subject ||
					outputEmail.Body != modifiedEmail.Body ||
					outputEmail.HTMLBody != modifiedEmail.HTMLBody,
			}
			modifiedEmail = *outputEmail
		}

		actionResults = append(actionResults, result)
	}

	executionLog.ActionResults = actionResults

	// 设置最终状态
	if allActionsSucceeded {
		executionLog.Status = models.TriggerExecutionStatusSuccess
	} else if len(actionResults) > 0 {
		// 检查是否有部分成功
		hasSuccess := false
		for _, result := range actionResults {
			if result.Success {
				hasSuccess = true
				break
			}
		}
		if hasSuccess {
			executionLog.Status = models.TriggerExecutionStatusPartial
		}
	}

	return nil
}

// evaluateCondition 评估触发条件
func (s *TriggerService) evaluateCondition(condition models.TriggerConditionConfig, email models.Email) (bool, error) {
	switch condition.Type {
	case "js":
		return s.evaluateJSCondition(condition.Script, email)
	case "gotemplate":
		return s.evaluateGoTemplateCondition(condition.Script, email)
	default:
		return false, fmt.Errorf("unsupported condition type: %s", condition.Type)
	}
}

// evaluateJSCondition 评估JavaScript条件
func (s *TriggerService) evaluateJSCondition(script string, email models.Email) (bool, error) {
	vm := otto.New()

	// 设置超时
	timeout := time.After(10 * time.Second)
	done := make(chan bool, 1)

	var result bool
	var err error

	go func() {
		defer func() {
			if r := recover(); r != nil {
				err = fmt.Errorf("JS execution panic: %v", r)
			}
			done <- true
		}()

		// 设置邮件对象
		emailJSON, jsonErr := json.Marshal(email)
		if jsonErr != nil {
			err = fmt.Errorf("failed to marshal email: %w", jsonErr)
			return
		}

		if setErr := vm.Set("email", string(emailJSON)); setErr != nil {
			err = fmt.Errorf("failed to set email variable: %w", setErr)
			return
		}

		// 解析邮件对象
		if _, runErr := vm.Run("var parsedEmail = JSON.parse(email);"); runErr != nil {
			err = fmt.Errorf("failed to parse email in JS: %w", runErr)
			return
		}

		// 包装脚本确保返回布尔值
		wrappedScript := fmt.Sprintf(`
			(function() {
				try {
					var result = (function() { %s })();
					return !!result;
				} catch (e) {
					return false;
				}
			})()
		`, script)

		// 执行脚本
		value, runErr := vm.Run(wrappedScript)
		if runErr != nil {
			err = fmt.Errorf("JS execution failed: %w", runErr)
			return
		}

		result, err = value.ToBoolean()
	}()

	select {
	case <-timeout:
		return false, fmt.Errorf("JS condition evaluation timeout")
	case <-done:
		return result, err
	}
}

// evaluateGoTemplateCondition 评估Go模板条件
func (s *TriggerService) evaluateGoTemplateCondition(templateStr string, email models.Email) (bool, error) {
	// 定义模板函数
	funcMap := template.FuncMap{
		"contains":  strings.Contains,
		"hasPrefix": strings.HasPrefix,
		"hasSuffix": strings.HasSuffix,
		"toLower":   strings.ToLower,
		"toUpper":   strings.ToUpper,
		"trim":      strings.TrimSpace,
	}

	tmpl, err := template.New("condition").Funcs(funcMap).Parse(templateStr)
	if err != nil {
		return false, fmt.Errorf("invalid template: %w", err)
	}

	// 创建数据结构
	data := struct {
		*models.Email
		AllText string
	}{
		Email:   &email,
		AllText: strings.Join([]string{email.Subject, email.Body, email.HTMLBody}, " "),
	}

	var result strings.Builder
	err = tmpl.Execute(&result, data)
	if err != nil {
		return false, fmt.Errorf("template execution failed: %w", err)
	}

	output := strings.TrimSpace(result.String())
	return output == "true" || output == "1" || output == "yes", nil
}

// executeAction 执行触发动作
func (s *TriggerService) executeAction(action models.TriggerActionConfig, email models.Email) (*models.Email, error) {
	switch action.Type {
	case models.TriggerActionTypeModifyContent:
		return s.executeModifyContentAction(action, email)
	case models.TriggerActionTypeSMTP:
		// 未来实现SMTP转发
		return &email, fmt.Errorf("SMTP action not implemented yet")
	default:
		return &email, fmt.Errorf("unsupported action type: %s", action.Type)
	}
}

// executeModifyContentAction 执行内容修改动作
func (s *TriggerService) executeModifyContentAction(action models.TriggerActionConfig, email models.Email) (*models.Email, error) {
	// 解析配置，支持Go模板和JS
	config := action.Config

	// 创建邮件副本
	modifiedEmail := email

	// 使用Go模板处理配置
	funcMap := template.FuncMap{
		"replace":  strings.ReplaceAll,
		"toLower":  strings.ToLower,
		"toUpper":  strings.ToUpper,
		"trim":     strings.TrimSpace,
		"contains": strings.Contains,
	}

	tmpl, err := template.New("action").Funcs(funcMap).Parse(config)
	if err != nil {
		return &email, fmt.Errorf("invalid action template: %w", err)
	}

	// 创建数据结构
	data := struct {
		*models.Email
		AllText string
	}{
		Email:   &email,
		AllText: strings.Join([]string{email.Subject, email.Body, email.HTMLBody}, " "),
	}

	var result strings.Builder
	err = tmpl.Execute(&result, data)
	if err != nil {
		return &email, fmt.Errorf("action template execution failed: %w", err)
	}

	// 解析结果为JSON，期望包含修改后的字段
	var modifications map[string]interface{}
	if err := json.Unmarshal([]byte(result.String()), &modifications); err != nil {
		// 如果不是JSON，将结果作为body内容
		modifiedEmail.Body = result.String()
	} else {
		// 应用修改
		if subject, ok := modifications["subject"].(string); ok {
			modifiedEmail.Subject = subject
		}
		if body, ok := modifications["body"].(string); ok {
			modifiedEmail.Body = body
		}
		if htmlBody, ok := modifications["html_body"].(string); ok {
			modifiedEmail.HTMLBody = htmlBody
		}
	}

	return &modifiedEmail, nil
}

// updateTriggerStatistics 更新触发器统计信息
func (s *TriggerService) updateTriggerStatistics(trigger *models.EmailTrigger, success bool, errorMsg string) {
	now := time.Now()
	totalExecutions := trigger.TotalExecutions + 1
	successExecutions := trigger.SuccessExecutions
	if success {
		successExecutions++
	}

	lastError := ""
	if !success {
		lastError = errorMsg
	}

	if err := s.triggerRepo.UpdateStatistics(trigger.ID, totalExecutions, successExecutions, &now, lastError); err != nil {
		log.Printf("[TriggerService] Failed to update trigger statistics: %v", err)
	}
}

// GetWorkerStatus 获取worker状态
func (s *TriggerService) GetWorkerStatus() map[uint]map[string]interface{} {
	s.workersMu.RLock()
	defer s.workersMu.RUnlock()

	status := make(map[uint]map[string]interface{})
	for triggerID, worker := range s.workers {
		worker.mu.RLock()
		status[triggerID] = map[string]interface{}{
			"worker_id":       worker.ID,
			"trigger_id":      worker.TriggerID,
			"trigger_name":    worker.Trigger.Name,
			"is_running":      worker.IsRunning,
			"last_check_time": worker.LastCheckTime,
			"check_interval":  worker.Trigger.CheckInterval,
		}
		worker.mu.RUnlock()
	}

	return status
}
