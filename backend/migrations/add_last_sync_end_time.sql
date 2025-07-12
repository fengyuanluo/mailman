-- Add LastSyncEndTime field to EmailAccountSyncConfig table
-- This field stores the end time of the last sync operation to ensure proper time window management

ALTER TABLE email_account_sync_configs 
ADD COLUMN last_sync_end_time DATETIME NULL 
COMMENT '上次同步结束时间，用于下次增量同步的时间窗口计算';

-- Update existing records to set last_sync_end_time to last_sync_time if it exists
UPDATE email_account_sync_configs 
SET last_sync_end_time = last_sync_time 
WHERE last_sync_time IS NOT NULL AND last_sync_end_time IS NULL;