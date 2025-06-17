import { apiClient } from '@/lib/api-client';
import {
    OAuth2GlobalConfig,
    CreateOAuth2ConfigRequest,
    UpdateOAuth2ConfigRequest,
    OAuth2AuthUrlRequest,
    OAuth2AuthUrlResponse,
    OAuth2TokenExchangeRequest,
    OAuth2TokenResponse,
    OAuth2RefreshTokenRequest,
    OAuth2ProviderType
} from '@/types';

export class OAuth2Service {
    private basePath = '/oauth2';

    /**
     * 创建或更新OAuth2全局配置
     */
    async createOrUpdateGlobalConfig(config: CreateOAuth2ConfigRequest): Promise<OAuth2GlobalConfig> {
        const response = await apiClient.post<OAuth2GlobalConfig>(
            `${this.basePath}/global-config`,
            config
        );
        return response;
    }

    /**
     * 获取所有OAuth2全局配置
     */
    async getGlobalConfigs(): Promise<OAuth2GlobalConfig[]> {
        const response = await apiClient.get<OAuth2GlobalConfig[]>(
            `${this.basePath}/global-configs`
        );
        return response;
    }

    // 别名方法用于兼容性
    async getConfigs(): Promise<OAuth2GlobalConfig[]> {
        return this.getGlobalConfigs();
    }

    /**
     * 根据提供商获取OAuth2全局配置
     */
    async getGlobalConfigByProvider(provider: OAuth2ProviderType): Promise<OAuth2GlobalConfig> {
        const response = await apiClient.get<OAuth2GlobalConfig>(
            `${this.basePath}/global-config/${provider}`
        );
        return response;
    }

    /**
     * 删除OAuth2全局配置
     */
    async deleteGlobalConfig(id: number): Promise<void> {
        await apiClient.delete(`${this.basePath}/global-config/${id}`);
    }

    /**
     * 生成OAuth2授权URL
     */
    async getAuthUrl(provider: OAuth2ProviderType): Promise<OAuth2AuthUrlResponse> {
        const response = await apiClient.get<OAuth2AuthUrlResponse>(
            `${this.basePath}/auth-url/${provider}`
        );
        return response;
    }

    /**
     * 处理OAuth2回调（获取令牌）
     */
    async handleCallback(provider: OAuth2ProviderType, code: string, state: string): Promise<OAuth2TokenResponse> {
        const response = await apiClient.get<OAuth2TokenResponse>(
            `${this.basePath}/callback/${provider}`,
            {
                params: { code, state }
            }
        );
        return response;
    }

    /**
     * 交换授权码为访问令牌
     */
    async exchangeToken(request: OAuth2TokenExchangeRequest): Promise<OAuth2TokenResponse> {
        const response = await apiClient.post<OAuth2TokenResponse>(
            `${this.basePath}/exchange-token`,
            request
        );
        return response;
    }

    /**
     * 刷新访问令牌
     */
    async refreshToken(request: OAuth2RefreshTokenRequest): Promise<OAuth2TokenResponse> {
        const response = await apiClient.post<OAuth2TokenResponse>(
            `${this.basePath}/refresh-token`,
            request
        );
        return response;
    }

    /**
     * 启用OAuth2提供商
     */
    async enableProvider(provider: OAuth2ProviderType): Promise<void> {
        await apiClient.post(`${this.basePath}/provider/${provider}/enable`);
    }

    /**
     * 禁用OAuth2提供商
     */
    async disableProvider(provider: OAuth2ProviderType): Promise<void> {
        await apiClient.post(`${this.basePath}/provider/${provider}/disable`);
    }

    /**
     * 检查提供商是否已配置
     */
    async isProviderConfigured(provider: OAuth2ProviderType): Promise<boolean> {
        try {
            const config = await this.getGlobalConfigByProvider(provider);
            return config.is_enabled && !!config.client_id && !!config.client_secret;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取支持的OAuth2提供商列表
     */
    getSupportedProviders(): OAuth2ProviderType[] {
        return ['gmail', 'outlook'];
    }

    /**
     * 获取提供商的显示名称
     */
    getProviderDisplayName(provider: OAuth2ProviderType): string {
        const displayNames = {
            gmail: 'Gmail',
            outlook: 'Outlook'
        };
        return displayNames[provider] || provider;
    }

    /**
     * 获取提供商的默认作用域
     */
    getDefaultScopes(provider: OAuth2ProviderType): string[] {
        const defaultScopes = {
            gmail: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.modify'
            ],
            outlook: [
                'https://graph.microsoft.com/mail.read',
                'https://graph.microsoft.com/mail.send',
                'https://graph.microsoft.com/mail.readwrite'
            ]
        };
        return defaultScopes[provider] || [];
    }

    /**
     * 验证OAuth2配置
     */
    validateConfig(config: CreateOAuth2ConfigRequest): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!config.provider_type) {
            errors.push('提供商是必需的');
        } else if (!this.getSupportedProviders().includes(config.provider_type)) {
            errors.push('不支持的提供商');
        }

        if (!config.client_id?.trim()) {
            errors.push('客户端ID是必需的');
        }

        if (!config.client_secret?.trim()) {
            errors.push('客户端密钥是必需的');
        }

        if (!config.redirect_uri?.trim()) {
            errors.push('重定向URI是必需的');
        } else {
            try {
                new URL(config.redirect_uri);
            } catch {
                errors.push('重定向URI格式无效');
            }
        }

        if (!config.scopes || config.scopes.length === 0) {
            errors.push('至少需要一个作用域');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// 导出单例实例
export const oauth2Service = new OAuth2Service();