import { apiClient } from '@/lib/api-client'

export interface SyncConfig {
    id: number
    account_id: number
    enable_auto_sync: boolean
    sync_interval: number
    sync_folders: string[]
    last_sync_time?: string
    last_sync_error?: string
    sync_status: string
    created_at: string
    updated_at: string
}

export interface TemporarySyncConfig {
    id: number
    account_id: number
    sync_interval: number
    sync_folders: string[]
    expires_at: string
    created_at: string
    updated_at: string
}

export interface CreateTemporarySyncConfigRequest {
    sync_interval: number
    sync_folders: string[]
    duration_minutes: number
}

export interface EffectiveSyncConfigResponse {
    config: SyncConfig
    is_temporary: boolean
    expires_at?: string
}

export interface UpdateSyncConfigRequest {
    enable_auto_sync?: boolean
    sync_interval?: number
    sync_folders?: string[]
}

export const syncConfigService = {
    // 获取账户的同步配置
    async getAccountSyncConfig(accountId: number): Promise<SyncConfig> {
        const response = await apiClient.get<SyncConfig>(`/accounts/${accountId}/sync-config`)
        return response
    },

    // 创建账户的同步配置
    async createAccountSyncConfig(accountId: number, data: UpdateSyncConfigRequest): Promise<SyncConfig> {
        const response = await apiClient.post<SyncConfig>(`/accounts/${accountId}/sync-config`, data)
        return response
    },

    // 更新账户的同步配置
    async updateAccountSyncConfig(accountId: number, data: UpdateSyncConfigRequest): Promise<SyncConfig> {
        const response = await apiClient.put<SyncConfig>(`/accounts/${accountId}/sync-config`, data)
        return response
    },

    // 删除账户的同步配置
    async deleteAccountSyncConfig(accountId: number): Promise<void> {
        await apiClient.delete(`/accounts/${accountId}/sync-config`)
    },

    // 获取账户的有效同步配置（考虑三级优先级）
    async getEffectiveSyncConfig(accountId: number): Promise<EffectiveSyncConfigResponse> {
        const response = await apiClient.get<EffectiveSyncConfigResponse>(`/accounts/${accountId}/sync-config/effective`)
        return response
    },

    // 创建临时同步配置
    async createTemporarySyncConfig(accountId: number, data: CreateTemporarySyncConfigRequest): Promise<TemporarySyncConfig> {
        const response = await apiClient.post<TemporarySyncConfig>(`/accounts/${accountId}/sync-config/temporary`, data)
        return response
    },

    // 立即同步
    async syncNow(accountId: number): Promise<{
        success: boolean
        emails_synced: number
        duration: string
        error?: string
    }> {
        const response = await apiClient.post(`/accounts/${accountId}/sync-now`)
        return response
    },

    // 获取全局同步配置
    async getGlobalSyncConfig(): Promise<{
        default_enable_sync: boolean
        default_sync_interval: number
        default_sync_folders: string[]
        max_sync_workers: number
        max_emails_per_sync: number
    }> {
        const response = await apiClient.get('/sync/global-config')
        return response
    },

    // 更新全局同步配置
    async updateGlobalSyncConfig(data: {
        default_enable_sync?: boolean
        default_sync_interval?: number
        default_sync_folders?: string[]
        max_sync_workers?: number
        max_emails_per_sync?: number
    }): Promise<any> {
        const response = await apiClient.put('/sync/global-config', data)
        return response
    }
}
