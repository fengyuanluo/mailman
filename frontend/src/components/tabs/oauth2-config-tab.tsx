'use client'

import { useState, useEffect } from 'react'
import { Settings, Plus, Edit, Trash2, Power, Check, X, AlertCircle, Link, Search, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { oauth2Service } from '@/services/oauth2.service'
import { OAuth2GlobalConfig, OAuth2ProviderType } from '@/types'
import OAuth2ConfigModal from '@/components/modals/oauth2-config-modal'

// OAuth2配置卡片组件
function OAuth2ConfigCard({
    config,
    onEdit,
    onDelete,
    onToggleEnabled,
    onTestConnection
}: {
    config: OAuth2GlobalConfig
    onEdit: (config: OAuth2GlobalConfig) => void
    onDelete: (config: OAuth2GlobalConfig) => void
    onToggleEnabled: (config: OAuth2GlobalConfig) => void
    onTestConnection: (config: OAuth2GlobalConfig) => void
}) {
    const [isToggling, setIsToggling] = useState(false)
    const [isTesting, setIsTesting] = useState(false)

    const handleToggleEnabled = async () => {
        setIsToggling(true)
        try {
            if (config.is_enabled) {
                await oauth2Service.disableProvider(config.provider_type)
            } else {
                await oauth2Service.enableProvider(config.provider_type)
            }
            onToggleEnabled(config)
        } catch (error) {
            console.error('Failed to toggle provider:', error)
        } finally {
            setIsToggling(false)
        }
    }

    const handleTestConnection = async () => {
        setIsTesting(true)
        try {
            await onTestConnection(config)
        } finally {
            setIsTesting(false)
        }
    }

    const getProviderIcon = (provider: OAuth2ProviderType) => {
        switch (provider) {
            case 'gmail':
                return '📧'
            case 'outlook':
                return '📮'
            default:
                return '🔗'
        }
    }

    const getProviderColor = (provider: OAuth2ProviderType) => {
        switch (provider) {
            case 'gmail':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            case 'outlook':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
        }
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
            {/* 第一行：标题和开关 */}
            <div className="flex items-center justify-between mb-4">
                {/* 左侧：图标 + 标题 + Badge */}
                <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                        {getProviderIcon(config.provider_type)}
                    </div>
                    <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {oauth2Service.getProviderDisplayName(config.provider_type)}
                        </h3>
                        <Badge className={cn(getProviderColor(config.provider_type))}>
                            {config.provider_type.toUpperCase()}
                        </Badge>
                    </div>
                </div>
                
                {/* 右侧：开关 */}
                <div className="flex items-center space-x-2">
                    <Switch
                        checked={config.is_enabled}
                        onCheckedChange={handleToggleEnabled}
                        disabled={isToggling}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {config.is_enabled ? '已启用' : '已禁用'}
                    </span>
                </div>
            </div>

            {/* 创建时间 */}
            <div className="mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    创建于 {new Date(config.created_at).toLocaleDateString()}
                </span>
            </div>

            {/* 第二行：操作按钮 */}
            <div className="mb-4">
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestConnection}
                        disabled={isTesting || !config.is_enabled}
                        className="flex-1"
                    >
                        {isTesting ? (
                            <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                测试中...
                            </>
                        ) : (
                            <>
                                <Link className="mr-2 h-4 w-4" />
                                测试连接
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(config)}
                        className="flex-1"
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        编辑
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(config)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300 flex-1"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                    </Button>
                </div>
            </div>

            {/* 配置信息区域 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        客户端 ID
                    </label>
                    <div
                        className="rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700 cursor-pointer group"
                        title={config.client_id}
                    >
                        <span className="block truncate group-hover:text-primary-600">
                            {config.client_id.length > 30 ? `${config.client_id.substring(0, 30)}...` : config.client_id}
                        </span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        客户端密钥
                    </label>
                    <div
                        className="rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700 cursor-pointer group"
                        title={config.client_secret}
                    >
                        <span className="block truncate group-hover:text-primary-600">
                            {config.client_secret.length > 30 ? `${config.client_secret.substring(0, 30)}...` : config.client_secret}
                        </span>
                    </div>
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        重定向 URI
                    </label>
                    <div
                        className="rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700 cursor-pointer group"
                        title={config.redirect_uri}
                    >
                        <span className="block truncate group-hover:text-primary-600">
                            {config.redirect_uri}
                        </span>
                    </div>
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        权限范围
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {config.scopes.map((scope, index) => (
                            <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                            >
                                {scope}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// 主组件
export default function OAuth2ConfigTab() {
    const [configs, setConfigs] = useState<OAuth2GlobalConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [editingConfig, setEditingConfig] = useState<OAuth2GlobalConfig | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // 加载配置
    const loadConfigs = async () => {
        try {
            setLoading(true)
            const configsData = await oauth2Service.getGlobalConfigs()
            setConfigs(configsData)
        } catch (err) {
            setError('加载OAuth2配置失败')
            console.error('Failed to load OAuth2 configs:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadConfigs()
    }, [])

    // 处理编辑
    const handleEdit = (config: OAuth2GlobalConfig) => {
        setEditingConfig(config)
        setShowModal(true)
    }

    // 处理删除
    const handleDelete = async (config: OAuth2GlobalConfig) => {
        if (!confirm(`确定要删除 ${oauth2Service.getProviderDisplayName(config.provider_type)} 的配置吗？`)) {
            return
        }

        try {
            await oauth2Service.deleteGlobalConfig(config.id)
            setConfigs(configs.filter(c => c.id !== config.id))
        } catch (err) {
            console.error('Failed to delete config:', err)
            alert('删除配置失败')
        }
    }

    // 处理启用/禁用切换
    const handleToggleEnabled = (config: OAuth2GlobalConfig) => {
        setConfigs(configs.map(c =>
            c.id === config.id ? { ...c, is_enabled: !c.is_enabled } : c
        ))
    }

    // 处理测试连接
    const handleTestConnection = async (config: OAuth2GlobalConfig) => {
        try {
            const authUrl = await oauth2Service.getAuthUrl(config.provider_type)
            window.open(authUrl.auth_url, '_blank', 'width=600,height=700')
        } catch (err) {
            console.error('Failed to test connection:', err)
            alert('测试连接失败')
        }
    }

    // 处理添加新配置
    const handleAddConfig = () => {
        setEditingConfig(null)
        setShowModal(true)
    }

    // 获取未配置的提供商
    const getUnconfiguredProviders = () => {
        const configuredProviders = configs.map(c => c.provider_type)
        return oauth2Service.getSupportedProviders().filter(p => !configuredProviders.includes(p))
    }

    // 过滤配置
    const filteredConfigs = configs.filter(config =>
        oauth2Service.getProviderDisplayName(config.provider_type).toLowerCase().includes(searchQuery.toLowerCase()) ||
        config.client_id.toLowerCase().includes(searchQuery.toLowerCase())
    )

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

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        加载失败
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{error}</p>
                    <Button
                        onClick={loadConfigs}
                        className="mt-4"
                        variant="outline"
                    >
                        重试
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-6">
                {/* 搜索和操作栏 */}
                <div className="flex items-center justify-between">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索OAuth2配置..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleAddConfig}
                            className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                        >
                            <Plus className="h-4 w-4" />
                            <span>添加配置</span>
                        </button>
                    </div>
                </div>

                {/* 配置列表 */}
                {filteredConfigs.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
                        <Settings className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                            {searchQuery ? '没有找到匹配的配置' : '暂无OAuth2配置'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {searchQuery ? '尝试使用不同的搜索词' : '开始添加第一个OAuth2提供商配置'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={handleAddConfig}
                                className="mt-4 text-primary-600 hover:text-primary-700"
                            >
                                添加第一个配置
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredConfigs.map((config) => (
                            <OAuth2ConfigCard
                                key={config.id}
                                config={config}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onToggleEnabled={handleToggleEnabled}
                                onTestConnection={handleTestConnection}
                            />
                        ))}
                    </div>
                )}

                {/* 可用提供商提示 */}
                {getUnconfiguredProviders().length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            可添加的提供商
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {getUnconfiguredProviders().map((provider) => (
                                <Badge
                                    key={provider}
                                    variant="outline"
                                    className="text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={handleAddConfig}
                                >
                                    <Plus className="mr-1 h-3 w-3" />
                                    {oauth2Service.getProviderDisplayName(provider)}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* OAuth2配置模态框 */}
            <OAuth2ConfigModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false)
                    setEditingConfig(null)
                }}
                onSuccess={() => {
                    setShowModal(false)
                    setEditingConfig(null)
                    loadConfigs()
                }}
                config={editingConfig}
            />
        </>
    )
}