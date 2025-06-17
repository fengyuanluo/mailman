'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OAuth2SuccessPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')

    useEffect(() => {
        // 从查询参数获取token信息
        const provider = searchParams.get('provider')
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const expiresAt = searchParams.get('expires_at')

        if (!provider || !accessToken || !refreshToken) {
            setStatus('error')
            setMessage('授权信息不完整，请重新授权')
            return
        }

        // 存储token信息到sessionStorage
        const tokenData = {
            provider,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: parseInt(expiresAt || '0')
        }

        try {
            sessionStorage.setItem('oauth2_tokens', JSON.stringify(tokenData))

            // 获取返回路径
            const returnPath = sessionStorage.getItem('oauth2_return_path') || '/'

            setStatus('success')
            setMessage(`${provider === 'gmail' ? 'Gmail' : 'Outlook'} 授权成功！`)

            // 3秒后自动返回
            setTimeout(() => {
                // 清理临时数据
                sessionStorage.removeItem('oauth2_return_path')
                sessionStorage.removeItem('oauth2_provider')

                // 返回原页面
                router.push(returnPath)
            }, 3000)

        } catch (error) {
            console.error('Failed to store OAuth2 tokens:', error)
            setStatus('error')
            setMessage('存储授权信息失败')
        }
    }, [searchParams, router])

    const handleReturnNow = () => {
        const returnPath = sessionStorage.getItem('oauth2_return_path') || '/'
        sessionStorage.removeItem('oauth2_return_path')
        sessionStorage.removeItem('oauth2_provider')
        router.push(returnPath)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full mx-auto p-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                处理授权信息...
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300">
                                请稍候，正在处理您的授权信息
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                授权成功！
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {message}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                3秒后自动返回，或点击下方按钮立即返回
                            </p>
                            <Button onClick={handleReturnNow} className="w-full">
                                立即返回
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                授权失败
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {message}
                            </p>
                            <Button onClick={handleReturnNow} variant="outline" className="w-full">
                                返回重试
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}