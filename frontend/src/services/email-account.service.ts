import { apiClient } from '@/lib/api-client';
import {
    EmailAccount,
    CreateEmailAccountRequest,
    UpdateEmailAccountRequest,
    PaginationParams,
    PaginatedResponse
} from '@/types';

// 同步响应类型
export interface FetchAndStoreResponse {
    status: string;
    sync_mode: string;
    total_emails_processed: number;
    total_new_emails: number;
    processing_time_ms: number;
    mailbox_results: MailboxSyncResult[];
    messages?: string[];
}

// 邮箱同步结果
export interface MailboxSyncResult {
    mailbox: string;
    emails_processed: number;
    new_emails: number;
    last_sync_time?: string;
    error?: string;
}

export class EmailAccountService {
    private basePath = '/accounts';

    /**
     * 获取所有邮箱账户
     */
    async getAccounts(params?: PaginationParams): Promise<EmailAccount[]> {
        // 注意：根据Swagger文档，这个接口返回的是数组，不是分页响应
        const response = await apiClient.get<EmailAccount[]>(
            this.basePath,
            { params }
        );
        return response;
    }

    async getAccountsPaginated(params?: PaginationParams): Promise<PaginatedResponse<EmailAccount>> {
        const response = await apiClient.get<PaginatedResponse<EmailAccount>>(
            `${this.basePath}/paginated`,
            { params }
        );
        return response;
    }

    /**
     * 获取单个邮箱账户
     */
    async getAccount(id: number): Promise<EmailAccount> {
        const response = await apiClient.get<EmailAccount>(`${this.basePath}/${id}`);
        return response;
    }

    /**
     * 创建邮箱账户
     */
    async createAccount(data: CreateEmailAccountRequest): Promise<EmailAccount> {
        // 转换为后端期望的格式
        const payload: any = {
            emailAddress: data.email_address,
            authType: data.auth_type || 'password',
            mailProviderId: data.mail_provider_id,
            password: data.password,
            token: data.token,
            proxy: data.proxy,
            isDomainMail: data.is_domain_mail || false,
            domain: data.domain,
            customSettings: data.custom_settings
        };

        // 移除未定义的字段
        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined) {
                delete payload[key];
            }
        });

        const response = await apiClient.post<EmailAccount>(this.basePath, payload);
        return response;
    }

    /**
     * 更新邮箱账户
     */
    async updateAccount(id: number, data: UpdateEmailAccountRequest): Promise<EmailAccount> {
        // 转换为后端期望的格式
        const payload: any = {
            emailAddress: data.email_address,
            authType: data.auth_type,
            mailProviderId: data.mail_provider_id,
            password: data.password,
            token: data.token,
            proxy: data.proxy,
            isDomainMail: data.is_domain_mail,
            domain: data.domain,
            customSettings: data.custom_settings
        };

        // 移除未定义的字段
        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined) {
                delete payload[key];
            }
        });

        const response = await apiClient.put<EmailAccount>(`${this.basePath}/${id}`, payload);
        return response;
    }

    /**
     * 删除邮箱账户
     */
    async deleteAccount(id: number): Promise<void> {
        await apiClient.delete(`${this.basePath}/${id}`);
    }

    /**
     * 同步邮箱账户（获取并存储邮件）
     */
    async syncAccount(
        id: number,
        options?: {
            sync_mode?: 'incremental' | 'full';
            mailboxes?: string[];
            max_emails_per_mailbox?: number;
            include_body?: boolean;
            default_start_date?: string;
            end_date?: string;
        }
    ): Promise<FetchAndStoreResponse> {
        const response = await apiClient.post<FetchAndStoreResponse>(
            `/account-emails/fetch/${id}`,
            options
        );
        return response;
    }

    /**
     * 获取账户的增量同步记录
     */
    async getSyncRecords(id: number): Promise<any[]> {
        const response = await apiClient.get<any[]>(`${this.basePath}/${id}/sync-records`);
        return response;
    }

    /**
     * 获取账户的最后一次同步记录
     */
    async getLastSyncRecord(id: number): Promise<any> {
        const response = await apiClient.get<any>(`${this.basePath}/${id}/last-sync-record`);
        return response;
    }

    /**
     * 删除增量同步记录（强制下次完全同步）
     */
    async deleteSyncRecord(id: number, mailbox: string): Promise<void> {
        await apiClient.delete(
            `${this.basePath}/${id}/sync-records`,
            { params: { mailbox } }
        );
    }

    /**
     * 批量同步邮箱账户（如果后端支持）
     */
    async batchSyncAccounts(ids: number[]): Promise<{ results: any[] }> {
        // 注意：这个接口在Swagger文档中没有定义，可能需要后端实现
        const response = await apiClient.post<{ results: any[] }>(
            `${this.basePath}/batch-sync`,
            { account_ids: ids }
        );
        return response;
    }

    /**
     * 测试邮箱连接（如果后端支持）
     */
    async testConnection(data: CreateEmailAccountRequest): Promise<{ success: boolean; message: string }> {
        // 注意：这个接口在Swagger文档中没有定义，可能需要后端实现
        const response = await apiClient.post<{ success: boolean; message: string }>(
            `${this.basePath}/test-connection`,
            data
        );
        return response;
    }

    /**
     * 验证账户连接性
     */
    async verifyAccount(data: {
        account_id?: number;
        email_address?: string;
        password?: string;
        auth_type?: string;
        mail_provider_id?: number;
        custom_settings?: Record<string, string>;
        proxy?: string;
    }): Promise<{ success: boolean; message: string; error?: string }> {
        const response = await apiClient.post<{ success: boolean; message: string; error?: string }>(
            `${this.basePath}/verify`,
            data
        );
        return response;
    }

    /**
     * 获取支持的邮件服务商列表
     */
    async getProviders(): Promise<any[]> {
        const response = await apiClient.get<any[]>('/providers');
        return response;
    }
}

// 导出单例实例
export const emailAccountService = new EmailAccountService();