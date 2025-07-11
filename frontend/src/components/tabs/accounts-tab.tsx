'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, MoreVertical, Edit2, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle, Grid, List, Table, ChevronLeft, ChevronRight, Shield, ShieldCheck, Mail, Inbox, ChevronDown, X } from 'lucide-react'
import { emailAccountService } from '@/services/email-account.service'
import { oauth2Service } from '@/services/oauth2.service'
import { EmailAccount } from '@/types'
import { cn } from '@/lib/utils'
import AddAccountModal from '@/components/modals/add-account-modal'
import EditAccountModal from '@/components/modals/edit-account-modal'
import SyncAccountModal from '@/components/modals/sync-account-modal'

// 视图类型
type ViewType = 'grid' | 'list' | 'table'

// 分页组件
function Pagination({
    currentPage,
    totalPages,
    onPageChange
}: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}) {
    const pages = []
    const maxVisiblePages = 5

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
    }

    return (
        <div className="flex items-center justify-center space-x-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>

            {startPage > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        className="rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        1
                    </button>
                    {startPage > 2 && <span className="text-gray-400">...</span>}
                </>
            )}

            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={cn(
                        "rounded-lg px-3 py-1 text-sm transition-colors",
                        page === currentPage
                            ? "bg-primary-600 text-white"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    )}
                >
                    {page}
                </button>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        className="rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700"
            >
                <ChevronRight className="h-5 w-5" />
            </button>
        </div>
    )
}

export default function AccountsTab() {
    const [accounts, setAccounts] = useState<EmailAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showSyncModal, setShowSyncModal] = useState(false)
    const [syncingAccount, setSyncingAccount] = useState<EmailAccount | null>(null)
    const [syncing, setSyncing] = useState<number | null>(null)
    const [verifying, setVerifying] = useState<number | null>(null)
    const [viewType, setViewType] = useState<ViewType>('grid')
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    })

    // 下拉菜单状态
    const [showAddDropdown, setShowAddDropdown] = useState(false)
    const [gmailOAuth2Available, setGmailOAuth2Available] = useState(false)

    // 模态框预设参数
    const [modalPresets, setModalPresets] = useState<{
        provider?: string
        authType?: string
        autoTriggerOAuth2?: boolean
    }>({})

    // 过滤器状态
    const [providerFilter, setProviderFilter] = useState<string | null>(null)

    useEffect(() => {
        loadAccounts()
        checkGmailOAuth2Availability()
    }, [pagination.page, pagination.limit])

    // 监听来自OAuth2配置页面的过滤事件
    useEffect(() => {
        const handleFilterAccountsByProvider = (event: CustomEvent) => {
            const { filterByProvider } = event.detail
            setProviderFilter(filterByProvider)
            // 重置搜索查询以避免冲突
            setSearchQuery('')
            // 重置分页到第一页
            setPagination(prev => ({ ...prev, page: 1 }))
        }

        window.addEventListener('filterAccountsByProvider', handleFilterAccountsByProvider as EventListener)

        return () => {
            window.removeEventListener('filterAccountsByProvider', handleFilterAccountsByProvider as EventListener)
        }
    }, [])

    // 检测Gmail OAuth2配置可用性
    const checkGmailOAuth2Availability = async () => {
        try {
            const configs = await oauth2Service.getGlobalConfigs()
            const gmailConfig = configs.find(config => config.provider_type === 'gmail')
            setGmailOAuth2Available(!!gmailConfig && gmailConfig.is_enabled)
        } catch (error) {
            console.error('Failed to check Gmail OAuth2 availability:', error)
            setGmailOAuth2Available(false)
        }
    }

    const loadAccounts = async () => {
        try {
            setLoading(true)
            const data = await emailAccountService.getAccounts()
            setAccounts(data)

            // 计算分页信息
            const total = data.length
            const totalPages = Math.ceil(total / pagination.limit)
            setPagination(prev => ({
                ...prev,
                total,
                totalPages
            }))
        } catch (error) {
            console.error('Failed to load accounts:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除这个账户吗？')) return

        try {
            await emailAccountService.deleteAccount(id)
            await loadAccounts()
        } catch (error) {
            console.error('Failed to delete account:', error)
            alert('删除账户失败')
        }
    }

    const handleSyncClick = (account: EmailAccount) => {
        setSyncingAccount(account)
        setShowSyncModal(true)
    }

    const handleSyncConfirm = async () => {
        if (!syncingAccount) return

        setSyncing(syncingAccount.id)
        setShowSyncModal(false)

        try {
            await emailAccountService.syncAccount(syncingAccount.id)
            await loadAccounts()
        } catch (error) {
            console.error('Failed to sync account:', error)
            alert('同步失败')
        } finally {
            setSyncing(null)
            setSyncingAccount(null)
        }
    }

    const handleEdit = (account: EmailAccount) => {
        setSelectedAccount(account)
        setShowEditModal(true)
    }

    const handleVerify = async (account: EmailAccount) => {
        setVerifying(account.id)

        try {
            const result = await emailAccountService.verifyAccount({
                account_id: account.id
            })

            if (result.success) {
                alert('账户验证成功！')
            } else {
                alert(`账户验证失败: ${result.error || result.message}`)
            }
        } catch (error) {
            console.error('Failed to verify account:', error)
            alert('验证账户时发生错误')
        } finally {
            setVerifying(null)
        }
    }

    const handlePageChange = (page: number) => {
        setPagination(prev => ({ ...prev, page }))
    }

    // 处理Gmail OAuth2快捷创建
    const handleGmailOAuth2QuickCreate = () => {
        setModalPresets({
            provider: 'gmail',
            authType: 'oauth2',
            autoTriggerOAuth2: true
        })
        setShowAddModal(true)
        setShowAddDropdown(false)
    }

    // 处理普通添加账户
    const handleRegularAddAccount = () => {
        setModalPresets({})
        setShowAddModal(true)
        setShowAddDropdown(false)
    }

    // 处理点击外部关闭下拉菜单
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        if (!target.closest('.add-account-dropdown')) {
            setShowAddDropdown(false)
        }
    }

    // 监听点击外部事件
    useEffect(() => {
        if (showAddDropdown) {
            document.addEventListener('click', handleClickOutside)
            return () => document.removeEventListener('click', handleClickOutside)
        }
    }, [showAddDropdown])

    // 添加处理查看邮件和取件的函数
    const handleViewEmails = (account: EmailAccount) => {
        console.log('[AccountsTab] 触发查看邮件，账户:', account.emailAddress, 'ID:', account.id);
        // 切换到邮件管理tab并选中对应邮箱
        const event = new CustomEvent('switchTab', {
            detail: {
                tab: 'emails',
                data: {
                    selectedAccountId: account.id,
                    selectedAccountEmail: account.emailAddress
                }
            }
        })
        window.dispatchEvent(event)
        console.log('[AccountsTab] switchTab 事件已触发');
    }

    const handlePickupMail = (account: EmailAccount) => {
        // 切换到取件tab并设置默认参数
        // 从邮箱地址中提取域名
        const emailDomain = account.emailAddress.split('@')[1]
        const event = new CustomEvent('switchTab', {
            detail: {
                tab: 'mail-pickup',
                data: {
                    selectedAccount: account.emailAddress,
                    customDomain: emailDomain || ''
                }
            }
        })
        window.dispatchEvent(event)
    }

    // 过滤和分页账户
    const filteredAccounts = accounts.filter(account => {
        // 搜索查询过滤
        const matchesSearch = account.emailAddress.toLowerCase().includes(searchQuery.toLowerCase())

        // Provider过滤
        const matchesProvider = providerFilter
            ? account.authType === 'oauth2' && account.mailProvider?.type === providerFilter
            : true

        return matchesSearch && matchesProvider
    })

    // 应用分页
    const paginatedAccounts = filteredAccounts.slice(
        (pagination.page - 1) * pagination.limit,
        pagination.page * pagination.limit
    )

    const getStatusIcon = (status: string | undefined) => {
        switch (status) {
            case 'active':
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />
            default:
                return <AlertCircle className="h-4 w-4 text-yellow-500" />
        }
    }

    const getProviderColor = (provider: string | undefined) => {
        switch (provider?.toLowerCase()) {
            case 'gmail':
                return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            case 'outlook':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
            case 'yahoo':
                return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                    <p className="text-gray-500 dark:text-gray-400">加载中...</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-6">
                {/* 搜索和操作栏 */}
                <div className="flex items-center justify-between">
                    <div className="w-96">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜索邮箱账户..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                            />
                        </div>
                        {/* 过滤器指示器 */}
                        {providerFilter && (
                            <div className="mt-2 flex items-center space-x-2">
                                <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                                    过滤: {providerFilter.toUpperCase()} OAuth2 账户
                                    <button
                                        onClick={() => setProviderFilter(null)}
                                        className="ml-2 rounded-full p-0.5 hover:bg-primary-200 dark:hover:bg-primary-800"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* 视图切换按钮 */}
                        <div className="flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                            <button
                                onClick={() => setViewType('grid')}
                                className={cn(
                                    "flex items-center space-x-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                    viewType === 'grid'
                                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                )}
                            >
                                <Grid className="h-4 w-4" />
                                <span>卡片</span>
                            </button>
                            <button
                                onClick={() => setViewType('list')}
                                className={cn(
                                    "flex items-center space-x-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                    viewType === 'list'
                                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                )}
                            >
                                <List className="h-4 w-4" />
                                <span>列表</span>
                            </button>
                            <button
                                onClick={() => setViewType('table')}
                                className={cn(
                                    "flex items-center space-x-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                    viewType === 'table'
                                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                )}
                            >
                                <Table className="h-4 w-4" />
                                <span>表格</span>
                            </button>
                        </div>

                        {/* 添加账户下拉菜单 */}
                        <div className="add-account-dropdown relative">
                            <button
                                onClick={() => setShowAddDropdown(!showAddDropdown)}
                                className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                            >
                                <Plus className="h-4 w-4" />
                                <span>添加账户</span>
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {showAddDropdown && (
                                <div className="absolute right-0 mt-2 w-56 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700 z-50">
                                    <button
                                        onClick={handleRegularAddAccount}
                                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        <Plus className="mr-3 h-4 w-4" />
                                        <div className="flex flex-col items-start">
                                            <span>添加账户</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">手动配置邮箱账户</span>
                                        </div>
                                    </button>

                                    {gmailOAuth2Available && (
                                        <button
                                            onClick={handleGmailOAuth2QuickCreate}
                                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            <Mail className="mr-3 h-4 w-4 text-red-500" />
                                            <div className="flex flex-col items-start">
                                                <span>快速添加 Gmail</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">使用 OAuth2 一键授权</span>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 账户列表 */}
                {paginatedAccounts.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchQuery ? '没有找到匹配的账户' : '还没有添加任何邮箱账户'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-4 text-primary-600 hover:text-primary-700"
                            >
                                添加第一个账户
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {viewType === 'grid' ? (
                            // 卡片视图
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {paginatedAccounts.map((account) => (
                                    <div
                                        key={account.id}
                                        className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <div className="mb-4 flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {account.emailAddress}
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                    {account.emailAddress}
                                                </p>
                                            </div>
                                            <div className="relative">
                                                <button className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-4 flex items-center justify-between">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                getProviderColor(account.mailProvider?.name || account.mailProvider?.type)
                                            )}>
                                                {account.mailProvider?.name || account.mailProvider?.type || 'Unknown'}
                                            </span>
                                            <div className="flex items-center space-x-2">
                                                <div className="flex items-center space-x-1">
                                                    {getStatusIcon(account.status || 'unknown')}
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {account.status === 'active' ? '正常' : account.status === 'error' ? '错误' : '未知'}
                                                    </span>
                                                </div>
                                                {account.isVerified && (
                                                    <div className="flex items-center space-x-1" title={account.verifiedAt ? `验证时间: ${new Date(account.verifiedAt).toLocaleString('zh-CN')}` : '已验证'}>
                                                        <ShieldCheck className="h-4 w-4 text-green-500" />
                                                        <span className="text-xs text-green-600 dark:text-green-400">已验证</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {account.lastSync && (
                                            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                                                最后同步: {new Date(account.lastSync).toLocaleString('zh-CN')}
                                            </p>
                                        )}

                                        <div className="flex flex-col space-y-2">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleViewEmails(account)}
                                                    className="flex flex-1 items-center justify-center space-x-1 rounded-lg bg-primary-600 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                    <span>查看邮件</span>
                                                </button>
                                                <button
                                                    onClick={() => handlePickupMail(account)}
                                                    className="flex flex-1 items-center justify-center space-x-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                                                >
                                                    <Inbox className="h-4 w-4" />
                                                    <span>取件</span>
                                                </button>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleSyncClick(account)}
                                                    disabled={syncing === account.id}
                                                    className="flex flex-1 items-center justify-center space-x-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                >
                                                    <RefreshCw className={cn("h-4 w-4", syncing === account.id && "animate-spin")} />
                                                    <span>{syncing === account.id ? '同步中' : '同步'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleVerify(account)}
                                                    disabled={verifying === account.id}
                                                    className="flex flex-1 items-center justify-center space-x-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                >
                                                    <Shield className={cn("h-4 w-4", verifying === account.id && "animate-pulse")} />
                                                    <span>{verifying === account.id ? '验证中' : '验证'}</span>
                                                </button>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleEdit(account)}
                                                    className="flex flex-1 items-center justify-center space-x-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                    <span>编辑</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(account.id)}
                                                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : viewType === 'list' ? (
                            // 列表视图
                            <div className="space-y-3">
                                {paginatedAccounts.map((account) => (
                                    <div
                                        key={account.id}
                                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-semibold">
                                                {account.emailAddress.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {account.emailAddress}
                                                </h3>
                                                <div className="mt-1 flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                                        getProviderColor(account.mailProvider?.name || account.mailProvider?.type)
                                                    )}>
                                                        {account.mailProvider?.name || account.mailProvider?.type || 'Unknown'}
                                                    </span>
                                                    <div className="flex items-center space-x-1">
                                                        {getStatusIcon(account.status || 'unknown')}
                                                        <span className="text-xs">
                                                            {account.status === 'active' ? '正常' : account.status === 'error' ? '错误' : '未知'}
                                                        </span>
                                                    </div>
                                                    {account.isVerified && (
                                                        <div className="flex items-center space-x-1" title={account.verifiedAt ? `验证时间: ${new Date(account.verifiedAt).toLocaleString('zh-CN')}` : '已验证'}>
                                                            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                                                            <span className="text-xs text-green-600 dark:text-green-400">已验证</span>
                                                        </div>
                                                    )}
                                                    {account.lastSync && (
                                                        <span className="text-xs">
                                                            最后同步: {new Date(account.lastSync).toLocaleString('zh-CN')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleViewEmails(account)}
                                                className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                                                title="查看邮件"
                                            >
                                                <Mail className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handlePickupMail(account)}
                                                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                                                title="取件"
                                            >
                                                <Inbox className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleSyncClick(account)}
                                                disabled={syncing === account.id}
                                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                title="同步"
                                            >
                                                <RefreshCw className={cn("h-4 w-4", syncing === account.id && "animate-spin")} />
                                            </button>
                                            <button
                                                onClick={() => handleVerify(account)}
                                                disabled={verifying === account.id}
                                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                title="验证连接"
                                            >
                                                <Shield className={cn("h-4 w-4", verifying === account.id && "animate-pulse")} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(account)}
                                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                                title="编辑"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(account.id)}
                                                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                                title="删除"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // 表格视图
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                邮箱账户
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                提供商
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                状态
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                验证状态
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                最后同步
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                操作
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                        {paginatedAccounts.map((account) => (
                                            <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-semibold">
                                                            {account.emailAddress.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {account.emailAddress}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                        getProviderColor(account.mailProvider?.name || account.mailProvider?.type)
                                                    )}>
                                                        {account.mailProvider?.name || account.mailProvider?.type || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center space-x-1">
                                                        {getStatusIcon(account.status || 'unknown')}
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            {account.status === 'active' ? '正常' : account.status === 'error' ? '错误' : '未知'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    {account.isVerified ? (
                                                        <div className="flex items-center space-x-1" title={account.verifiedAt ? `验证时间: ${new Date(account.verifiedAt).toLocaleString('zh-CN')}` : '已验证'}>
                                                            <ShieldCheck className="h-4 w-4 text-green-500" />
                                                            <span className="text-sm text-green-600 dark:text-green-400">已验证</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400 dark:text-gray-500">未验证</span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {account.lastSync ? new Date(account.lastSync).toLocaleString('zh-CN') : '从未同步'}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => handleViewEmails(account)}
                                                            className="rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                                                            title="查看邮件"
                                                        >
                                                            <Mail className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handlePickupMail(account)}
                                                            className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                                            title="取件"
                                                        >
                                                            <Inbox className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSyncClick(account)}
                                                            disabled={syncing === account.id}
                                                            className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
                                                            title="同步"
                                                        >
                                                            <RefreshCw className={cn("h-4 w-4", syncing === account.id && "animate-spin")} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleVerify(account)}
                                                            disabled={verifying === account.id}
                                                            className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
                                                            title="验证连接"
                                                        >
                                                            <Shield className={cn("h-4 w-4", verifying === account.id && "animate-pulse")} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(account)}
                                                            className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                                            title="编辑"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(account.id)}
                                                            className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                            title="删除"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 分页控件 */}
                        {pagination.totalPages > 0 && (
                            <div className="mt-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            显示第 {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <label htmlFor="pageSize" className="text-sm text-gray-600 dark:text-gray-400">
                                                每页显示：
                                            </label>
                                            <select
                                                id="pageSize"
                                                value={pagination.limit}
                                                onChange={(e) => {
                                                    const newLimit = parseInt(e.target.value)
                                                    setPagination(prev => ({
                                                        ...prev,
                                                        page: 1,
                                                        limit: newLimit
                                                    }))
                                                }}
                                                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="5">5</option>
                                                <option value="10">10</option>
                                                <option value="15">15</option>
                                                <option value="20">20</option>
                                                <option value="30">30</option>
                                                <option value="50">50</option>
                                            </select>
                                        </div>
                                    </div>
                                    {pagination.totalPages > 1 && (
                                        <Pagination
                                            currentPage={pagination.page}
                                            totalPages={pagination.totalPages}
                                            onPageChange={handlePageChange}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 添加账户模态框 */}
            <AddAccountModal
                isOpen={showAddModal}
                onClose={() => {
                    setShowAddModal(false)
                    setModalPresets({})
                }}
                onSuccess={() => {
                    setShowAddModal(false)
                    setModalPresets({})
                    loadAccounts()
                }}
                presetProvider={modalPresets.provider}
                presetAuthType={modalPresets.authType}
                autoTriggerOAuth2={modalPresets.autoTriggerOAuth2}
            />

            {/* 编辑账户模态框 */}
            <EditAccountModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false)
                    setSelectedAccount(null)
                }}
                onSuccess={() => {
                    setShowEditModal(false)
                    setSelectedAccount(null)
                    loadAccounts()
                }}
                accountId={selectedAccount?.id || null}
            />

            {/* 同步账户模态框 */}
            {syncingAccount && (
                <SyncAccountModal
                    isOpen={showSyncModal}
                    onClose={() => {
                        setShowSyncModal(false)
                        setSyncingAccount(null)
                    }}
                    accountId={syncingAccount.id}
                    accountEmail={syncingAccount.emailAddress}
                    onSuccess={handleSyncConfirm}
                />
            )}
        </>
    )
}
