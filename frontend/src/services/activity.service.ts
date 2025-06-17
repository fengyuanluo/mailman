import { apiClient } from '@/lib/api-client';

export interface ActivityLog {
    id: number;
    type: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
    user?: {
        id: number;
        username: string;
        email: string;
    };
    metadata?: any;
}

export interface ActivityStats {
    type_stats: Array<{
        type: string;
        count: number;
    }>;
    daily_stats: Array<{
        date: string;
        count: number;
    }>;
    period_days: number;
}

export const activityService = {
    // 获取最近的活动记录
    async getRecentActivities(limit: number = 20, all: boolean = false): Promise<ActivityLog[]> {
        const params = new URLSearchParams({
            limit: limit.toString(),
            all: all.toString(),
        });

        // API 客户端已经处理了响应，直接返回数据
        const data = await apiClient.get<ActivityLog[]>(`/activities/recent?${params}`);
        return data;
    },

    // 获取活动统计信息
    async getActivityStats(days: number = 7): Promise<ActivityStats> {
        const params = new URLSearchParams({
            days: days.toString(),
        });

        const response = await apiClient.get(`/activities/stats?${params}`);
        return response.data;
    },

    // 根据类型获取活动记录
    async getActivitiesByType(type: string, limit: number = 20): Promise<ActivityLog[]> {
        const params = new URLSearchParams({
            limit: limit.toString(),
        });

        const response = await apiClient.get(`/activities/type/${type}?${params}`);
        return response.data;
    },

    // 删除旧的活动记录（管理员功能）
    async deleteOldActivities(days: number): Promise<{ message: string }> {
        const params = new URLSearchParams({
            days: days.toString(),
        });

        const response = await apiClient.delete(`/activities/cleanup?${params}`);
        return response.data;
    },

    // 获取活动类型的显示信息
    getActivityTypeInfo(type: string): { icon: string; color: string; label: string } {
        const typeMap: Record<string, { icon: string; color: string; label: string }> = {
            // 邮件相关活动
            email_received: { icon: 'Mail', color: 'blue', label: '收到邮件' },
            email_sent: { icon: 'Send', color: 'green', label: '发送邮件' },
            email_deleted: { icon: 'Trash2', color: 'red', label: '删除邮件' },
            email_moved: { icon: 'Mail', color: 'blue', label: '移动邮件' },

            // 账户相关活动 - 注意：后端使用 account_added 而不是 account_created
            account_added: { icon: 'UserPlus', color: 'purple', label: '添加账户' },
            account_updated: { icon: 'UserCheck', color: 'purple', label: '更新账户' },
            account_deleted: { icon: 'UserX', color: 'red', label: '删除账户' },
            account_verified: { icon: 'CheckCircle', color: 'green', label: '验证账户' },
            account_synced: { icon: 'RefreshCw', color: 'green', label: '同步账户' },

            // 同步相关活动
            sync_started: { icon: 'Play', color: 'blue', label: '开始同步' },
            sync_completed: { icon: 'CheckCircle', color: 'green', label: '同步完成' },
            sync_failed: { icon: 'XCircle', color: 'red', label: '同步失败' },

            // 订阅相关活动
            subscribed: { icon: 'Bell', color: 'blue', label: '订阅' },
            unsubscribed: { icon: 'BellOff', color: 'gray', label: '取消订阅' },

            // AI相关活动
            ai_extraction: { icon: 'Cpu', color: 'purple', label: 'AI提取' },
            ai_template_created: { icon: 'FileText', color: 'purple', label: '创建AI模板' },

            // 用户相关活动
            user_login: { icon: 'LogIn', color: 'blue', label: '用户登录' },
            user_logout: { icon: 'LogOut', color: 'gray', label: '用户登出' },

            // 同步配置相关活动
            sync_config_created: { icon: 'Settings', color: 'blue', label: '创建同步配置' },
            sync_config_updated: { icon: 'Settings', color: 'blue', label: '更新同步配置' },

            // 邮件同步相关
            email_sync_started: { icon: 'RefreshCw', color: 'blue', label: '邮件同步开始' },
            email_sync_completed: { icon: 'CheckCircle', color: 'green', label: '邮件同步完成' },
            email_sync_failed: { icon: 'XCircle', color: 'red', label: '邮件同步失败' },

            // 订阅相关
            subscription_created: { icon: 'Bell', color: 'purple', label: '创建订阅' },
            subscription_deleted: { icon: 'BellOff', color: 'gray', label: '删除订阅' },
        };

        return typeMap[type] || { icon: 'Activity', color: 'gray', label: '其他活动' };
    },

    // 格式化时间显示
    formatActivityTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return '刚刚';
        } else if (diffMins < 60) {
            return `${diffMins}分钟前`;
        } else if (diffHours < 24) {
            return `${diffHours}小时前`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    },
};
