'use client'

import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <div className="relative">
                    <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-800">404</h1>
                    <p className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-gray-900 dark:text-white">
                        页面未找到
                    </p>
                </div>

                <p className="mt-4 text-gray-600 dark:text-gray-400">
                    抱歉，您访问的页面不存在或已被移除
                </p>

                <div className="mt-8 flex items-center justify-center space-x-4">
                    <Link
                        href="/"
                        className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
                    >
                        <Home className="h-4 w-4" />
                        <span>返回首页</span>
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>返回上一页</span>
                    </button>
                </div>
            </div>
        </div>
    )
}