'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService, User } from '@/services/auth.service';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // 初始化时检查认证状态
    useEffect(() => {
        const initAuth = async () => {
            console.log('[AuthContext] Starting auth initialization');

            try {
                // 尝试从多个可能的键获取 token
                const token = localStorage.getItem('auth_token') ||
                    localStorage.getItem('token') ||
                    localStorage.getItem('sessionToken');
                console.log('[AuthContext] Token exists:', !!token);

                if (token) {
                    // 先尝试使用本地用户信息
                    const localUser = authService.getLocalUser();
                    if (localUser) {
                        console.log('[AuthContext] Found local user:', localUser.email);
                        setUser(localUser);
                    }

                    // 然后异步验证 token 是否有效
                    try {
                        const currentUser = await authService.getCurrentUser();
                        console.log('[AuthContext] Token validated, user:', currentUser.email);
                        setUser(currentUser);
                    } catch (error: any) {
                        console.error('[AuthContext] Token validation failed:', error);
                        // 只有在明确的认证错误时才清理
                        if (error.response?.status === 401) {
                            console.log('[AuthContext] 401 error, clearing auth state');
                            apiClient.clearAuthToken();
                            localStorage.removeItem('user');
                            setUser(null);
                            // 如果是 401 错误，可能需要重定向到登录页
                            // 但要排除OAuth2回调页面，因为它们不需要预先认证
                            const currentPath = window.location.pathname;
                            const isOAuth2Callback = currentPath.startsWith('/oauth2/callback') ||
                                                   currentPath.match(/^\/oauth2\/callback\/[^\/]+$/);
                            if (currentPath !== '/login' && !isOAuth2Callback) {
                                router.push('/login');
                            }
                        }
                        // 其他错误（网络等）保持当前状态
                    }
                } else {
                    console.log('[AuthContext] No token found');
                    setUser(null);
                }
            } catch (error) {
                console.error('[AuthContext] Unexpected error during init:', error);
            } finally {
                console.log('[AuthContext] Auth initialization complete');
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // 监听登出事件
    useEffect(() => {
        const handleLogout = () => {
            setUser(null);
            router.push('/login');
        };

        window.addEventListener('auth:logout', handleLogout);
        return () => {
            window.removeEventListener('auth:logout', handleLogout);
        };
    }, [router]);

    const login = useCallback(async (username: string, password: string) => {
        try {
            const response = await authService.login({ username, password });
            setUser(response.user);
            toast.success('登录成功');
            router.push('/main');
        } catch (error) {
            const message = error instanceof Error ? error.message : '登录失败';
            toast.error(message);
            throw error;
        }
    }, [router]);

    const logout = useCallback(async () => {
        try {
            await authService.logout();
            setUser(null);
            toast.success('已退出登录');
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            // 即使出错也要清理状态
            setUser(null);
            router.push('/login');
        }
    }, [router]);

    const refreshUser = useCallback(async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to refresh user:', error);
            throw error;
        }
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
