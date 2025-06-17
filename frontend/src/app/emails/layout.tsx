'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import {
    Mail,
    Search,
    Download,
    RefreshCw,
    Wrench,
    FolderOpen,
    Filter,
    Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailLayoutProps {
    children: ReactNode
}

const emailNavItems = [
    {
        title: '邮件列表',
        href: '/emails',
        icon: Mail,
        exact: true
    },
    {
        title: '高级搜索',
        href: '/emails/search',
        icon: Search
    },
    {
        title: '内容提取',
        href: '/emails/extract',
        icon: Download
    },
    {
        title: '同步管理',
        href: '/emails/sync',
        icon: RefreshCw
    },
    {
        title: '邮件工具',
        href: '/emails/tools',
        icon: Wrench
    }
]

export default function EmailLayout({ children }: EmailLayoutProps) {
    const pathname = usePathname()

    return (
        <MainLayout>
            <div className="flex h-full">
                {/* 左侧导航栏 */}
                <div className="w-56 border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                    <div className="p-4">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            邮件管理
                        </h2>
                        <nav className="space-y-1">
                            {emailNavItems.map((item) => {
                                const isActive = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href)
                                const Icon = item.icon

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                                                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{item.title}</span>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>

                    {/* 快速统计 */}
                    <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                        <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                            快速统计
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">总邮件数</span>
                                <span className="font-medium text-gray-900 dark:text-white">-</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">未读邮件</span>
                                <span className="font-medium text-gray-900 dark:text-white">-</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">今日新增</span>
                                <span className="font-medium text-gray-900 dark:text-white">-</span>
                            </div>
                        </div>
                    </div>

                    {/* 快速操作 */}
                    <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                        <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                            快速操作
                        </h3>
                        <div className="space-y-2">
                            <button className="flex w-full items-center space-x-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
                                <RefreshCw className="h-4 w-4" />
                                <span>同步所有账户</span>
                            </button>
                            <button className="flex w-full items-center space-x-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                                <Filter className="h-4 w-4" />
                                <span>清空筛选器</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 主内容区 */}
                <div className="flex-1 overflow-hidden">
                    {children}
                </div>
            </div>
        </MainLayout>
    )
}