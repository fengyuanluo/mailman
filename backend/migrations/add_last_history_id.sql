-- 添加Gmail API History ID字段到同步配置表
-- 用于支持Gmail API增量同步

ALTER TABLE email_account_sync_configs 
ADD COLUMN last_history_id VARCHAR(255) DEFAULT '' COMMENT 'Gmail API History ID for incremental sync';

-- 为新字段添加索引以提升查询性能
CREATE INDEX idx_email_account_sync_configs_last_history_id ON email_account_sync_configs(last_history_id);