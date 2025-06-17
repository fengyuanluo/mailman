'use client'

import { useEffect, useState } from 'react'
import { X, RefreshCw, AlertCircle, Clock, Calendar, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { emailAccountService } from '@/services/email-account.service'
import { formatDate } from '@/lib/utils'

interface SyncAccountModalProps {
    isOpen: boolean
    onClose: () => void
    accountId: number | null
    accountEmail: string
    onSuccess?: () => void
    onError?: (error: string) => void
}

interface SyncFormData {
    sync_mode: 'incremental' | 'full'
    mailboxes?: string[]
    max_emails_per_mailbox?: number
    include_body?: boolean
    default_start_date?: string
    end_date?: string
}

export default function SyncAccountModal({
    isOpen,
    onClose,
    accountId,
    accountEmail,
    onSuccess,
    onError
}: SyncAccountModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingLastSync, setLoadingLastSync] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [lastSyncRecord, setLastSyncRecord] = useState<any>(null)

    // 计算默认开始日期（当前时间往前推一个月）
    const getDefaultStartDate = () => {
        const date = new Date()
        date.setMonth(date.getMonth() - 1)
        // 返回 YYYY-MM-DD 格式用于日期输入框
        return date.toISOString().split('T')[0]
    }

    const [formData, setFormData] = useState<SyncFormData>({
        sync_mode: 'incremental',
        max_emails_per_mailbox: 100,
        include_body: true,
        default_start_date: getDefaultStartDate()
    })

    // 处理模态框动画
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
            setTimeout(() => setIsAnimating(true), 10)
            // 加载最后一次同步记录
            if (accountId) {
                loadLastSyncRecord()
            }
        } else {
            setIsAnimating(false)
            setTimeout(() => {
                setIsVisible(false)
                // 重置表单
                setFormData({
                    sync_mode: 'incremental',
                    max_emails_per_mailbox: 100,
                    include_body: true,
                    default_start_date: getDefaultStartDate()
                })
                setLastSyncRecord(null)
            }, 300)
        }
    }, [isOpen, accountId])

    const loadLastSyncRecord = async () => {
        if (!accountId) return

        setLoadingLastSync(true)
        try {
            const response = await emailAccountService.getLastSyncRecord(accountId)
            setLastSyncRecord(response)
        } catch (error: any) {
            // 如果是404错误，说明没有同步记录，这是正常的
            if (error.response?.status !== 404) {
                console.error('Failed to load last sync record:', error)
            }
        } finally {
            setLoadingLastSync(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!accountId) return

        setSyncing(true)
        try {
            const syncOptions: any = {
                sync_mode: formData.sync_mode,
                max_emails_per_mailbox: formData.max_emails_per_mailbox,
                include_body: formData.include_body
            }

            // 如果是全量同步，添加额外的参数
            if (formData.sync_mode === 'full') {
                if (formData.mailboxes && formData.mailboxes.length > 0) {
                    syncOptions.mailboxes = formData.mailboxes
                }
                if (formData.default_start_date) {
                    // 将 YYYY-MM-DD 格式转换为 RFC3339 格式
                    syncOptions.default_start_date = new Date(formData.default_start_date + 'T00:00:00Z').toISOString()
                }
                if (formData.end_date) {
                    // 将 YYYY-MM-DD 格式转换为 RFC3339 格式
                    syncOptions.end_date = new Date(formData.end_date + 'T23:59:59Z').toISOString()
                }
            }

            const response = await emailAccountService.syncAccount(accountId, syncOptions)

            onSuccess?.()
            onClose()
        } catch (error: any) {
            console.error('Sync failed:', error)
            onError?.(error.response?.data?.error || '同步失败，请稍后重试')
        } finally {
            setSyncing(false)
        }
    }

    const handleMailboxesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setFormData(prev => ({
            ...prev,
            mailboxes: value ? value.split(',').map(s => s.trim()) : undefined
        }))
    }

    if (!isVisible) return null

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
            isAnimating ? "bg-black/50" : "bg-black/0"
        )}>
            {/* 外层容器 - 固定尺寸 */}
            <div className={cn(
                "relative w-full max-w-2xl transition-all duration-300",
                isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}>
                {/* 内层容器 - 动态高度 */}
                <div className="max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-800">
                    <div className="flex flex-col">
                        {/* 头部 */}
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                                <RefreshCw className="h-5 w-5 text-primary-600" />
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    同步邮箱
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                disabled={syncing}
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 内容区域 - 可滚动 */}
                        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* 账户信息 */}
                                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        正在同步邮箱账户：
                                    </p>
                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">
                                        {accountEmail}
                                    </p>
                                </div>

                                {/* 同步模式选择 */}
                                <div>
                                    <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        选择同步模式
                                    </label>
                                    <div className="space-y-3">
                                        <label className="flex cursor-pointer items-start rounded-lg border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900/50">
                                            <input
                                                type="radio"
                                                name="sync_mode"
                                                value="incremental"
                                                checked={formData.sync_mode === 'incremental'}
                                                onChange={(e) => setFormData(prev => ({ ...prev, sync_mode: 'incremental' }))}
                                                className="mt-1"
                                            />
                                            <div className="ml-3">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    增量同步（推荐）
                                                </div>
                                                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                    仅同步自上次同步以来的新邮件，速度快，适合日常使用
                                                </div>
                                                {formData.sync_mode === 'incremental' && lastSyncRecord && lastSyncRecord.last_sync_time && (
                                                    <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <Clock className="h-4 w-4" />
                                                        <span>
                                                            上次同步时间：{formatDate(lastSyncRecord.last_sync_time)}
                                                        </span>
                                                    </div>
                                                )}
                                                {formData.sync_mode === 'incremental' && !lastSyncRecord && !loadingLastSync && (
                                                    <div className="mt-3 flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <span>从未同步过，将自动执行全量同步</span>
                                                    </div>
                                                )}
                                            </div>
                                        </label>

                                        <label className="flex cursor-pointer items-start rounded-lg border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900/50">
                                            <input
                                                type="radio"
                                                name="sync_mode"
                                                value="full"
                                                checked={formData.sync_mode === 'full'}
                                                onChange={(e) => setFormData(prev => ({ ...prev, sync_mode: 'full' }))}
                                                className="mt-1"
                                            />
                                            <div className="ml-3">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    全量同步
                                                </div>
                                                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                    重新同步所有邮件，适用于首次同步或需要完整更新时
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* 全量同步的额外选项 */}
                                {formData.sync_mode === 'full' && (
                                    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            全量同步选项
                                        </h3>

                                        {/* 邮箱文件夹 */}
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                邮箱文件夹（可选）
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="例如：INBOX,Sent,Drafts（留空同步所有文件夹）"
                                                onChange={handleMailboxesChange}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            />
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                多个文件夹用英文逗号分隔
                                            </p>
                                        </div>

                                        {/* 每个文件夹最大邮件数 */}
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                每个文件夹最大邮件数
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10000"
                                                value={formData.max_emails_per_mailbox}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    max_emails_per_mailbox: parseInt(e.target.value) || 100
                                                }))}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            />
                                        </div>

                                        {/* 开始日期 */}
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                开始日期（可选）
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.default_start_date || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    default_start_date: e.target.value || undefined
                                                }))}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            />
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                仅同步此日期之后的邮件
                                            </p>
                                        </div>

                                        {/* 结束日期 */}
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                结束日期（可选）
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.end_date || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    end_date: e.target.value || undefined
                                                }))}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                            />
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                仅同步此日期之前的邮件
                                            </p>
                                        </div>

                                        {/* 包含邮件正文 */}
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="include_body"
                                                checked={formData.include_body}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    include_body: e.target.checked
                                                }))}
                                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                                            />
                                            <label htmlFor="include_body" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                                包含邮件正文内容
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* 底部按钮 */}
                        <div className="flex items-center justify-end space-x-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={syncing}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={syncing || !accountId}
                                className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                            >
                                {syncing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>同步中...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4" />
                                        <span>开始同步</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
