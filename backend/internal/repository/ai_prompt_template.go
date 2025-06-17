package repository

import (
	"mailman/internal/models"

	"gorm.io/gorm"
)

// AIPromptTemplateRepository handles database operations for AI prompt templates
type AIPromptTemplateRepository struct {
	db *gorm.DB
}

// NewAIPromptTemplateRepository creates a new AI prompt template repository
func NewAIPromptTemplateRepository(db *gorm.DB) *AIPromptTemplateRepository {
	return &AIPromptTemplateRepository{db: db}
}

// GetByScenario returns an active prompt template by scenario
func (r *AIPromptTemplateRepository) GetByScenario(scenario string) (*models.AIPromptTemplate, error) {
	var template models.AIPromptTemplate
	err := r.db.Where("scenario = ? AND is_active = ?", scenario, true).First(&template).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

// GetByID returns a prompt template by ID
func (r *AIPromptTemplateRepository) GetByID(id uint) (*models.AIPromptTemplate, error) {
	var template models.AIPromptTemplate
	err := r.db.First(&template, id).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

// List returns all prompt templates
func (r *AIPromptTemplateRepository) List() ([]models.AIPromptTemplate, error) {
	var templates []models.AIPromptTemplate
	err := r.db.Find(&templates).Error
	return templates, err
}

// ListByScenario returns all templates for a specific scenario
func (r *AIPromptTemplateRepository) ListByScenario(scenario string) ([]models.AIPromptTemplate, error) {
	var templates []models.AIPromptTemplate
	err := r.db.Where("scenario = ?", scenario).Find(&templates).Error
	return templates, err
}

// Create creates a new prompt template
func (r *AIPromptTemplateRepository) Create(template *models.AIPromptTemplate) error {
	return r.db.Create(template).Error
}

// Update updates an existing prompt template
func (r *AIPromptTemplateRepository) Update(template *models.AIPromptTemplate) error {
	return r.db.Save(template).Error
}

// Delete deletes a prompt template
func (r *AIPromptTemplateRepository) Delete(id uint) error {
	return r.db.Delete(&models.AIPromptTemplate{}, id).Error
}

// SetActive sets a template as active for its scenario and deactivates others
func (r *AIPromptTemplateRepository) SetActive(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Get the template to find its scenario
		var template models.AIPromptTemplate
		if err := tx.First(&template, id).Error; err != nil {
			return err
		}

		// Deactivate all templates for this scenario
		if err := tx.Model(&models.AIPromptTemplate{}).Where("scenario = ? AND is_active = ?", template.Scenario, true).Update("is_active", false).Error; err != nil {
			return err
		}

		// Activate the specified template
		return tx.Model(&models.AIPromptTemplate{}).Where("id = ?", id).Update("is_active", true).Error
	})
}

// InitializeDefaultTemplates creates default prompt templates if they don't exist
func (r *AIPromptTemplateRepository) InitializeDefaultTemplates() error {
	defaultTemplates := []models.AIPromptTemplate{
		{
			Scenario:    "email_template_generation",
			Name:        "邮件模板生成器",
			Description: "用于生成邮件提取模板的 AI 提示",
			SystemPrompt: `你是一个专业的邮件模板生成助手。你的任务是根据用户的需求，生成用于提取邮件信息的模板配置。

模板配置必须是一个 JSON 数组，每个元素包含以下字段：
- field: 要从中提取的字段（可选值：from, to, cc, subject, body, html_body, headers, ALL）
- type: 提取类型（可选值：regex, js, gotemplate）
- match: （可选）匹配条件，返回 {matched: boolean, reason?: string}
- extract: 提取规则，返回提取的字符串或 null

示例配置：
[
  {
    "field": "subject",
    "type": "regex",
    "extract": "订单号[：:]\\s*([A-Z0-9]+)"
  },
  {
    "field": "body",
    "type": "regex",
    "match": "发货通知",
    "extract": "快递单号[：:]\\s*([A-Z0-9]+)"
  }
]

请根据用户的描述，生成合适的提取模板配置。确保返回的是有效的 JSON 数组格式。`,
			UserPrompt:  "",
			Variables:   models.JSONMap{"user_input": "用户输入的需求描述"},
			MaxTokens:   1500,
			Temperature: 0.7,
			IsActive:    true,
		},
	}

	for _, template := range defaultTemplates {
		// Check if template already exists
		var existing models.AIPromptTemplate
		err := r.db.Where("scenario = ?", template.Scenario).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			// Create the template
			if err := r.db.Create(&template).Error; err != nil {
				return err
			}
		}
	}

	return nil
}
