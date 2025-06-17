import { apiClient } from '@/lib/api-client';

// 用户会话接口
export interface UserSession {
    id: number;
    user_id: number;
    token: string;
    expires_at: string;
    created_at: string;
    updated_at: string;
}

// 会话分页响应
export interface SessionsResponse {
    sessions: UserSession[];
    total: number;
    page: number;
    limit: number;
}

// 创建会话请求
export interface CreateSessionRequest {
    expires_in_days: number;
}

// 更新会话请求
export interface UpdateSessionRequest {
    expires_in_days: number;
}

/**
 * 用户会话服务
 * 提供对用户会话的管理功能，包括获取会话列表、创建会话、更新会话、删除会话等
 */
export class UserSessionService {
    /**
     * 获取用户会话列表
     * @param page 页码
     * @param limit 每页数量
     * @returns 会话列表及分页信息
     */
    static async getUserSessions(page: number = 1, limit: number = 10): Promise<SessionsResponse> {
      return await apiClient.get<SessionsResponse>(`/sessions?page=${page}&limit=${limit}`);
    }

    /**
     * 创建新会话
     * @param data 会话参数
     * @returns 创建的会话
     */
    static async createSession(data: CreateSessionRequest): Promise<UserSession> {
      return await apiClient.post<UserSession>('/sessions', data);
    }

    /**
     * 删除会话
     * @param id 会话ID
     * @returns 成功消息
     */
    static async deleteSession(id: number): Promise<{ message: string }> {
      return await apiClient.delete<{ message: string }>(`/sessions/${id}`);
    }

    /**
     * 更新会话过期时间
     * @param id 会话ID
     * @param data 更新参数
     * @returns 更新后的会话
     */
    static async updateSession(id: number, data: UpdateSessionRequest): Promise<UserSession> {
      return await apiClient.put<UserSession>(`/sessions/${id}`, data);
    }

    /**
     * 格式化过期时间为易读的形式
     * @param expiresAt ISO格式的过期时间
     * @returns 格式化后的时间字符串
     */
    static formatExpiresAt(expiresAt: string): string {
        const date = new Date(expiresAt);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    /**
     * 计算会话是否已过期
     * @param expiresAt ISO格式的过期时间
     * @returns 是否已过期
     */
    static isExpired(expiresAt: string): boolean {
        const now = new Date();
        const expiry = new Date(expiresAt);
        return now > expiry;
    }

    /**
     * 计算会话剩余有效时间（天）
     * @param expiresAt ISO格式的过期时间
     * @returns 剩余天数
     */
    static getRemainingDays(expiresAt: string): number {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }
}