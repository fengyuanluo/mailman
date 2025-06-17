'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // 记录错误到错误报告服务
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>

                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                    出错了
                </h2>

                <p className="mb-8 max-w-md text-gray-600 dark:text-gray-400">
                    抱歉，我们遇到了一个意外错误。请尝试刷新页面或稍后再试。
                </p>

                <button
                    onClick={reset}
                    className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-6 py-3 text-white transition-colors hover:bg-primary-700"
                >
                    <RefreshCw className="h-5 w-5" />
                    <span>重试</span>
                </button>

                {process.env.NODE_ENV === 'development' && (
                    <details className="mt-8 max-w-2xl text-left">
                        <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">
                            错误详情（仅开发环境可见）
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-lg bg-gray-100 p-4 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {error.message}
                            {error.stack}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    )
}