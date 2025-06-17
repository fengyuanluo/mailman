'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import SyncConfigModal from '@/components/modals/sync-config-modal'
import {
    Search,
    RefreshCw,
    Settings,
    Play,
    ChevronLeft,
    ChevronRight,
    Filter,
    Clock,
    Mail,
    CheckCircle,
    XCircle,
    AlertCircle,
    Plus,
    Edit,
    Trash2,
    Users,
    Activity,
    TrendingUp,
    Zap,
    Database,
    Timer,
    Folder
} from 'lucide-react'

interface SyncConfig {
    id: number
    account_id: number
    enable_auto_sync: boolean
    sync_interval: number
    sync_folders: string[]
    last_sync_time?: string
    last_sync_error?: string
    sync_status: string
    created_at: string
    updated_at: string
}

interface Account {
    id: number
    emailAddress: string
    name?: string
    authType?: string
    mailProviderId?: number
    mailProvider?: {
        id: number
        name: string
        type: string
        imapServer: string
        imapPort: number
    }
}

interface SyncConfigWithAccount extends SyncConfig {
    account: Account
}

interface GlobalSyncConfig {
    default_enable_sync: boolean
    default_sync_interval: number
    default_sync_folders: string[]
    max_sync_workers: number
    max_emails_per_sync: number
}

interface PaginatedResponse {
    configs: SyncConfigWithAccount[]
    total_count: number
    page: number
    limit: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
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

export default function SyncConfigTab() {
    const [configs, setConfigs] = useState<SyncConfigWithAccount[]>([])
    const [globalConfig, setGlobalConfig] = useState<GlobalSyncConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState<Map<number, boolean>>(new Map())
    const [accounts, setAccounts] = useState<Account[]>([])

    // 分页和搜索状态
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('all')

    // 模态框状态
    const [modalOpen, setModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'global'>('create')
    const [editingConfig, setEditingConfig] = useState<SyncConfigWithAccount | null>(null)

    useEffect(() => {
        loadData()
    }, [currentPage, pageSize, searchQuery, filterStatus])

    const loadData = async () => {
        try {
            setLoading(true)

            // 加载同步配置列表（分页）
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: pageSize.toString(),
            })

            if (searchQuery) {
                params.append('search', searchQuery)
            }

            if (filterStatus !== 'all') {
                params.append('status', filterStatus)
            }

            const response = await apiClient.get(`/sync/configs?${params}`)
            const data: PaginatedResponse = response.data || response

            setConfigs(data.configs || [])
            setTotalPages(data.total_pages || 1)
            setTotalCount(data.total_count || 0)

            // 加载全局配置
            const globalRes = await apiClient.get('/sync/global-config')
            const globalData = globalRes.data || globalRes
            setGlobalConfig(globalData)

            // 加载所有账户（用于新增配置）
            const accountsRes = await apiClient.get('/accounts')
            const accountsData = accountsRes.data || accountsRes
            setAccounts(accountsData.accounts || [])

        } catch (error) {
            console.error('Failed to load sync configs:', error)
            toast.error('加载同步配置失败')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        setCurrentPage(1)
    }

    const handleFilterChange = (value: string) => {
        setFilterStatus(value)
        setCurrentPage(1)
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    const handlePageSizeChange = (size: string) => {
        setPageSize(parseInt(size))
        setCurrentPage(1)
    }

    const handleSyncNow = async (accountId: number) => {
        try {
            setSyncing(new Map(syncing.set(accountId, true)))

            const response = await apiClient.post(`/accounts/${accountId}/sync-now`)
            const result = response.data || response

            if (result.success) {
                toast.success(`同步完成：已同步 ${result.emails_synced} 封邮件`)
            } else {
                toast.error(`同步失败：${result.error || '未知错误'}`)
            }

            await loadData()
        } catch (error) {
            console.error('Sync failed:', error)
            toast.error('同步失败')
        } finally {
            setSyncing(new Map(syncing.set(accountId, false)))
        }
    }

    const handleDeleteConfig = async (accountId: number) => {
        if (!confirm('确定要删除此同步配置吗？')) {
            return
        }

        try {
            await apiClient.delete(`/accounts/${accountId}/sync-config`)
            toast.success('同步配置已删除')
            await loadData()
        } catch (error) {
            console.error('Failed to delete config:', error)
            toast.error('删除配置失败')
        }
    }

    const openModal = (mode: 'create' | 'edit' | 'global', config?: SyncConfigWithAccount) => {
        setModalMode(mode)
        setEditingConfig(config || null)
        setModalOpen(true)
    }

    const closeModal = () => {
        setModalOpen(false)
        setEditingConfig(null)
    }

    const formatSyncStatus = (status: string) => {
        switch (status) {
            case 'idle':
                return <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />空闲
                </Badge>
            case 'syncing':
                return <Badge variant="default" className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />同步中
                </Badge>
            case 'error':
                return <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" />错误
                </Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const formatLastSyncTime = (time?: string) => {
        if (!time) return '从未同步'

        const date = new Date(time)
        const now = new Date()
        const diff = now.getTime() - date.getTime()

        if (diff < 60000) return '刚刚'
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`

        return date.toLocaleString('zh-CN')
    }

    const formatInterval = (seconds: number) => {
        if (seconds < 60) return `${seconds} 秒`
        if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`
        return `${Math.floor(seconds / 3600)} 小时`
    }

    // 获取没有同步配置的账户
    const accountsWithoutConfig = accounts.filter(
        account => !configs.some(config => config.account_id === account.id)
    )

    // 计算统计数据
    const activeConfigs = configs.filter(config => config.enable_auto_sync).length
    const syncingConfigs = configs.filter(config => config.sync_status === 'syncing').length
    const errorConfigs = configs.filter(config => config.sync_status === 'error').length
    const avgSyncInterval = configs.length > 0
        ? Math.round(configs.reduce((sum, config) => sum + config.sync_interval, 0) / configs.length)
        : 0

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
        <div className="space-y-6">
            {/* 欢迎横幅 */}
            <div className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">同步配置管理</h2>
                        <p className="mt-2 text-primary-100">
                            管理邮件账户的自动同步设置和全局配置
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={loadData}
                            disabled={loading}
                            className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            刷新
                        </Button>
                        {accountsWithoutConfig.length > 0 && (
                            <Button
                                size="sm"
                                onClick={() => openModal('create')}
                                className="bg-white text-primary-600 hover:bg-white/90"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                新增配置
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="配置账户"
                    value={totalCount}
                    icon={Users}
                    trend="up"
                    trendValue={`${activeConfigs} 已启用`}
                    color="primary"
                />
                <StatCard
                    title="同步中"
                    value={syncingConfigs}
                    icon={Activity}
                    color="success"
                />
                <StatCard
                    title="错误配置"
                    value={errorConfigs}
                    icon={AlertCircle}
                    color="danger"
                />
                <StatCard
                    title="平均间隔"
                    value={formatInterval(avgSyncInterval)}
                    icon={Timer}
                    color="warning"
                />
            </div>

            {/* 全局配置和快速操作 */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* 全局配置 */}
                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Settings className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">全局同步设置</h3>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openModal('global')}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            编辑
                        </Button>
                    </div>
                    {globalConfig && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium">默认启用自动同步</span>
                                </div>
                                <Badge variant={globalConfig.default_enable_sync ? 'default' : 'secondary'}>
                                    {globalConfig.default_enable_sync ? '是' : '否'}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium">默认同步间隔</span>
                                </div>
                                <span className="text-sm font-medium">
                                    {formatInterval(globalConfig.default_sync_interval)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium">最大工作线程</span>
                                </div>
                                <span className="text-sm font-medium">
                                    {globalConfig.max_sync_workers} 个
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 快速操作 */}
                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">快速操作</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => openModal('create')}
                            className="flex items-center justify-between w-full rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                            <div className="flex items-center space-x-3">
                                <Plus className="h-5 w-5 text-primary-600" />
                                <span className="font-medium text-gray-900 dark:text-white">新增同步配置</span>
                            </div>
                            <span className="text-sm text-gray-500">→</span>
                        </button>
                        <button
                            onClick={() => openModal('global')}
                            className="flex items-center justify-between w-full rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                            <div className="flex items-center space-x-3">
                                <Settings className="h-5 w-5 text-primary-600" />
                                <span className="font-medium text-gray-900 dark:text-white">编辑全局设置</span>
                            </div>
                            <span className="text-sm text-gray-500">→</span>
                        </button>
                        <button className="flex items-center justify-between w-full rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
                            <div className="flex items-center space-x-3">
                                <RefreshCw className="h-5 w-5 text-primary-600" />
                                <span className="font-medium text-gray-900 dark:text-white">同步所有账户</span>
                            </div>
                            <span className="text-sm text-gray-500">→</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 搜索和过滤栏 */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="搜索邮箱地址..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={filterStatus} onValueChange={handleFilterChange}>
                                <SelectTrigger className="w-[150px] dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="状态筛选" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全部状态</SelectItem>
                                    <SelectItem value="idle">空闲</SelectItem>
                                    <SelectItem value="syncing">同步中</SelectItem>
                                    <SelectItem value="error">错误</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                                <SelectTrigger className="w-[100px] dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 条</SelectItem>
                                    <SelectItem value="20">20 条</SelectItem>
                                    <SelectItem value="50">50 条</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 同步配置列表 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-muted-foreground" />
                            <CardTitle>账户同步配置</CardTitle>
                            <Badge variant="outline" className="ml-2">
                                {totalCount} 个账户
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border dark:border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-muted/50 dark:bg-gray-800 dark:border-gray-700">
                                        <th className="text-left py-3 px-4 font-medium text-sm dark:text-gray-300">账户</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm dark:text-gray-300">状态</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm dark:text-gray-300">自动同步</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm dark:text-gray-300">同步间隔</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm dark:text-gray-300">同步文件夹</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm dark:text-gray-300">上次同步</th>
                                        <th className="text-right py-3 px-4 font-medium text-sm dark:text-gray-300">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {configs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Mail className="w-8 h-8 text-muted-foreground" />
                                                    <p className="text-muted-foreground">暂无同步配置</p>
                                                    {accountsWithoutConfig.length > 0 && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openModal('create')}
                                                        >
                                                            <Plus className="w-4 h-4 mr-2" />
                                                            新增配置
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        configs.map((config) => (
                                            <tr key={config.account_id} className="border-b hover:bg-muted/50 dark:border-gray-700 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="space-y-1">
                                                        <p className="font-medium text-sm dark:text-white">{config.account.emailAddress}</p>
                                                        {config.account.mailProvider && (
                                                            <p className="text-xs text-muted-foreground dark:text-gray-400">
                                                                {config.account.mailProvider.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    {formatSyncStatus(config.sync_status)}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Badge variant={config.enable_auto_sync ? 'default' : 'secondary'}>
                                                        {config.enable_auto_sync ? '已启用' : '已禁用'}
                                                    </Badge>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                                        {formatInterval(config.sync_interval)}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {config.sync_folders.slice(0, 3).map((folder) => (
                                                            <Badge key={folder} variant="outline" className="text-xs">
                                                                {folder}
                                                            </Badge>
                                                        ))}
                                                        {config.sync_folders.length > 3 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{config.sync_folders.length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="text-sm space-y-1">
                                                        <p className="text-muted-foreground dark:text-gray-400">
                                                            {formatLastSyncTime(config.last_sync_time)}
                                                        </p>
                                                        {config.last_sync_error && (
                                                            <div className="flex items-center gap-1 text-destructive text-xs">
                                                                <AlertCircle className="w-3 h-3" />
                                                                错误
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openModal('edit', config)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleSyncNow(config.account_id)}
                                                            disabled={syncing.get(config.account_id) || config.sync_status === 'syncing'}
                                                        >
                                                            {syncing.get(config.account_id) || config.sync_status === 'syncing' ? (
                                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Play className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteConfig(config.account_id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 分页控件 */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t dark:border-gray-700">
                            <p className="text-sm text-muted-foreground dark:text-gray-400">
                                显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} 条，共 {totalCount} 条
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    上一页
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number
                                        if (totalPages <= 5) {
                                            pageNum = i + 1
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i
                                        } else {
                                            pageNum = currentPage - 2 + i
                                        }

                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handlePageChange(pageNum)}
                                            >
                                                {pageNum}
                                            </Button>
                                        )
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    下一页
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 同步配置模态框 */}
            <SyncConfigModal
                isOpen={modalOpen}
                onClose={closeModal}
                onSuccess={loadData}
                config={editingConfig || undefined}
                mode={modalMode}
                accounts={modalMode === 'create' ? accountsWithoutConfig : accounts}
            />
        </div>
    )
}