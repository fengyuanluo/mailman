'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { OAuth2GlobalConfig } from '@/types'
import { oauth2Service } from '@/services/oauth2.service'

interface OAuth2AuthPageProps {
    provider: string
    onComplete?: (accessToken: string, refreshToken: string) => void
    onCancel?: () => void
}

export default function OAuth2AuthPage({ provider, onComplete, onCancel }: OAuth2AuthPageProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [config, setConfig] = useState<OAuth2GlobalConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [authStatus, setAuthStatus] = useState<'idle' | 'authorizing' | 'processing' | 'success' | 'error'>('idle')
    const [authUrl, setAuthUrl] = useState<string | null>(null)

    // 检查是否为OAuth2回调
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    useEffect(() => {
        loadConfig()
    }, [provider])

    useEffect(() => {
        // 处理OAuth2回调
        if (code && state) {
            handleOAuth2Callback(code, state)
        } else if (errorParam) {
            setError(`授权失败: ${errorParam}`)
            setAuthStatus('error')
        }
    }, [code, state, errorParam])

    const loadConfig = async () => {
        try {
            setLoading(true)
            const configs = await oauth2Service.getConfigs()
            const providerConfig = configs.find(c => c.provider_type === provider)

            if (!providerConfig) {
                setError(`未找到 ${provider} 的OAuth2配置`)
                return
            }

            setConfig(providerConfig)
        } catch (err) {
            setError('加载OAuth2配置失败')
            console.error('Load config error:', err)
        } finally {
            setLoading(false)
        }
    }

    const startAuthorization = async () => {
        if (!config) return

        try {
            setAuthStatus('authorizing')

            // 生成状态参数
            const stateParam = Math.random().toString(36).substring(2, 15)
            localStorage.setItem('oauth2_state', stateParam)

            // 构建授权URL
            const params = new URLSearchParams({
                client_id: config.client_id,
                redirect_uri: config.redirect_uri,
                response_type: 'code',
                scope: config.scopes.join(' '),
                state: stateParam,
                access_type: 'offline',
                prompt: 'consent'
            })

            // OAuth2 认证URL需要根据提供商类型构建
            const authUrl = provider === 'gmail'
                ? `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
                : `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
            setAuthUrl(authUrl)

            // 重定向到授权页面
            window.location.href = authUrl

        } catch (err) {
            setError('启动授权流程失败')
            setAuthStatus('error')
            console.error('Authorization error:', err)
        }
    }

    const handleOAuth2Callback = async (code: string, state: string) => {
        try {
            setAuthStatus('processing')

            // 验证状态参数
            const savedState = localStorage.getItem('oauth2_state')
            if (state !== savedState) {
                throw new Error('无效的状态参数')
            }

            // 清除状态参数
            localStorage.removeItem('oauth2_state')

            if (!config) {
                throw new Error('OAuth2配置不存在')
            }

            // 交换访问令牌
            // OAuth2 token URL需要根据提供商类型构建
            const tokenUrl = provider === 'gmail'
                ? 'https://oauth2.googleapis.com/token'
                : 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

            const tokenResponse = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: config.client_id,
                    client_secret: config.client_secret,
                    redirect_uri: config.redirect_uri,
                    code: code,
                }),
            })

            if (!tokenResponse.ok) {
                throw new Error('令牌交换失败')
            }

            const tokenData = await tokenResponse.json()

            if (!tokenData.access_token) {
                throw new Error('未获取到访问令牌')
            }

            setAuthStatus('success')

            // 回调完成处理
            if (onComplete) {
                onComplete(tokenData.access_token, tokenData.refresh_token)
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : '授权处理失败')
            setAuthStatus('error')
            console.error('OAuth2 callback error:', err)
        }
    }

    const handleCancel = () => {
        if (onCancel) {
            onCancel()
        } else {
            router.back()
        }
    }

    const getProviderDisplayName = (provider: string) => {
        switch (provider.toLowerCase()) {
            case 'gmail':
                return 'Gmail'
            case 'outlook':
                return 'Outlook'
            default:
                return provider
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        授权失败
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-700">{error}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <Button onClick={handleCancel} variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            返回
                        </Button>
                        <Button onClick={loadConfig}>重试</Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {authStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {authStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                    {authStatus === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
                    {getProviderDisplayName(provider)} OAuth2 授权
                </CardTitle>
                <CardDescription>
                    {authStatus === 'idle' && `为 ${getProviderDisplayName(provider)} 邮箱账户授权访问权限`}
                    {authStatus === 'authorizing' && '正在跳转到授权页面...'}
                    {authStatus === 'processing' && '正在处理授权结果...'}
                    {authStatus === 'success' && '授权成功！'}
                    {authStatus === 'error' && '授权失败'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {authStatus === 'idle' && (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-600">
                            <p>您将被重定向到 {getProviderDisplayName(provider)} 的授权页面完成以下步骤：</p>
                            <ul className="mt-2 ml-4 list-disc space-y-1">
                                <li>登录您的 {getProviderDisplayName(provider)} 账户</li>
                                <li>授权邮件管理系统访问您的邮箱</li>
                                <li>系统将自动获取访问令牌</li>
                            </ul>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={startAuthorization} className="flex items-center gap-2">
                                <ExternalLink className="h-4 w-4" />
                                开始授权
                            </Button>
                            <Button onClick={handleCancel} variant="outline">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                取消
                            </Button>
                        </div>
                    </div>
                )}

                {authStatus === 'authorizing' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>正在跳转到授权页面...</span>
                        </div>
                        {authUrl && (
                            <div className="text-sm text-gray-600">
                                <p>如果没有自动跳转，请手动点击以下链接：</p>
                                <a
                                    href={authUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    {authUrl}
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {authStatus === 'processing' && (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>正在处理授权结果...</span>
                    </div>
                )}

                {authStatus === 'success' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <p className="text-green-700">
                                OAuth2授权成功！您现在可以使用此账户创建邮箱连接。
                            </p>
                        </div>
                        <Button onClick={handleCancel}>
                            继续
                        </Button>
                    </div>
                )}

                {authStatus === 'error' && error && (
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <p className="text-red-700">{error}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={startAuthorization}>重试</Button>
                            <Button onClick={handleCancel} variant="outline">
                                取消
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}