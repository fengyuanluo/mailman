'use client'

import { useState } from 'react'
import { X, ExternalLink, Copy, Check, FileText, Globe, Key, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OAuth2HelpModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function OAuth2HelpModal({ isOpen, onClose }: OAuth2HelpModalProps) {
    const [copiedText, setCopiedText] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('gmail')

    if (!isOpen) return null

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedText(label)
            setTimeout(() => setCopiedText(null), 2000)
        })
    }

    const gmailScopes = [
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ]

    const outlookScopes = [
        'https://graph.microsoft.com/mail.read',
        'https://graph.microsoft.com/mail.send',
        'https://graph.microsoft.com/mail.readwrite'
    ]

    const tabs = [
        { id: 'gmail', name: 'Gmail 配置', icon: '📧' },
        { id: 'outlook', name: 'Outlook 配置', icon: '📮' },
        { id: 'faq', name: '常见问题', icon: '❓' }
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white rounded-lg shadow-xl dark:bg-gray-800 overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    OAuth2 配置指南
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    详细的 Gmail 和 Outlook OAuth2 配置步骤
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-6">
                    <nav className="flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    } flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                            >
                                <span className="text-base">{tab.icon}</span>
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[70vh] p-6">
                    {activeTab === 'gmail' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                    📧 Gmail OAuth2 配置
                                </h3>
                                <p className="text-blue-800 dark:text-blue-200 text-sm">
                                    按照以下步骤在 Google Cloud Platform 上创建 OAuth2 应用程序
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 dark:bg-blue-900 dark:text-blue-200">
                                            步骤 1
                                        </span>
                                        创建 Google Cloud Platform 项目
                                    </h4>
                                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>访问 Google Cloud Console</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open('https://console.cloud.google.com/', '_blank')}
                                                className="h-6 px-2 text-xs"
                                            >
                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                打开
                                            </Button>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>创建新项目并启用 Gmail API</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 dark:bg-blue-900 dark:text-blue-200">
                                            步骤 2
                                        </span>
                                        配置 OAuth2 同意屏幕
                                    </h4>
                                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>选择"外部"用户类型（推荐用于测试）</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>填写应用信息（应用名称、用户支持邮箱等）</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>添加授权域（如果是本地测试，可以添加 localhost）</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 dark:bg-blue-900 dark:text-blue-200">
                                            步骤 3
                                        </span>
                                        创建 OAuth2 凭据
                                    </h4>
                                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>选择"Web 应用程序"类型</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>配置重定向 URI：</span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-md dark:bg-gray-700">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">生产环境：</p>
                                            <div className="flex items-center space-x-2">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded dark:bg-gray-600">
                                                    https://yourdomain.com/api/oauth2/callback/gmail
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard('https://yourdomain.com/api/oauth2/callback/gmail', 'gmail-prod')}
                                                    className="h-6 w-6 p-0"
                                                >
                                                    {copiedText === 'gmail-prod' ? (
                                                        <Check className="h-3 w-3 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 mt-3">开发环境：</p>
                                            <div className="flex items-center space-x-2">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded dark:bg-gray-600">
                                                    http://localhost:8080/api/oauth2/callback/gmail
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard('http://localhost:8080/api/oauth2/callback/gmail', 'gmail-dev')}
                                                    className="h-6 w-6 p-0"
                                                >
                                                    {copiedText === 'gmail-dev' ? (
                                                        <Check className="h-3 w-3 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-red-200 rounded-lg p-4 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
                                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-3 flex items-center">
                                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 dark:bg-red-900 dark:text-red-200">
                                            重要步骤
                                        </span>
                                        添加测试用户（必需）
                                    </h4>
                                    <div className="space-y-3 text-sm text-red-800 dark:text-red-200">
                                        <p className="font-medium">
                                            ⚠️ 应用无需发布，也无需提交审核，但每个待使用的邮箱都必须添加为测试用户
                                        </p>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            <span>访问测试用户配置页面</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open('https://console.cloud.google.com/auth/audience', '_blank')}
                                                className="h-6 px-2 text-xs"
                                            >
                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                打开
                                            </Button>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            <span>在"测试用户"部分点击"添加用户"</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            <span>输入需要使用的 Gmail 邮箱地址</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            <span>最多可添加 100 个测试用户</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            <span className="font-medium">只有添加的测试用户才能使用 OAuth2 授权</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 dark:bg-green-900 dark:text-green-200">
                                            权限范围
                                        </span>
                                        Gmail 必需权限（自动配置）
                                    </h4>
                                    <div className="space-y-2">
                                        {gmailScopes.map((scope, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {scope}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(scope, `gmail-scope-${index}`)}
                                                    className="h-6 w-6 p-0"
                                                >
                                                    {copiedText === `gmail-scope-${index}` ? (
                                                        <Check className="h-3 w-3 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                        💡 这些权限范围已经预设且不可修改，确保 Gmail 邮件管理的最小必需权限。
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'outlook' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                    📮 Outlook OAuth2 配置
                                </h3>
                                <p className="text-blue-800 dark:text-blue-200 text-sm">
                                    按照以下步骤在 Microsoft Azure 上创建 OAuth2 应用程序
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 dark:bg-blue-900 dark:text-blue-200">
                                            步骤 1
                                        </span>
                                        创建 Azure AD 应用程序
                                    </h4>
                                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>访问 Azure Portal</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open('https://portal.azure.com/', '_blank')}
                                                className="h-6 px-2 text-xs"
                                            >
                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                打开
                                            </Button>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>搜索"Azure Active Directory"并进入应用注册</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>点击"新注册"创建应用程序</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 dark:bg-blue-900 dark:text-blue-200">
                                            步骤 2
                                        </span>
                                        配置应用程序信息
                                    </h4>
                                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>输入应用程序名称</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>选择受支持的账户类型（推荐：任何组织目录中的账户和个人 Microsoft 账户）</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>配置重定向 URI：</span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-md dark:bg-gray-700">
                                            <div className="flex items-center space-x-2">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded dark:bg-gray-600">
                                                    https://yourdomain.com/api/oauth2/callback/outlook
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard('https://yourdomain.com/api/oauth2/callback/outlook', 'outlook-uri')}
                                                    className="h-6 w-6 p-0"
                                                >
                                                    {copiedText === 'outlook-uri' ? (
                                                        <Check className="h-3 w-3 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 dark:bg-blue-900 dark:text-blue-200">
                                            步骤 3
                                        </span>
                                        配置 API 权限
                                    </h4>
                                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>选择"API 权限" {'>'} "添加权限" {'>'} "Microsoft Graph"</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>选择"委托权限"并添加以下权限：</span>
                                        </div>
                                        <div className="space-y-2 ml-4">
                                            {outlookScopes.map((scope, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {scope}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>点击"为 [租户] 授予管理员同意"</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2 dark:bg-blue-900 dark:text-blue-200">
                                            步骤 4
                                        </span>
                                        创建客户端密钥
                                    </h4>
                                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>选择"证书和密钥" {'>'} "新建客户端密钥"</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            <span>输入描述和过期时间</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                                ⚠️ 重要：立即复制密钥值（离开页面后无法再次查看）
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'faq' && (
                        <div className="space-y-6">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
                                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                                    ❓ 常见问题解答
                                </h3>
                                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                                    解答 OAuth2 配置过程中的常见问题
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                        Q1: 为什么需要配置 OAuth2？
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        OAuth2 是一种安全的授权协议，允许第三方应用程序访问用户的邮件账户，而无需存储用户的密码。这比传统的用户名/密码方式更安全。
                                    </p>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                        Q2: 重定向 URI 应该设置为什么？
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        重定向 URI 应该指向您的应用程序的回调端点：
                                    </p>
                                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                        <li>• Gmail：<code className="bg-gray-100 px-1 rounded dark:bg-gray-600">https://yourdomain.com/api/oauth2/callback/gmail</code></li>
                                        <li>• Outlook：<code className="bg-gray-100 px-1 rounded dark:bg-gray-600">https://yourdomain.com/api/oauth2/callback/outlook</code></li>
                                        <li>• 本地开发：将 <code className="bg-gray-100 px-1 rounded dark:bg-gray-600">yourdomain.com</code> 替换为 <code className="bg-gray-100 px-1 rounded dark:bg-gray-600">localhost:8080</code></li>
                                    </ul>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                        Q3: 如何测试 OAuth2 配置？
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        在 OAuth2 配置页面中，点击"测试连接"按钮。系统会打开一个新窗口进行授权，完成授权后检查是否能够成功获取邮件。
                                    </p>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                        Q4: 多个 Gmail 账户如何配置？
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        您可以创建多个 Gmail OAuth2 配置，每个配置可以使用不同的 GCP 项目。在添加邮件账户时，选择对应的 OAuth2 配置。
                                    </p>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                        Q5: 为什么我无法完成 Gmail 授权？
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        最常见的原因是没有将使用的邮箱添加为测试用户。请确保：
                                    </p>
                                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                        <li>• 在 Google Cloud Console 的"OAuth 同意屏幕"中添加了测试用户</li>
                                        <li>• 添加的邮箱地址与尝试授权的邮箱完全一致</li>
                                        <li>• 应用无需发布，保持"测试"状态即可</li>
                                        <li>• 测试用户最多可添加 100 个</li>
                                    </ul>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                        Q6: 权限范围可以自定义吗？
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <strong>Gmail</strong>：权限范围已经预设且不可修改，这是为了安全考虑。<br />
                                        <strong>Outlook</strong>：权限范围基于 Microsoft Graph API 的最佳实践。
                                    </p>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                        Q7: 如何处理 OAuth2 token 过期？
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        系统会自动使用 refresh token 刷新 access token，无需手动干预。
                                    </p>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
                                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2 flex items-center">
                                    <span className="mr-2">🔒</span>
                                    安全建议
                                </h4>
                                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                                    <li>• 妥善保管客户端密钥，定期轮换</li>
                                    <li>• 不要在客户端代码中暴露密钥</li>
                                    <li>• 只请求必要的权限</li>
                                    <li>• 为开发、测试和生产环境创建不同的 OAuth2 应用程序</li>
                                    <li>• 启用 OAuth2 访问日志和监控</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            💡 需要更多帮助？参考官方文档或联系技术支持
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open('https://developers.google.com/identity/protocols/oauth2', '_blank')}
                            >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Google 文档
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open('https://docs.microsoft.com/en-us/graph/', '_blank')}
                            >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Microsoft 文档
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}