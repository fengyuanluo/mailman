package repository

import (
	"errors"
	"mailman/internal/models"

	"gorm.io/gorm"
)

// ExtractorTemplateRepository handles database operations for ExtractorTemplate
type ExtractorTemplateRepository struct {
	db *gorm.DB
}

// NewExtractorTemplateRepository creates a new ExtractorTemplateRepository
func NewExtractorTemplateRepository(db *gorm.DB) *ExtractorTemplateRepository {
	return &ExtractorTemplateRepository{db: db}
}

// Create creates a new extractor template
func (r *ExtractorTemplateRepository) Create(template *models.ExtractorTemplate) error {
	return r.db.Create(template).Error
}

// GetByID retrieves an extractor template by ID
func (r *ExtractorTemplateRepository) GetByID(id uint) (*models.ExtractorTemplate, error) {
	var template models.ExtractorTemplate
	err := r.db.First(&template, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("extractor template not found")
		}
		return nil, err
	}
	return &template, nil
}

// GetByName retrieves an extractor template by name
func (r *ExtractorTemplateRepository) GetByName(name string) (*models.ExtractorTemplate, error) {
	var template models.ExtractorTemplate
	err := r.db.Where("name = ?", name).First(&template).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("extractor template not found")
		}
		return nil, err
	}
	return &template, nil
}

// GetAll retrieves all extractor templates
func (r *ExtractorTemplateRepository) GetAll() ([]models.ExtractorTemplate, error) {
	var templates []models.ExtractorTemplate
	err := r.db.Find(&templates).Error
	return templates, err
}

// Update updates an existing extractor template
func (r *ExtractorTemplateRepository) Update(template *models.ExtractorTemplate) error {
	return r.db.Save(template).Error
}

// Delete soft deletes an extractor template
func (r *ExtractorTemplateRepository) Delete(id uint) error {
	return r.db.Delete(&models.ExtractorTemplate{}, id).Error
}

// HardDelete permanently deletes an extractor template
func (r *ExtractorTemplateRepository) HardDelete(id uint) error {
	return r.db.Unscoped().Delete(&models.ExtractorTemplate{}, id).Error
}

// GetAllPaginated retrieves extractor templates with pagination and search
func (r *ExtractorTemplateRepository) GetAllPaginated(page, limit int, sortBy, sortOrder, search string) ([]models.ExtractorTemplate, int64, error) {
	var templates []models.ExtractorTemplate
	var total int64

	// 构建查询
	query := r.db.Model(&models.ExtractorTemplate{})

	// 添加搜索条件（根据名称模糊查询）
	if search != "" {
		query = query.Where("name LIKE ?", "%"+search+"%")
	}

	// 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 添加排序
	if sortBy != "" {
		order := sortBy + " " + sortOrder
		query = query.Order(order)
	} else {
		// 默认按创建时间降序排序
		query = query.Order("created_at desc")
	}

	// 添加分页
	offset := (page - 1) * limit
	query = query.Offset(offset).Limit(limit)

	// 执行查询
	if err := query.Find(&templates).Error; err != nil {
		return nil, 0, err
	}

	return templates, total, nil
}
