'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Play,
    Pause,
    Eye,
    BarChart3,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Zap,
    Activity,
    Settings,
    Filter,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
} from 'lucide-react'
import { triggerService } from '@/services/trigger.service'
import {
    EmailTrigger,
    PaginatedTriggersResponse,
    TriggerStatus,
    PaginationParams,
} from '@/types'
import CreateTriggerModal from '@/components/modals/create-trigger-modal'
import { cn } from '@/lib/utils'

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
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>

            {startPage > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        className="rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                        1
                    </button>
                    {startPage > 2 && <span className="text-gray-400 dark:text-gray-500">...</span>}
                </>
            )}

            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={cn(
                        "rounded-lg px-3 py-1 text-sm transition-colors",
                        page === currentPage
                            ? "bg-primary-600 text-white shadow-sm"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    )}
                >
                    {page}
                </button>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="text-gray-400 dark:text-gray-500">...</span>}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        className="rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
                <ChevronRight className="h-5 w-5" />
            </button>
        </div>
    )
}

export function TriggersTab() {
    const [triggers, setTriggers] = useState<EmailTrigger[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [selectedTrigger, setSelectedTrigger] = useState<EmailTrigger | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showLogsModal, setShowLogsModal] = useState(false)
    const [showStatsModal, setShowStatsModal] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const limit = 10

    // 加载触发器列表
    const loadTriggers = async (page = 1, search = '', showLoading = true) => {
        try {
            if (showLoading) {
                setLoading(true)
            } else {
                setRefreshing(true)
            }
            setError(null)

            const params: PaginationParams = {
                page,
                limit,
                sort_by: 'created_at',
                sort_order: 'desc',
            }

            if (search.trim()) {
                params.search = search.trim()
            }

            const response: PaginatedTriggersResponse = await triggerService.getTriggers(params)
            setTriggers(response.data)
            setCurrentPage(response.page)
            setTotalPages(response.total_pages)
            setTotal(response.total)
        } catch (err) {
            console.error('Failed to load triggers:', err)
            setError('加载触发器列表失败')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    // 初始加载
    useEffect(() => {
        loadTriggers()
    }, [])

    // 搜索处理
    const handleSearch = () => {
        setCurrentPage(1)
        loadTriggers(1, searchTerm)
    }

    // 分页处理
    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        loadTriggers(page, searchTerm)
    }

    // 刷新处理
    const handleRefresh = () => {
        loadTriggers(currentPage, searchTerm, false)
    }

    // 启用/禁用触发器
    const handleToggleStatus = async (trigger: EmailTrigger) => {
        try {
            if (trigger.status === 'enabled') {
                await triggerService.disableTrigger(trigger.id)
            } else {
                await triggerService.enableTrigger(trigger.id)
            }
            loadTriggers(currentPage, searchTerm)
        } catch (err) {
            console.error('Failed to toggle trigger status:', err)
            setError('切换触发器状态失败')
        }
    }

    // 删除触发器
    const handleDelete = async (trigger: EmailTrigger) => {
        if (!confirm(`确定要删除触发器 "${trigger.name}" 吗？`)) {
            return
        }

        try {
            await triggerService.deleteTrigger(trigger.id)
            loadTriggers(currentPage, searchTerm)
        } catch (err) {
            console.error('Failed to delete trigger:', err)
            setError('删除触发器失败')
        }
    }

    // 获取状态徽章
    const getStatusBadge = (status: TriggerStatus) => {
        if (status === 'enabled') {
            return (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                    <Play className="h-3 w-3 mr-1" />
                    启用
                </Badge>
            )
        }
        return (
            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                <Pause className="h-3 w-3 mr-1" />
                禁用
            </Badge>
        )
    }

    // 获取执行状态图标
    const getExecutionStatusIcon = (trigger: EmailTrigger) => {
        if (!trigger.last_executed_at) {
            return <Clock className="h-4 w-4 text-gray-400" />
        }

        if (trigger.last_error) {
            return <XCircle className="h-4 w-4 text-red-500" />
        }

        return <CheckCircle className="h-4 w-4 text-green-500" />
    }

    // 格式化时间
    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '从未执行'
        return new Date(timeStr).toLocaleString('zh-CN')
    }

    // 计算成功率
    const getSuccessRate = (trigger: EmailTrigger) => {
        if (trigger.total_executions === 0) return 0
        return Math.round((trigger.success_executions / trigger.total_executions) * 100)
    }

    if (loading && (!triggers || triggers.length === 0)) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 头部操作栏 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">触发器管理</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        管理邮件触发器，自动化处理邮件任务
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        size="sm"
                        disabled={refreshing}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        刷新
                    </Button>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                    >
                        <Plus className="h-4 w-4" />
                        创建触发器
                    </Button>
                </div>
            </div>

            {/* 搜索和过滤栏 */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="搜索触发器名称或描述..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10 focus-ring"
                    />
                </div>
                <Button
                    onClick={handleSearch}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <Filter className="h-4 w-4" />
                    搜索
                </Button>
            </div>

            {/* 错误提示 */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                        <span className="text-red-700 dark:text-red-300">{error}</span>
                    </div>
                </div>
            )}

            {/* 统计信息 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 card-hover border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">总触发器</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
                        </div>
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                    </div>
                </Card>
                <Card className="p-6 card-hover border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">启用中</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {(triggers || []).filter(t => t.status === 'enabled').length}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Play className="h-6 w-6 text-white" />
                        </div>
                    </div>
                </Card>
                <Card className="p-6 card-hover border-0 shadow-sm bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">已禁用</p>
                            <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                                {(triggers || []).filter(t => t.status === 'disabled').length}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Pause className="h-6 w-6 text-white" />
                        </div>
                    </div>
                </Card>
                <Card className="p-6 card-hover border-0 shadow-sm bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">总执行次数</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {(triggers || []).reduce((sum, t) => sum + t.total_executions, 0)}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Activity className="h-6 w-6 text-white" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* 触发器列表 */}
            <div className="space-y-4">
                {(triggers || []).map((trigger) => (
                    <Card key={trigger.id} className="p-6 card-hover border-0 shadow-sm bg-white dark:bg-gray-800/50 backdrop-blur-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                                        <Zap className="h-4 w-4 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{trigger.name}</h3>
                                    {getStatusBadge(trigger.status)}
                                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        {getExecutionStatusIcon(trigger)}
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            成功率: {getSuccessRate(trigger)}%
                                        </span>
                                    </div>
                                </div>

                                {trigger.description && (
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">{trigger.description}</p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-500 dark:text-gray-400">检查间隔:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{trigger.check_interval}秒</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                        <Activity className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-500 dark:text-gray-400">总执行次数:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{trigger.total_executions}</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-500 dark:text-gray-400">最后执行:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{formatTime(trigger.last_executed_at)}</span>
                                    </div>
                                </div>

                                {trigger.last_error && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5" />
                                            <div>
                                                <strong className="text-red-700 dark:text-red-300">最后错误:</strong>
                                                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{trigger.last_error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 ml-6">
                                <Switch
                                    checked={trigger.status === 'enabled'}
                                    onCheckedChange={() => handleToggleStatus(trigger)}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTrigger(trigger)
                                        setShowStatsModal(true)
                                    }}
                                    className="hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
                                >
                                    <BarChart3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTrigger(trigger)
                                        setShowLogsModal(true)
                                    }}
                                    className="hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-900/20"
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTrigger(trigger)
                                        setShowEditModal(true)
                                    }}
                                    className="hover:bg-yellow-50 hover:border-yellow-200 dark:hover:bg-yellow-900/20"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(trigger)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        显示第 {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} 条，共 {total} 条记录
                    </p>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}

            {/* 空状态 */}
            {!loading && (!triggers || triggers.length === 0) && (
                <div className="text-center py-16">
                    <div className="mx-auto h-24 w-24 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center mb-6">
                        <Zap className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无触发器</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        {searchTerm ? '没有找到匹配的触发器，请尝试其他搜索条件' : '还没有创建任何触发器，创建您的第一个邮件自动化触发器'}
                    </p>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        创建第一个触发器
                    </Button>
                </div>
            )}

            {/* 创建触发器模态框 */}
            <CreateTriggerModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => loadTriggers(currentPage, searchTerm)}
            />

            {/* TODO: 添加其他模态框组件 */}
            {/* EditTriggerModal */}
            {/* TriggerLogsModal */}
            {/* TriggerStatsModal */}
        </div>
    )
}
