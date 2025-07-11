'use client'

import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Mail,
    UserCog,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Moon,
    Sun,
    FileText,
    Bot,
    Inbox,
    Bell,
    RefreshCw,
    Zap,
    Key,
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/components/theme-provider'

const navigation = [
    { name: '仪表板', id: 'dashboard', icon: LayoutDashboard },
    { name: '邮箱账户管理', id: 'accounts', icon: UserCog },
    { name: '邮件管理', id: 'emails', icon: Mail },
    { name: '同步配置', id: 'sync-config', icon: RefreshCw },
    { name: '取件', id: 'mail-pickup', icon: Inbox },
    // 根据需求隐藏订阅管理菜单项
    // { name: '订阅管理', id: 'subscriptions', icon: Bell },
    { name: '取件模板', id: 'pickup', icon: FileText },
    // 暂时隐藏触发器管理菜单项
    // { name: '触发器管理', id: 'triggers', icon: Zap },
    { name: 'OAuth2 配置', id: 'oauth2-config', icon: Key },
    { name: 'AI 配置', id: 'ai-config', icon: Bot },
    { name: '访问令牌', id: 'user-sessions', icon: Settings },
    // 根据需求隐藏设置菜单项
    // { name: '设置', id: 'settings', icon: Settings },
]

interface SidebarProps {
    activeTab: string
    onTabChange: (tab: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const { theme, setTheme } = useTheme()

    return (
        <div
            className={cn(
                'relative flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-900',
                collapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
                <div
                    className={cn(
                        'flex items-center space-x-2 text-lg font-semibold',
                        collapsed && 'justify-center'
                    )}
                >
                    <Mail className="h-6 w-6 text-primary-600" />
                    {!collapsed && <span>邮箱管理系统</span>}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-2 py-4">
                {navigation.map((item) => {
                    const isActive = activeTab === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange && onTabChange(item.id)}
                            className={cn(
                                'group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                                collapsed && 'justify-center'
                            )}
                        >
                            <item.icon
                                className={cn(
                                    'h-5 w-5 shrink-0',
                                    isActive
                                        ? 'text-primary-600 dark:text-primary-400'
                                        : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'
                                )}
                            />
                            {!collapsed && (
                                <span className="ml-3 flex-1">{item.name}</span>
                            )}
                        </button>
                    )
                })}
            </nav>

            {/* Bottom section */}
            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={cn(
                        'mb-2 flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                        collapsed && 'justify-center'
                    )}
                >
                    {theme === 'dark' ? (
                        <Sun className="h-5 w-5" />
                    ) : (
                        <Moon className="h-5 w-5" />
                    )}
                    {!collapsed && <span className="ml-3">切换主题</span>}
                </button>

                {/* Logout */}
                <button
                    className={cn(
                        'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                        collapsed && 'justify-center'
                    )}
                >
                    <LogOut className="h-5 w-5" />
                    {!collapsed && <span className="ml-3">退出登录</span>}
                </button>
            </div>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
                {collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                ) : (
                    <ChevronLeft className="h-4 w-4" />
                )}
            </button>
        </div>
    )
}