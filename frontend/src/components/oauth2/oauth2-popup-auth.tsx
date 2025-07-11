'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ExternalLink, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { oauth2Service } from '@/services/oauth2.service'
import { OAuth2ProviderType } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface OAuth2PopupAuthProps {
    provider: OAuth2ProviderType
    configId?: number
    onSuccess: (result: { emailAddress: string; customSettings: any }) => void
    onCancel: () => void
    onError: (error: string) => void
}

interface AuthSession {
    sessionId: number
    state: string
    authUrl: string
    expiresAt: number
}

export default function OAuth2PopupAuth({ provider, configId, onSuccess, onCancel, onError }: OAuth2PopupAuthProps) {
    const [session, setSession] = useState<AuthSession | null>(null)
    const [status, setStatus] = useState<'initializing' | 'waiting' | 'success' | 'failed' | 'expired' | 'cancelled'>('initializing')
    const [errorMessage, setErrorMessage] = useState<string>('')
    const [timeRemaining, setTimeRemaining] = useState<number>(0)

    const popupRef = useRef<Window | null>(null)
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const popupCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const authStartedRef = useRef<boolean>(false)

    // 启动OAuth2授权会话
    const startAuthSession = async () => {
        try {
            setStatus('initializing')
            const authSession = await oauth2Service.startAuthSession(provider, configId)
            setSession(authSession)
            setTimeRemaining(Math.max(0, authSession.expiresAt - Math.floor(Date.now() / 1000)))

            // 打开popup窗口
            openPopup(authSession.authUrl)

            // 开始轮询状态
            startPolling(authSession.state)

            // 开始倒计时
            startCountdown()

            setStatus('waiting')
        } catch (error) {
            console.error('Failed to start auth session:', error)
            setErrorMessage('启动授权会话失败')
            setStatus('failed')
            onError('启动授权会话失败')
        }
    }

    // 打开popup窗口
    const openPopup = (authUrl: string) => {
        const popup = window.open(
            authUrl,
            'oauth2-auth',
            'width=500,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
        )

        if (popup) {
            popupRef.current = popup

            // 监听popup窗口关闭
            popupCheckIntervalRef.current = setInterval(() => {
                try {
                    if (popup.closed) {
                        clearInterval(popupCheckIntervalRef.current!)
                        popupCheckIntervalRef.current = null
                        // 只有在等待状态时才认为是用户取消
                        if (status === 'waiting') {
                            handleCancel()
                        }
                    }
                } catch (error) {
                    // 忽略跨域策略错误 (Cross-Origin-Opener-Policy)
                    // 这种情况下依靠轮询机制检测授权结果
                }
            }, 1000)
        } else {
            setErrorMessage('无法打开授权窗口，请检查浏览器弹窗设置')
            setStatus('failed')
            onError('无法打开授权窗口')
        }
    }

    // 开始轮询状态
    const startPolling = (state: string) => {
        const poll = async () => {
            try {
                const result = await oauth2Service.pollAuthSessionStatus(state)

                switch (result.status) {
                    case 'success':
                        console.log('OAuth2PopupAuth: 检测到success状态', result)
                        setStatus('success')
                        stopPolling()
                        if (result.emailAddress && result.customSettings) {
                            console.log('OAuth2PopupAuth: 准备调用onSuccess回调', {
                                emailAddress: result.emailAddress,
                                customSettings: result.customSettings
                            })
                            onSuccess({
                                emailAddress: result.emailAddress,
                                customSettings: result.customSettings
                            })
                        } else {
                            console.log('OAuth2PopupAuth: 授权成功但数据不完整', result)
                            setErrorMessage('授权成功但未获取到账户信息')
                            setStatus('failed')
                            onError('授权成功但未获取到账户信息')
                        }
                        // 延迟3秒关闭popup窗口
                        setTimeout(() => closePopup(), 3000)
                        break

                    case 'failed':
                        setStatus('failed')
                        setErrorMessage(result.errorMsg || '授权失败')
                        stopPolling()
                        onError(result.errorMsg || '授权失败')
                        // 延迟3秒关闭popup窗口
                        setTimeout(() => closePopup(), 3000)
                        break

                    case 'expired':
                        setStatus('expired')
                        setErrorMessage('授权会话已过期')
                        stopPolling()
                        onError('授权会话已过期')
                        // 延迟3秒关闭popup窗口
                        setTimeout(() => closePopup(), 3000)
                        break

                    case 'cancelled':
                        setStatus('cancelled')
                        stopPolling()
                        closePopup()
                        onCancel()
                        break

                    case 'pending':
                        // 继续轮询
                        break

                    default:
                        console.warn('Unknown status:', result.status)
                }
            } catch (error) {
                console.error('Polling error:', error)
            }
        }

        // 立即执行一次
        poll()

        // 每2秒轮询一次
        pollIntervalRef.current = setInterval(poll, 2000)
    }

    // 开始倒计时
    const startCountdown = () => {
        timeIntervalRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                const newTime = prev - 1
                if (newTime <= 0) {
                    setStatus('expired')
                    setErrorMessage('授权会话已过期')
                    stopPolling()
                    closePopup()
                    onError('授权会话已过期')
                }
                return Math.max(0, newTime)
            })
        }, 1000)
    }

    // 停止轮询
    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
        }
        if (timeIntervalRef.current) {
            clearInterval(timeIntervalRef.current)
            timeIntervalRef.current = null
        }
        if (popupCheckIntervalRef.current) {
            clearInterval(popupCheckIntervalRef.current)
            popupCheckIntervalRef.current = null
        }
    }

    // 关闭popup窗口
    const closePopup = () => {
        if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close()
        }
    }

    // 处理取消
    const handleCancel = async () => {
        if (session) {
            try {
                await oauth2Service.cancelAuthSession(session.state)
            } catch (error) {
                console.error('Failed to cancel session:', error)
            }
        }

        setStatus('cancelled')
        stopPolling()
        closePopup()
        onCancel()
    }

    // 重试
    const handleRetry = () => {
        stopPolling()
        closePopup()
        setSession(null)
        setErrorMessage('')
        setTimeRemaining(0)
        startAuthSession()
    }

    // 格式化时间
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    // 获取状态显示
    const getStatusDisplay = () => {
        switch (status) {
            case 'initializing':
                return {
                    icon: <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />,
                    title: '正在初始化...',
                    message: '正在准备OAuth2授权',
                    color: 'text-blue-600'
                }

            case 'waiting':
                return {
                    icon: <Clock className="w-6 h-6 text-orange-500" />,
                    title: '等待授权',
                    message: '请在弹出窗口中完成授权，并保持此窗口开启',
                    color: 'text-orange-600'
                }

            case 'success':
                return {
                    icon: <CheckCircle className="w-6 h-6 text-green-500" />,
                    title: '授权成功',
                    message: '正在获取账户信息...',
                    color: 'text-green-600'
                }

            case 'failed':
            case 'expired':
                return {
                    icon: <XCircle className="w-6 h-6 text-red-500" />,
                    title: status === 'expired' ? '授权超时' : '授权失败',
                    message: errorMessage,
                    color: 'text-red-600'
                }

            case 'cancelled':
                return {
                    icon: <XCircle className="w-6 h-6 text-gray-500" />,
                    title: '授权已取消',
                    message: '用户取消了授权操作',
                    color: 'text-gray-600'
                }

            default:
                return {
                    icon: <RefreshCw className="w-6 h-6 text-gray-500" />,
                    title: '未知状态',
                    message: '',
                    color: 'text-gray-600'
                }
        }
    }

    // 组件挂载时启动授权
    useEffect(() => {
        // 防止重复启动授权会话
        if (!authStartedRef.current) {
            authStartedRef.current = true
            startAuthSession()
        }

        // 清理函数
        return () => {
            stopPolling()
            closePopup()
        }
    }, [])

    const statusDisplay = getStatusDisplay()
    const providerName = oauth2Service.getProviderDisplayName(provider)

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <motion.div
                    className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md dark:bg-gray-800"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    {/* 标题栏 */}
                    <div className="flex items-center justify-between mb-4">
                        <motion.h3
                            className="text-lg font-semibold text-gray-900 dark:text-white"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            {providerName} OAuth2 授权
                        </motion.h3>
                        <motion.button
                            onClick={handleCancel}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>

                    {/* 状态显示 */}
                    <motion.div
                        className="text-center mb-6"
                        key={status}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.div
                            className="flex justify-center mb-3"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.3 }}
                        >
                            {statusDisplay.icon}
                        </motion.div>
                        <motion.h4
                            className={`text-lg font-medium mb-2 ${statusDisplay.color}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            {statusDisplay.title}
                        </motion.h4>
                        <motion.p
                            className="text-gray-600 dark:text-gray-300 text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            {statusDisplay.message}
                        </motion.p>

                        {/* 倒计时 */}
                        <AnimatePresence>
                            {status === 'waiting' && timeRemaining > 0 && (
                                <motion.div
                                    className="mt-3 text-sm text-gray-500 dark:text-gray-400"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    剩余时间: {formatTime(timeRemaining)}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* 操作按钮 */}
                    <motion.div
                        className="flex space-x-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <AnimatePresence mode="wait">
                            {status === 'waiting' && session && (
                                <motion.button
                                    onClick={() => openPopup(session.authUrl)}
                                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>重新打开授权窗口</span>
                                </motion.button>
                            )}

                            {(status === 'failed' || status === 'expired') && (
                                <motion.button
                                    onClick={handleRetry}
                                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>重试</span>
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <motion.button
                            onClick={handleCancel}
                            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            取消
                        </motion.button>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}