import { apiClient } from '@/lib/api-client';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface UpdateUserRequest {
    username?: string;
    email?: string;
    avatar?: string;
    old_password?: string;
    new_password?: string;
}

export interface LoginResponse {
    token: string;
    user: {
        id: number;
        username: string;
        email: string;
        avatar?: string;
        is_admin: boolean;
        created_at: string;
    };
}

export interface User {
    id: number;
    username: string;
    email: string;
    avatar?: string;
    is_admin: boolean;
    created_at: string;
}

class AuthService {
    // 登录
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/login', credentials);

        // 保存token
        if (response.token) {
            apiClient.setAuthToken(response.token);
            // 保存用户信息
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }
        }

        return response;
    }

    // 登出
    async logout(): Promise<void> {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            // 即使API调用失败，也要清理本地状态
            console.error('Logout API error:', error);
        } finally {
            // 清理本地存储
            apiClient.clearAuthToken();
            localStorage.removeItem('user');
        }
    }

    // 获取当前用户信息
    async getCurrentUser(): Promise<User> {
        const response = await apiClient.get<User>('/auth/me');
        // 更新本地存储的用户信息
        localStorage.setItem('user', JSON.stringify(response));
        return response;
    }

    // 检查是否已登录
    isAuthenticated(): boolean {
        const token = localStorage.getItem('auth_token');
        return !!token;
    }

    // 获取本地存储的用户信息
    getLocalUser(): User | null {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch {
                return null;
            }
        }
        return null;
    }

    // 检查是否是管理员
    isAdmin(): boolean {
        const user = this.getLocalUser();
        return user?.is_admin || false;
    }

    // 更新用户信息
    async updateUser(data: UpdateUserRequest): Promise<User> {
        const response = await apiClient.put<User>('/auth/update', data);

        // 更新本地存储的用户信息
        localStorage.setItem('user', JSON.stringify(response));
        return response;
    }
}

export const authService = new AuthService();
