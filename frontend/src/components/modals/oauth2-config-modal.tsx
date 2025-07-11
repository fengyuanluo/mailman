'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Eye, EyeOff, AlertCircle, CheckCircle, HelpCircle, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { oauth2Service } from '@/services/oauth2.service'
import { OAuth2GlobalConfig, OAuth2ProviderType, CreateOAuth2ConfigRequest } from '@/types'
import OAuth2HelpModal from './oauth2-help-modal'
import toast from 'react-hot-toast'

// 配置指导Tooltip组件
const ConfigGuideTooltip = ({ provider, isVisible, onClose }: { provider: OAuth2ProviderType, isVisible: boolean, onClose: () => void }) => {
    const getCorrectRedirectUri = (provider: OAuth2ProviderType): string => {
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
        return `${backendUrl}/api/oauth2/callback/${provider}`
    }

    const getConfigGuide = (provider: OAuth2ProviderType) => {
        const redirectUri = getCorrectRedirectUri(provider)

        if (provider === 'gmail') {
            return {
                title: 'Google Cloud Console 配置指导',
                steps: [
                    '1. 访问 Google Cloud Console (https://console.cloud.google.com/)',
                    '2. 创建或选择一个项目',
                    '3. 启用 Gmail API',
                    '4. 创建 OAuth 2.0 客户端 ID',
                    '5. 在"Authorized redirect URIs"中添加以下后端API地址：',
                    redirectUri,
                    '6. 保存配置并获取客户端ID和密钥'
                ],
                redirectUri,
                docsUrl: 'https://developers.google.com/gmail/api/quickstart/nodejs'
            }
        } else if (provider === 'outlook') {
            return {
                title: 'Microsoft Azure 配置指导',
                steps: [
                    '1. 访问 Azure Portal (https://portal.azure.com/)',
                    '2. 注册新的应用程序',
                    '3. 配置 API 权限 (Mail.Read, Mail.Send)',
                    '4. 在"重定向URI"中添加以下后端API地址：',
                    redirectUri,
                    '5. 生成客户端密钥'
                ],
                redirectUri,
                docsUrl: 'https://docs.microsoft.com/en-us/graph/auth-v2-user'
            }
        }
        return null
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success('回调地址已复制到剪贴板')
        } catch (err) {
            console.error('Failed to copy text: ', err)
            toast.error('复制失败，请手动复制')
        }
    }

    const guide = getConfigGuide(provider)
    if (!guide || !isVisible) return null

    return (
        <div className="absolute z-50 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            <div className="flex items-start justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {guide.title}
                </h4>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {guide.steps.map((step, index) => (
                    <div key={index} className={step === guide.redirectUri ? "font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded flex items-start gap-2" : ""}>
                        {step === guide.redirectUri ? (
                            <div className="flex-1 min-w-0">
                                <div className="break-all text-xs leading-relaxed">
                                    {step}
                                </div>
                            </div>
                        ) : (
                            <span>{step}</span>
                        )}
                        {step === guide.redirectUri && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(step)}
                                className="h-6 p-1 text-gray-600 dark:text-gray-400 flex-shrink-0"
                                title="复制回调地址"
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <a
                    href={guide.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                    查看官方文档
                    <ExternalLink className="h-3 w-3" />
                </a>
            </div>
        </div>
    )
}

interface OAuth2ConfigModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    config?: OAuth2GlobalConfig | null
}

export default function OAuth2ConfigModal({ isOpen, onClose, onSuccess, config }: OAuth2ConfigModalProps) {
    const [provider, setProvider] = useState<OAuth2ProviderType>('gmail')
    const [clientId, setClientId] = useState('')
    const [clientSecret, setClientSecret] = useState('')
    const [redirectUri, setRedirectUri] = useState('')
    const [scopes, setScopes] = useState<string[]>([])
    const [customScope, setCustomScope] = useState('')
    const [enabled, setEnabled] = useState(true)
    const [jsonConfig, setJsonConfig] = useState('')
    const [showJsonInput, setShowJsonInput] = useState(false)
    const [showConfigGuideTooltip, setShowConfigGuideTooltip] = useState(false)
    const [showHelpModal, setShowHelpModal] = useState(false)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [validationErrors, setValidationErrors] = useState<string[]>([])

    // 获取默认的认证URL
    const getDefaultAuthUrl = (provider: OAuth2ProviderType): string => {
        const urls = {
            gmail: 'https://accounts.google.com/o/oauth2/v2/auth',
            outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
        }
        return urls[provider]
    }

    // 获取默认的令牌URL
    const getDefaultTokenUrl = (provider: OAuth2ProviderType): string => {
        const urls = {
            gmail: 'https://oauth2.googleapis.com/token',
            outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
        }
        return urls[provider]
    }

    // 生成正确的回调URL - 指向后端API
    const getCorrectRedirectUri = (provider: OAuth2ProviderType): string => {
        // 获取后端API基础URL
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
        return `${backendUrl}/api/oauth2/callback/${provider}`
    }

    // 复制到剪贴板
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            // 这里可以添加一个toast提示
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }


    // 重置表单
    const resetForm = () => {
        setProvider('gmail')
        setClientId('')
        setClientSecret('')
        setRedirectUri('')
        setScopes([])
        setCustomScope('')
        setEnabled(true)
        setJsonConfig('')
        setShowJsonInput(false)
        setShowConfigGuideTooltip(false)
        setError('')
        setValidationErrors([])
    }

    // 解析Gmail JSON配置
    const parseGmailJson = (jsonText: string) => {
        try {
            const parsed = JSON.parse(jsonText)

            // 支持两种格式：直接的web对象或包含web属性的对象
            const webConfig = parsed.web || parsed

            if (webConfig.client_id) {
                setClientId(webConfig.client_id)
            }
            if (webConfig.client_secret) {
                setClientSecret(webConfig.client_secret)
            }
            if (webConfig.redirect_uris && webConfig.redirect_uris.length > 0) {
                setRedirectUri(webConfig.redirect_uris[0])
            }

            // 设置Gmail固定权限范围（受保护）
            setScopes(oauth2Service.getGmailProtectedScopes())

            setError('')
            setValidationErrors([])

            return true
        } catch (err) {
            setError('JSON格式错误，请检查后重试')
            return false
        }
    }

    // 处理JSON配置导入
    const handleJsonImport = () => {
        if (!jsonConfig.trim()) {
            setError('请输入JSON配置')
            return
        }

        if (parseGmailJson(jsonConfig)) {
            setShowJsonInput(false)
            setJsonConfig('')
        }
    }

    // 初始化表单数据
    useEffect(() => {
        if (isOpen) {
            if (config) {
                // 编辑模式
                setProvider(config.provider_type)
                setClientId(config.client_id)
                setClientSecret(config.client_secret)
                setRedirectUri(config.redirect_uri)
                setScopes(config.scopes)
                setEnabled(config.is_enabled)
            } else {
                // 新建模式
                resetForm()
                // 设置默认值 - 使用正确的回调URL格式
                setRedirectUri(getCorrectRedirectUri(provider))
                setScopes(oauth2Service.getDefaultScopes(provider))
            }
        }
    }, [isOpen, config])

    // 当提供商改变时，更新默认作用域和回调URL
    useEffect(() => {
        if (!config) { // 仅在新建模式下自动更新
            setScopes(oauth2Service.getDefaultScopes(provider))
            setRedirectUri(getCorrectRedirectUri(provider))
        }
    }, [provider, config])

    // 强制Gmail使用固定的受保护scope
    useEffect(() => {
        if (provider === 'gmail') {
            setScopes(oauth2Service.getGmailProtectedScopes())
        }
    }, [provider])

    // 验证表单
    const validateForm = () => {
        const configData: CreateOAuth2ConfigRequest = {
            provider_type: provider,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            scopes,
            is_enabled: enabled
        }

        const validation = oauth2Service.validateConfig(configData)
        setValidationErrors(validation.errors)
        return validation.valid
    }

    // 添加自定义作用域（Gmail受保护，不允许添加）
    const addCustomScope = () => {
        if (provider === 'gmail') {
            return // Gmail的scope受保护，不允许添加自定义scope
        }
        if (customScope.trim() && !scopes.includes(customScope.trim())) {
            setScopes([...scopes, customScope.trim()])
            setCustomScope('')
        }
    }

    // 删除作用域（Gmail受保护scope不可删除）
    const removeScope = (index: number) => {
        if (provider === 'gmail') {
            return // Gmail的scope受保护，不允许删除
        }
        setScopes(scopes.filter((_, i) => i !== index))
    }

    // 使用默认作用域
    const useDefaultScopes = () => {
        setScopes(oauth2Service.getDefaultScopes(provider))
    }

    // 提交表单
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setLoading(true)
        setError('')

        try {
            const configData: CreateOAuth2ConfigRequest = {
                provider_type: provider,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                scopes,
                is_enabled: enabled
            }

            await oauth2Service.createOrUpdateGlobalConfig(configData)

            onSuccess()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : '保存配置失败')
        } finally {
            setLoading(false)
        }
    }

    // 如果模态框未打开，不渲染
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                {/* 标题 */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {config ? '编辑OAuth2配置' : '添加OAuth2配置'}
                    </h2>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowHelpModal(true)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            <HelpCircle className="h-4 w-4 mr-1" />
                            配置指南
                        </Button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                    {error}
                                </h3>
                            </div>
                        </div>
                    </div>
                )}

                {/* 验证错误 */}
                {validationErrors.length > 0 && (
                    <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                    请修正以下错误：
                                </h3>
                                <ul className="mt-2 text-sm text-red-700 dark:text-red-300">
                                    {validationErrors.map((error, index) => (
                                        <li key={index} className="list-disc list-inside">
                                            {error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 提供商选择 */}
                    <div>
                        <Label htmlFor="provider">邮箱提供商</Label>
                        <Select
                            value={provider}
                            onValueChange={(value) => setProvider(value as OAuth2ProviderType)}
                            disabled={!!config} // 编辑模式下禁用提供商选择
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="选择提供商" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                                {oauth2Service.getSupportedProviders().map((p) => (
                                    <SelectItem
                                        key={p}
                                        value={p}
                                        className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        {oauth2Service.getProviderDisplayName(p)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Gmail JSON导入功能 */}
                    {provider === 'gmail' && !config && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                        快速配置
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        从Gmail开发者控制台下载的JSON文件中导入配置
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowJsonInput(!showJsonInput)}
                                >
                                    {showJsonInput ? '隐藏' : '导入JSON'}
                                </Button>
                            </div>

                            {showJsonInput && (
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <Label htmlFor="jsonConfig">JSON配置</Label>
                                        <textarea
                                            id="jsonConfig"
                                            rows={6}
                                            value={jsonConfig}
                                            onChange={(e) => setJsonConfig(e.target.value)}
                                            placeholder='粘贴从Gmail开发者控制台下载的JSON配置，例如：
{
  "web": {
    "client_id": "xxx.apps.googleusercontent.com",
    "client_secret": "GOCSPX-xxx",
    "redirect_uris": ["http://127.0.0.1:3000/oauth2-google"]
  }
}'
                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleJsonImport}
                                        >
                                            解析并导入
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 客户端ID */}
                    <div>
                        <Label htmlFor="clientId">客户端 ID *</Label>
                        <Input
                            id="clientId"
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="输入客户端ID"
                            required
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            从 {oauth2Service.getProviderDisplayName(provider)} 开发者控制台获取
                        </p>
                    </div>

                    {/* 客户端密钥 */}
                    <div>
                        <Label htmlFor="clientSecret">客户端密钥 *</Label>
                        <Input
                            id="clientSecret"
                            type="text"
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            placeholder="输入客户端密钥"
                            required
                        />
                    </div>

                    {/* 重定向URI */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Label htmlFor="redirectUri">重定向 URI *</Label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowConfigGuideTooltip(!showConfigGuideTooltip)}
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    title="查看配置指导"
                                >
                                    <HelpCircle className="h-4 w-4 text-gray-500" />
                                </button>
                                <ConfigGuideTooltip
                                    provider={provider}
                                    isVisible={showConfigGuideTooltip}
                                    onClose={() => setShowConfigGuideTooltip(false)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                id="redirectUri"
                                type="url"
                                value={redirectUri}
                                onChange={(e) => setRedirectUri(e.target.value)}
                                placeholder={getCorrectRedirectUri(provider)}
                                required
                                readOnly={!config} // 新建模式下固定URL
                                className={!config ? "bg-gray-50 dark:bg-gray-800" : ""}
                            />
                            {!config && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(redirectUri)}
                                    title="复制到剪贴板"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                            OAuth2认证完成后的后端API回调地址
                            {!config && (
                                <span className="text-blue-600 dark:text-blue-400 ml-1">
                                    (已自动生成为后端API格式)
                                </span>
                            )}
                        </p>

                    </div>

                    {/* 权限范围 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>权限范围</Label>
                            {provider === 'gmail' ? (
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                        Gmail受保护
                                    </Badge>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={useDefaultScopes}
                                        disabled
                                        title="Gmail权限范围已固定，不可更改"
                                    >
                                        使用默认范围
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={useDefaultScopes}
                                >
                                    使用默认范围
                                </Button>
                            )}
                        </div>

                        {/* Gmail保护提示 */}
                        {provider === 'gmail' && (
                            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-blue-700 dark:text-blue-300">
                                        <p className="font-medium">Gmail权限范围已固定</p>
                                        <p className="text-xs mt-1">
                                            为确保IMAP兼容性和OAuth2认证稳定性，Gmail的权限范围已固定为系统最优配置，不可编辑。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 现有作用域 */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {scopes.map((scope, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className={`flex items-center gap-1 ${provider === 'gmail' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' : ''}`}
                                >
                                    {scope}
                                    {provider === 'gmail' ? (
                                        <button
                                            type="button"
                                            disabled
                                            title="Gmail权限范围受保护，不可删除"
                                            className="ml-1 rounded-full p-1 cursor-not-allowed opacity-50"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => removeScope(index)}
                                            className="ml-1 rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </Badge>
                            ))}
                        </div>

                        {/* 添加自定义作用域 */}
                        {provider === 'gmail' ? (
                            <div className="flex gap-2">
                                <Input
                                    value=""
                                    disabled
                                    placeholder="Gmail权限范围已固定，不可添加自定义范围"
                                    className="bg-gray-50 dark:bg-gray-800"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled
                                    title="Gmail权限范围已固定，不可添加自定义范围"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    value={customScope}
                                    onChange={(e) => setCustomScope(e.target.value)}
                                    placeholder="添加自定义权限范围"
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomScope())}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addCustomScope}
                                    disabled={!customScope.trim()}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* 启用状态 */}
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                        <Label htmlFor="enabled">启用此配置</Label>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            取消
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    保存中...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    {config ? '更新配置' : '创建配置'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>

            {/* OAuth2帮助模态框 */}
            <OAuth2HelpModal
                isOpen={showHelpModal}
                onClose={() => setShowHelpModal(false)}
            />
        </div>
    )
}