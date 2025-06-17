'use client'

import { useEffect, useState } from 'react'
import { Mail, Users, Activity, TrendingUp, Calendar, Clock, CheckCircle, AlertCircle, UserPlus, RefreshCw, Send, Trash2, UserCheck, UserX, Play, XCircle, Bell, BellOff, Cpu, FileText, LogIn, LogOut, Settings } from 'lucide-react'
import { emailAccountService } from '@/services/email-account.service'
import { emailService, EmailStatsResponse } from '@/services/email.service'
import { activityService, ActivityLog } from '@/services/activity.service'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import toast from 'react-hot-toast'

// 图标映射
const iconMap: Record<string, any> = {
    Mail,
    Send,
    Trash2,
    UserPlus,
    UserCheck,
    UserX,
    CheckCircle,
    RefreshCw,
    Play,
    XCircle,
    Bell,
    BellOff,
    Cpu,
    FileText,
    LogIn,
    LogOut,
    Settings,
    Activity,
    AlertCircle
}

// 统计卡片组件
function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color = 'primary'
}: {
    title: string
    value: string | number
    icon: any
    trend?: 'up' | 'down'
    trendValue?: string
    color?: 'primary' | 'success' | 'warning' | 'danger'
}) {
    const colorClasses = {
        primary: 'from-primary-400 to-primary-600',
        success: 'from-green-400 to-green-600',
        warning: 'from-yellow-400 to-yellow-600',
        danger: 'from-red-400 to-red-600'
    }

    return (
        <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
                    {trend && trendValue && (
                        <p className={`mt-2 flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            <TrendingUp className={`mr-1 h-4 w-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
                            {trendValue}
                        </p>
                    )}
                </div>
                <div className={`rounded-full bg-gradient-to-br ${colorClasses[color]} p-3 text-white`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    )
}

// 最近活动项组件
function ActivityItem({
    icon: Icon,
    title,
    description,
    time,
    color = 'gray'
}: {
    icon: any
    title: string
    description: string
    time: string
    color?: string
}) {
    const colorClasses: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    }

    return (
        <div className="flex items-start space-x-3">
            <div className={`rounded-full p-2 ${colorClasses[color]}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{time}</p>
            </div>
        </div>
    )
}

export default function DashboardTab() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalAccounts: 0,
        activeAccounts: 0,
        totalEmails: 0,
        unreadEmails: 0,
        todayEmails: 0,
        totalGrowthRate: 0,
        todayGrowthRate: 0,
        lastSyncTime: null as string | null
    })
    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const { isAuthenticated, user } = useAuth()

    useEffect(() => {
        loadDashboardData()
    }, [isAuthenticated])

    const loadDashboardData = async () => {
        try {
            setLoading(true)

            // 加载账户统计
            const accounts = await emailAccountService.getAccounts()
            const activeAccounts = accounts.filter(a => a.status === 'active').length

            // 加载邮件统计（使用真实的API）
            let emailStats: EmailStatsResponse = {
                totalEmails: 0,
                unreadEmails: 0,
                todayEmails: 0,
                totalGrowthRate: 0,
                todayGrowthRate: 0
            }

            try {
                emailStats = await emailService.getEmailStats()
                console.log('[DashboardTab] 邮件统计数据:', emailStats)
            } catch (error) {
                console.warn('[DashboardTab] 获取邮件统计失败，使用默认值:', error)
                // 使用默认值0，如果API调用失败
            }

            setStats({
                totalAccounts: accounts.length,
                activeAccounts: activeAccounts,
                totalEmails: emailStats.totalEmails,
                unreadEmails: emailStats.unreadEmails,
                todayEmails: emailStats.todayEmails,
                totalGrowthRate: emailStats.totalGrowthRate,
                todayGrowthRate: emailStats.todayGrowthRate,
                lastSyncTime: accounts.length > 0 && accounts[0].lastSync ? formatDate(accounts[0].lastSync) : null
            })

            // 获取真实的活动数据
            try {
                console.log('[DashboardTab] 开始获取活动数据...')
                const activities = await activityService.getRecentActivities(5, false)
                console.log('[DashboardTab] API 返回的活动数据:', activities)

                if (activities && activities.length > 0) {
                    // 转换活动数据为显示格式
                    const formattedActivities = activities.map((activity: ActivityLog) => {
                        const typeInfo = activityService.getActivityTypeInfo(activity.type)
                        const IconComponent = iconMap[typeInfo.icon] || Activity

                        return {
                            icon: IconComponent,
                            title: typeInfo.label,
                            description: activity.description || activity.title,
                            time: activityService.formatActivityTime(activity.created_at),
                            color: typeInfo.color
                        }
                    })

                    console.log('[DashboardTab] 格式化后的活动数据:', formattedActivities)
                    setRecentActivities(formattedActivities)
                    console.log('[DashboardTab] 已设置 recentActivities 状态')
                } else {
                    // 没有活动数据时，设置为空数组
                    console.log('[DashboardTab] 没有活动数据，设置为空数组')
                    setRecentActivities([])
                }
            } catch (error: any) {
                console.error('获取活动数据失败:', error)

                // 如果是认证错误，显示提示
                if (error.response?.status === 401) {
                    toast.error('请先登录以查看活动记录')
                }

                // 设置为空数组，不显示模拟数据
                setRecentActivities([])
            }
        } catch (error) {
            console.error('加载仪表板数据失败:', error)
            toast.error('加载数据失败，请刷新重试')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                    <p className="text-gray-600 dark:text-gray-400">加载中...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">仪表板</h2>
                {stats.lastSyncTime && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        最后同步: {stats.lastSyncTime}
                    </p>
                )}
            </div>

            {/* 统计卡片 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="邮箱账户"
                    value={stats.totalAccounts}
                    icon={Users}
                    color="primary"
                />
                <StatCard
                    title="活跃账户"
                    value={stats.activeAccounts}
                    icon={CheckCircle}
                    color="success"
                />
                <StatCard
                    title="总邮件数"
                    value={stats.totalEmails}
                    icon={Mail}
                    trend={stats.totalGrowthRate >= 0 ? "up" : "down"}
                    trendValue={`${stats.totalGrowthRate >= 0 ? '+' : ''}${stats.totalGrowthRate.toFixed(1)}%`}
                    color="primary"
                />
                <StatCard
                    title="未读邮件"
                    value={stats.unreadEmails}
                    icon={Activity}
                    color="warning"
                />
                <StatCard
                    title="今日邮件"
                    value={stats.todayEmails}
                    icon={Calendar}
                    trend={stats.todayGrowthRate >= 0 ? "up" : "down"}
                    trendValue={`${stats.todayGrowthRate >= 0 ? '+' : ''}${stats.todayGrowthRate.toFixed(1)}%`}
                    color="primary"
                />
            </div>

            {/* 最近活动和快速操作 */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* 最近活动 */}
                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">最近活动</h3>
                        <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="space-y-4">
                        {(() => {
                            console.log('[DashboardTab Render] recentActivities.length:', recentActivities.length)
                            console.log('[DashboardTab Render] recentActivities:', recentActivities)
                            return null
                        })()}
                        {recentActivities.length > 0 ? (
                            recentActivities.map((activity, index) => (
                                <ActivityItem key={index} {...activity} />
                            ))
                        ) : (
                            <div className="py-8 text-center">
                                <Activity className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    暂无活动记录
                                </p>
                                {!isAuthenticated && (
                                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        登录后可查看活动记录
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 快速操作 */}
                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">快速操作</h3>
                    <div className="grid gap-3">
                        <button
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('switchTab', {
                                    detail: { tab: 'accounts' }
                                }))
                            }}
                            className="flex items-center justify-between rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                            <div className="flex items-center space-x-3">
                                <Users className="h-5 w-5 text-primary-600" />
                                <span className="font-medium text-gray-900 dark:text-white">管理邮箱账户</span>
                            </div>
                            <span className="text-sm text-gray-500">→</span>
                        </button>
                        <button
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('switchTab', {
                                    detail: { tab: 'settings' }
                                }))
                            }}
                            className="flex items-center justify-between rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                            <div className="flex items-center space-x-3">
                                <Settings className="h-5 w-5 text-primary-600" />
                                <span className="font-medium text-gray-900 dark:text-white">系统设置</span>
                            </div>
                            <span className="text-sm text-gray-500">→</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
