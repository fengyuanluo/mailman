'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Save, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { emailAccountService } from '@/services/email-account.service'
import { oauth2Service } from '@/services/oauth2.service'
import { EmailAccount } from '@/types'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

interface EditAccountModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    onError?: (error: string) => void
    accountId: number | null
}

interface EditAccountForm {
    email: string
    authType: 'password' | 'oauth2' | 'app_password'
    password: string
    clientId: string
    accessToken: string
    refreshToken: string
    useProxy: boolean
    proxyUrl: string
    proxyUsername: string
    proxyPassword: string
    isDomainMail: boolean
    domain: string
}

export default function EditAccountModal({
    isOpen,
    onClose,
    onSuccess,
    onError,
    accountId
}: EditAccountModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingAccount, setLoadingAccount] = useState(false)
    const [fullAccount, setFullAccount] = useState<EmailAccount | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [gmailOAuth2Available, setGmailOAuth2Available] = useState(false)
    const modalRoot = typeof document !== 'undefined' ? document.body : null

    // 用于动画高度过渡的ref
    const contentRef = useRef<HTMLDivElement>(null)
    const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto')

    // 编辑表单
    const [form, setForm] = useState<EditAccountForm>({
        email: '',
        authType: 'password',
        password: '',
        clientId: '',
        accessToken: '',
        refreshToken: '',
        useProxy: false,
        proxyUrl: '',
        proxyUsername: '',
        proxyPassword: '',
        isDomainMail: false,
        domain: ''
    })

    // 处理模态框动画和body类
    useEffect(() => {
        if (isOpen && accountId) {
            setIsVisible(true)
            setTimeout(() => setIsAnimating(true), 10)
            loadFullAccount()
            // 添加类以锁定body滚动
            document.body.classList.add('modal-open')
        } else {
            setIsAnimating(false)
            setTimeout(() => {
                setIsVisible(false)
                setFullAccount(null)
            }, 300)
            // 移除类以恢复body滚动
            document.body.classList.remove('modal-open')
        }

        // 清理函数
        return () => {
            document.body.classList.remove('modal-open')
        }
    }, [isOpen, accountId])

    // 监听内容高度变化
    useEffect(() => {
        if (contentRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const { height } = entry.contentRect
                    setContentHeight(height)
                }
            })

            resizeObserver.observe(contentRef.current)

            return () => {
                resizeObserver.disconnect()
            }
        }
    }, [form.authType, form.useProxy, form.isDomainMail, loadingAccount])

    // 加载完整的账户信息
    const loadFullAccount = async () => {
        if (!accountId) return

        try {
            setLoadingAccount(true)
            const data = await emailAccountService.getAccount(accountId)
            setFullAccount(data)

            // 检查Gmail OAuth2是否已配置
            try {
                const isGmailConfigured = await oauth2Service.isProviderConfigured('gmail')
                setGmailOAuth2Available(isGmailConfigured)
            } catch (error) {
                console.error('Failed to check Gmail OAuth2 configuration:', error)
                setGmailOAuth2Available(false)
            }

            // 解析代理URL以获取用户名和密码
            let proxyUrl = data.proxy || ''
            let proxyUsername = ''
            let proxyPassword = ''

            if (proxyUrl) {
                try {
                    const url = new URL(proxyUrl)
                    proxyUsername = url.username || ''
                    proxyPassword = url.password || ''
                    // 移除认证信息，只保留基础URL
                    url.username = ''
                    url.password = ''
                    proxyUrl = url.toString()
                } catch (e) {
                    // 如果解析失败，使用原始值
                }
            }

            // 设置表单初始值
            setForm({
                email: data.emailAddress || '',
                authType: data.authType || 'password',
                password: data.password || '', // 显示密码
                clientId: data.customSettings?.client_id || '',
                accessToken: data.customSettings?.access_token || '', // 显示access token
                refreshToken: data.customSettings?.refresh_token || '', // 显示refresh token
                useProxy: !!data.proxy,
                proxyUrl: proxyUrl,
                proxyUsername: proxyUsername,
                proxyPassword: proxyPassword,
                isDomainMail: data.isDomainMail || false,
                domain: data.domain || ''
            })
        } catch (error) {
            console.error('Failed to load account details:', error)
            onError?.('加载账户详情失败')
        } finally {
            setLoadingAccount(false)
        }
    }

    // 提交更新
    const handleSubmit = async () => {
        if (!accountId || !fullAccount) return

        setLoading(true)
        try {
            const payload: any = {
                email_address: form.email,
                auth_type: form.authType,
                mail_provider_id: fullAccount.mailProviderId,
                is_domain_mail: form.isDomainMail,
                domain: form.isDomainMail ? form.domain : ''
            }

            // 密码更新
            if (form.authType === 'password' || form.authType === 'app_password') {
                payload.password = form.password
            }

            // OAuth2 认证信息
            if (form.authType === 'oauth2') {
                const customSettings: any = {}

                // 更新所有OAuth2字段
                customSettings.client_id = form.clientId
                customSettings.access_token = form.accessToken
                customSettings.refresh_token = form.refreshToken

                payload.custom_settings = customSettings
            }

            // 代理设置
            if (form.useProxy && form.proxyUrl) {
                payload.proxy = form.proxyUrl
                // 如果需要代理认证，构建完整的代理URL
                if (form.proxyUsername && form.proxyPassword) {
                    try {
                        const url = new URL(form.proxyUrl)
                        url.username = form.proxyUsername
                        url.password = form.proxyPassword
                        payload.proxy = url.toString()
                    } catch (e) {
                        // 如果URL解析失败，使用原始值
                        payload.proxy = form.proxyUrl
                    }
                }
            } else {
                payload.proxy = '' // 清空代理设置
            }

            await emailAccountService.updateAccount(accountId, payload)
            onSuccess?.()
            handleClose()
        } catch (error: any) {
            onError?.(error.message || '更新账户失败')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setIsAnimating(false)
        setTimeout(() => {
            // 重置表单
            setForm({
                email: '',
                authType: 'password',
                password: '',
                clientId: '',
                accessToken: '',
                refreshToken: '',
                useProxy: false,
                proxyUrl: '',
                proxyUsername: '',
                proxyPassword: '',
                isDomainMail: false,
                domain: ''
            })
            setFullAccount(null)
            setShowPassword(false) // 重置密码显示状态
            onClose()
        }, 300)
    }

    if (!isVisible || !accountId || !modalRoot) return null

    // 判断是否支持OAuth2
    const isOAuth2Provider = () => {
        if (fullAccount?.mailProvider?.type === 'outlook') {
            return true // Outlook 默认支持OAuth2
        }
        if (fullAccount?.mailProvider?.type === 'gmail') {
            // Gmail 需要检查系统是否已配置OAuth2
            return gmailOAuth2Available
        }
        return false
    }

    // 使用Portal渲染模态框到body
    return createPortal(
        <div className="modal-backdrop">
            <style jsx global>{`
                body.modal-open {
                    overflow: hidden;
                }
                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 50;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    background-color: ${isAnimating ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)'};
                    transition: background-color 0.3s ease;
                }
                .modal-content {
                    max-height: 90vh;
                    border-radius: 0.75rem;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    overflow: hidden;
                    transform: ${isAnimating ? 'scale(1)' : 'scale(0.95)'};
                    opacity: ${isAnimating ? '1' : '0'};
                    transition: all 0.3s ease;
                }
                .modal-body {
                    max-height: calc(90vh - 120px);
                    overflow-y: auto;
                    overscroll-behavior: contain;
                }
                .modal-body::-webkit-scrollbar {
                    width: 6px;
                }
                .modal-body::-webkit-scrollbar-track {
                    background: transparent;
                }
                .modal-body::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.5);
                    border-radius: 3px;
                }
            `}</style>
            <div
                className="modal-backdrop"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        handleClose();
                    }
                }}
            >
                <div className="modal-content w-full max-w-2xl bg-white dark:bg-gray-800">
                    {/* 标题栏 */}
                    <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            编辑邮箱账户
                        </h2>
                        <button
                            onClick={handleClose}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* 内容区域 - 添加高度过渡动画 */}
                    {/* 修改内容区域的样式和结构 */}
                    <div className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(90vh - 120px)' }}>
                        <div
                            ref={contentRef}
                            className="overflow-y-auto p-6 no-scrollbar"
                            style={{
                                maxHeight: 'calc(90vh - 180px)',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                            }}
                        >
                            {loadingAccount ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                                        <p className="text-gray-500 dark:text-gray-400">加载账户信息...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* 提供商信息（只读） */}
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            邮件提供商
                                        </label>
                                        <input
                                            type="text"
                                            value={fullAccount?.mailProvider?.name || '未知'}
                                            disabled
                                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                        />
                                    </div>

                                    {/* 邮箱地址 */}
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            邮箱地址
                                        </label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                            required
                                        />
                                    </div>

                                    {/* 验证方式 */}
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            验证方式
                                        </label>
                                        <div className="flex space-x-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    value="password"
                                                    checked={form.authType === 'password'}
                                                    onChange={(e) => setForm({ ...form, authType: 'password' })}
                                                    className="mr-2"
                                                    disabled={!isOAuth2Provider() && form.authType === 'oauth2'}
                                                />
                                                <span className="text-sm">密码</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    value="oauth2"
                                                    checked={form.authType === 'oauth2'}
                                                    onChange={(e) => setForm({ ...form, authType: 'oauth2' })}
                                                    className="mr-2"
                                                    disabled={!isOAuth2Provider()}
                                                />
                                                <span className={cn(
                                                    "text-sm",
                                                    !isOAuth2Provider() && "text-gray-400"
                                                )}>
                                                    OAuth2 {!isOAuth2Provider() && fullAccount?.mailProvider?.type === 'gmail' && "(需要先配置Gmail OAuth2)"}
                                                    {!isOAuth2Provider() && fullAccount?.mailProvider?.type !== 'gmail' && fullAccount?.mailProvider?.type !== 'outlook' && "(不支持OAuth2)"}
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 密码输入 */}
                                    {(form.authType === 'password' || form.authType === 'app_password') && (
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                密码
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={form.password}
                                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                    placeholder="输入密码"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                当前密码已加载，修改后将更新密码
                                            </p>
                                        </div>
                                    )}

                                    {/* OAuth2 输入 */}
                                    {form.authType === 'oauth2' && (
                                        <>
                                            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                                                <div className="flex items-start space-x-2">
                                                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                                        OAuth2 认证信息已加载，您可以直接修改
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Client ID
                                                </label>
                                                <input
                                                    type="text"
                                                    value={form.clientId}
                                                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                    placeholder="9e5f94bc-e8a4-4e73-b8be-63364c29d753"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Access Token
                                                </label>
                                                <textarea
                                                    value={form.accessToken}
                                                    onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                    placeholder="输入 Access Token"
                                                    rows={3}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Refresh Token
                                                </label>
                                                <textarea
                                                    value={form.refreshToken}
                                                    onChange={(e) => setForm({ ...form, refreshToken: e.target.value })}
                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                    placeholder="输入 Refresh Token"
                                                    rows={3}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* 域名邮箱设置 */}
                                    <div className="space-y-3">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={form.isDomainMail}
                                                onChange={(e) => setForm({ ...form, isDomainMail: e.target.checked })}
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                启用域名邮箱
                                            </span>
                                        </label>

                                        <AnimatePresence>
                                            {form.isDomainMail && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-3">
                                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            域名
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={form.domain}
                                                            onChange={(e) => setForm({ ...form, domain: e.target.value })}
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                            placeholder="example.com"
                                                            required
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* 代理设置 */}
                                    <div className="space-y-3">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={form.useProxy}
                                                onChange={(e) => setForm({ ...form, useProxy: e.target.checked })}
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                使用代理
                                            </span>
                                        </label>

                                        <AnimatePresence>
                                            {form.useProxy && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="space-y-3 pt-3">
                                                        <div>
                                                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                代理地址
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={form.proxyUrl}
                                                                onChange={(e) => setForm({ ...form, proxyUrl: e.target.value })}
                                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                                placeholder="socks5://127.0.0.1:1080"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                    代理用户名（可选）
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={form.proxyUsername}
                                                                    onChange={(e) => setForm({ ...form, proxyUsername: e.target.value })}
                                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                    代理密码（可选）
                                                                </label>
                                                                <input
                                                                    type="password"
                                                                    value={form.proxyPassword}
                                                                    onChange={(e) => setForm({ ...form, proxyPassword: e.target.value })}
                                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 底部操作栏 */}
                    <div className="flex items-center justify-end space-x-3 border-t border-gray-200 p-6 dark:border-gray-700">
                        <button
                            onClick={handleClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            disabled={loading}
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || loadingAccount || !form.email || (form.isDomainMail && !form.domain)}
                            className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    <span>保存中...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    <span>保存更改</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        , modalRoot)
}
