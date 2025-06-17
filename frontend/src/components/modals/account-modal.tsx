'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { EmailAccount } from '@/types'
import { emailAccountService } from '@/services/email-account.service'

interface AccountModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    account?: EmailAccount | null
}

export default function AccountModal({ isOpen, onClose, onSuccess, account }: AccountModalProps) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        app_password: '',
        auth_type: 'password' as 'password' | 'oauth2' | 'app_password',
        provider: 'gmail',
        use_proxy: false,
        proxy_url: '',
        proxy_username: '',
        proxy_password: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (account) {
            setFormData({
                email: account.emailAddress,
                password: '',
                app_password: '',
                auth_type: account.authType || 'password',
                provider: account.mailProvider?.name || 'gmail',
                use_proxy: !!account.proxy,
                proxy_url: account.proxy || '',
                proxy_username: '',
                proxy_password: ''
            })
        } else {
            // 重置表单
            setFormData({
                email: '',
                password: '',
                app_password: '',
                auth_type: 'password',
                provider: 'gmail',
                use_proxy: false,
                proxy_url: '',
                proxy_username: '',
                proxy_password: ''
            })
        }
        setError('')
    }, [account, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const payload: any = {
                email_address: formData.email,
                auth_type: formData.auth_type,
                provider: formData.provider,
                use_proxy: formData.use_proxy
            }

            // 根据认证类型设置密码
            if (formData.auth_type === 'app_password') {
                payload.app_password = formData.app_password
            } else if (formData.auth_type === 'password') {
                payload.password = formData.password
            }

            // 如果使用代理，添加代理信息
            if (formData.use_proxy) {
                payload.proxy_url = formData.proxy_url
                payload.proxy_username = formData.proxy_username
                payload.proxy_password = formData.proxy_password
            }

            if (account) {
                // 更新账户
                await emailAccountService.updateAccount(account.id, payload)
            } else {
                // 创建账户
                await emailAccountService.createAccount(payload)
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || '操作失败，请重试')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
                {/* 标题栏 */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {account ? '编辑邮箱账户' : '添加邮箱账户'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 邮箱地址 */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            邮箱地址
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                            required
                            disabled={!!account}
                        />
                    </div>

                    {/* 邮箱提供商 */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            邮箱提供商
                        </label>
                        <select
                            value={formData.provider}
                            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        >
                            <option value="gmail">Gmail</option>
                            <option value="outlook">Outlook</option>
                            <option value="yahoo">Yahoo</option>
                            <option value="other">其他</option>
                        </select>
                    </div>

                    {/* 认证方式 */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            认证方式
                        </label>
                        <select
                            value={formData.auth_type}
                            onChange={(e) => setFormData({ ...formData, auth_type: e.target.value as any })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        >
                            <option value="password">密码</option>
                            <option value="app_password">应用专用密码</option>
                            <option value="oauth2">OAuth2</option>
                        </select>
                    </div>

                    {/* 密码输入 */}
                    {formData.auth_type === 'password' && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                密码
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                required={!account}
                                placeholder={account ? '留空表示不修改' : ''}
                            />
                        </div>
                    )}

                    {/* 应用专用密码输入 */}
                    {formData.auth_type === 'app_password' && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                应用专用密码
                            </label>
                            <input
                                type="password"
                                value={formData.app_password}
                                onChange={(e) => setFormData({ ...formData, app_password: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                required={!account}
                                placeholder={account ? '留空表示不修改' : ''}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                请在邮箱设置中生成应用专用密码
                            </p>
                        </div>
                    )}

                    {/* OAuth2 提示 */}
                    {formData.auth_type === 'oauth2' && (
                        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            OAuth2 认证将在保存后自动跳转到授权页面
                        </div>
                    )}

                    {/* 代理设置 */}
                    <div>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.use_proxy}
                                onChange={(e) => setFormData({ ...formData, use_proxy: e.target.checked })}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                使用代理
                            </span>
                        </label>
                    </div>

                    {/* 代理详细设置 */}
                    {formData.use_proxy && (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    代理地址
                                </label>
                                <input
                                    type="text"
                                    value={formData.proxy_url}
                                    onChange={(e) => setFormData({ ...formData, proxy_url: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    placeholder="socks5://127.0.0.1:1080"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    代理用户名（可选）
                                </label>
                                <input
                                    type="text"
                                    value={formData.proxy_username}
                                    onChange={(e) => setFormData({ ...formData, proxy_username: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    代理密码（可选）
                                </label>
                                <input
                                    type="password"
                                    value={formData.proxy_password}
                                    onChange={(e) => setFormData({ ...formData, proxy_password: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                        </>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            disabled={loading}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? '处理中...' : account ? '保存' : '添加'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
