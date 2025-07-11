package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"mailman/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Config holds database configuration
type Config struct {
	Driver   string
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// Initialize sets up the database connection
func Initialize(config Config) error {
	var err error
	var dialector gorm.Dialector

	// Create custom logger
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	gormConfig := &gorm.Config{
		Logger: newLogger,
	}

	switch config.Driver {
	case "sqlite":
		dialector = sqlite.Open(config.DBName)
	case "mysql":
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			config.User, config.Password, config.Host, config.Port, config.DBName)
		dialector = mysql.Open(dsn)
	case "postgres":
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
			config.Host, config.User, config.Password, config.DBName, config.Port, config.SSLMode)
		dialector = postgres.Open(dsn)
	default:
		return fmt.Errorf("unsupported database driver: %s", config.Driver)
	}

	DB, err = gorm.Open(dialector, gormConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Run migrations
	if err := Migrate(); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// Migrate runs database migrations
func Migrate() error {
	// 首先迁移除了OAuth2GlobalConfig之外的所有表
	if err := DB.AutoMigrate(
		&models.MailProvider{},
		&models.EmailAccount{},
		&models.Email{},
		&models.Attachment{},
		&models.Mailbox{},
		&models.IncrementalSyncRecord{},
		&models.ExtractorTemplate{},
		&models.OpenAIConfig{},
		&models.AIPromptTemplate{},
		&models.AIGeneratedTemplate{},
		&models.User{},
		&models.UserSession{},
		&models.EmailAccountSyncConfig{},
		&models.GlobalSyncConfig{},
		&models.SyncStatistics{},
		&models.ActivityLog{},
		&models.EmailTrigger{},
		&models.TriggerExecutionLog{},
		&models.OAuth2AuthSession{},
	); err != nil {
		return fmt.Errorf("failed to migrate tables: %w", err)
	}

	// 单独处理OAuth2GlobalConfig的迁移
	if err := migrateOAuth2GlobalConfig(); err != nil {
		return fmt.Errorf("failed to migrate OAuth2GlobalConfig: %w", err)
	}

	return nil
}

// migrateOAuth2GlobalConfig 处理OAuth2GlobalConfig的完整迁移
func migrateOAuth2GlobalConfig() error {
	// 检查表是否存在
	if !DB.Migrator().HasTable(&models.OAuth2GlobalConfig{}) {
		// 表不存在，直接创建
		return DB.AutoMigrate(&models.OAuth2GlobalConfig{})
	}

	// 检查name字段是否存在
	if !DB.Migrator().HasColumn(&models.OAuth2GlobalConfig{}, "name") {
		// 添加name字段（允许为空）
		if err := DB.Exec("ALTER TABLE o_auth2_global_configs ADD COLUMN name TEXT").Error; err != nil {
			return fmt.Errorf("failed to add name column: %w", err)
		}

		// 为现有记录更新name字段
		if err := DB.Exec("UPDATE o_auth2_global_configs SET name = 'Default ' || provider_type || ' Config' WHERE name IS NULL OR name = ''").Error; err != nil {
			return fmt.Errorf("failed to update name field for existing records: %w", err)
		}
	}

	// 检查是否需要更新其他字段
	return DB.AutoMigrate(&models.OAuth2GlobalConfig{})
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// Close closes the database connection
func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
