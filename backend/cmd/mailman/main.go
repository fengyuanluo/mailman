package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "mailman/docs" // This is required for swag to find your docs
	"mailman/internal/api"
	"mailman/internal/config"
	"mailman/internal/database"
	"mailman/internal/repository"
	"mailman/internal/services"
	"mailman/internal/utils"
)

// @title Mailman API
// @version 1.0
// @description This is a sample server for a mailman service.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /
func main() {
	// Initialize logger with configured log level
	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "INFO" // Default log level
	}

	mainLogger := utils.NewLogger("Main")
	mainLogger.Info("Starting Mailman Service with log level: %s", logLevel)

	// Load configuration
	cfg := config.Load()

	// Initialize database
	dbConfig := database.Config{
		Driver:   cfg.Database.Driver,
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.DBName,
		SSLMode:  cfg.Database.SSLMode,
	}

	if err := database.Initialize(dbConfig); err != nil {
		mainLogger.Error("Failed to initialize database: %v", err)
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	db := database.GetDB()

	// Initialize repositories
	mailProviderRepo := repository.NewMailProviderRepository(db)
	emailAccountRepo := repository.NewEmailAccountRepository(db)
	emailRepo := repository.NewEmailRepository(db)
	incrementalSyncRepo := repository.NewIncrementalSyncRepository(db)
	extractorTemplateRepo := repository.NewExtractorTemplateRepository(db)
	openAIConfigRepo := repository.NewOpenAIConfigRepository(db)
	aiPromptTemplateRepo := repository.NewAIPromptTemplateRepository(db)
	userRepo := repository.NewUserRepository(db)
	userSessionRepo := repository.NewUserSessionRepository(db)
	syncConfigRepo := repository.NewSyncConfigRepository(db)
	mailboxRepo := repository.NewMailboxRepository(db)
	triggerRepo := repository.NewTriggerRepository(db)
	triggerLogRepo := repository.NewTriggerExecutionLogRepository(db)
	oauth2GlobalConfigRepo := repository.NewOAuth2GlobalConfigRepository(db)

	// Seed default mail providers
	if err := mailProviderRepo.SeedDefaultProviders(); err != nil {
		mainLogger.Warn("Failed to seed default providers: %v", err)
	}

	// Initialize services with repositories
	fetcherService := services.NewFetcherService(emailAccountRepo, emailRepo)
	parserService := services.NewParserService()
	authService := services.NewAuthService(userRepo, userSessionRepo)
	oauth2Service := services.NewOAuth2Service()
	oauth2ConfigService := services.NewOAuth2GlobalConfigService(oauth2GlobalConfigRepo)

	// Initialize activity logger service (singleton)
	activityLogger := services.GetActivityLogger()
	mainLogger.Info("Activity logger service initialized")

	// Initialize email fetch scheduler
	schedulerConfig := services.DefaultSchedulerConfig()
	emailFetchScheduler := services.NewEmailFetchScheduler(fetcherService, emailAccountRepo, schedulerConfig)

	// Start the scheduler
	if err := emailFetchScheduler.Start(); err != nil {
		mainLogger.Error("Failed to start email fetch scheduler: %v", err)
		log.Fatalf("Failed to start email fetch scheduler: %v", err)
	}

	// Initialize incremental sync manager (使用优化版实现)
	mainLogger.Info("正在初始化优化版增量同步管理器...")
	incrementalSyncManager := services.NewOptimizedIncrementalSyncManager(emailFetchScheduler, syncConfigRepo, emailRepo, mailboxRepo, fetcherService)
	if err := incrementalSyncManager.Start(); err != nil {
		mainLogger.Warn("Failed to start optimized incremental sync manager: %v", err)
	}

	// Initialize subscription manager (needed for trigger service)
	subscriptionManager := services.NewSubscriptionManager()

	// Initialize trigger service
	mainLogger.Info("正在初始化触发器服务...")
	triggerService := services.NewTriggerService(triggerRepo, triggerLogRepo, emailRepo, subscriptionManager)
	if err := triggerService.Start(); err != nil {
		mainLogger.Error("Failed to start trigger service: %v", err)
		log.Fatalf("Failed to start trigger service: %v", err)
	}

	// Initialize API handler
	apiHandler := api.NewAPIHandler(fetcherService, parserService, emailAccountRepo, mailProviderRepo, emailRepo, incrementalSyncRepo, emailFetchScheduler)

	// Initialize OpenAI handler
	openAIHandler := api.NewOpenAIHandler(openAIConfigRepo, aiPromptTemplateRepo, extractorTemplateRepo)

	// Initialize Auth handler
	authHandler := api.NewAuthHandler(authService, userRepo)

	// Initialize Sync handlers
	syncHandlers := api.NewSyncHandlers(syncConfigRepo, incrementalSyncManager, mailboxRepo, fetcherService, emailAccountRepo)

	// Initialize Session handler
	sessionHandler := api.NewSessionHandler(authService)

	// Initialize Trigger handler
	triggerHandler := api.NewTriggerAPIHandler(triggerService, triggerRepo, triggerLogRepo)

	// Initialize OAuth2 handler
	oauth2Handler := api.NewOAuth2Handler(oauth2ConfigService, oauth2Service)

	// Initialize default AI prompt templates
	if err := aiPromptTemplateRepo.InitializeDefaultTemplates(); err != nil {
		mainLogger.Warn("Failed to initialize default AI prompt templates: %v", err)
	}

	// Create router with authentication
	router := api.NewRouterWithAuth(apiHandler, openAIHandler, authHandler, syncHandlers, sessionHandler, triggerHandler, oauth2Handler, authService)

	// Create HTTP server
	srv := &http.Server{
		Addr:    cfg.ServerAddress(),
		Handler: router,
	}

	// Setup graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		mainLogger.Info("Server is running on http://%s", cfg.ServerAddress())
		fmt.Printf("Server is running on http://%s\n", cfg.ServerAddress())
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			mainLogger.Error("Server failed to start: %v", err)
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-stop
	mainLogger.Info("Shutting down server...")
	fmt.Println("\nShutting down server...")

	// Create a deadline to wait for
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Stop activity logger
	mainLogger.Info("Stopping activity logger...")
	activityLogger.Stop()

	// Stop trigger service first
	mainLogger.Info("Stopping trigger service...")
	triggerService.Stop()

	// Stop incremental sync manager
	mainLogger.Info("Stopping incremental sync manager...")
	incrementalSyncManager.Stop()

	// Stop email fetch scheduler
	mainLogger.Info("Stopping email fetch scheduler...")
	emailFetchScheduler.Stop()

	// Gracefully shutdown the HTTP server
	mainLogger.Info("Shutting down HTTP server...")
	if err := srv.Shutdown(ctx); err != nil {
		mainLogger.Error("Server forced to shutdown: %v", err)
	}

	mainLogger.Info("Server shutdown complete")
}
