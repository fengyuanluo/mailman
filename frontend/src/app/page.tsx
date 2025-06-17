'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'

export default function HomePage() {
    const router = useRouter()

    useEffect(() => {
        // 重定向到主页面
        const timer = setTimeout(() => {
            router.push('/main')
        }, 1000)

        return () => clearTimeout(timer)
    }, [router])

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
            <div className="text-center">
                {/* Logo动画 */}
                <div className="relative mb-8 inline-flex">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary-400 opacity-20"></div>
                    <div className="relative rounded-full bg-white p-6 shadow-xl dark:bg-gray-800">
                        <Mail className="h-12 w-12 text-primary-600 dark:text-primary-400" />
                    </div>
                </div>

                {/* 加载文字 */}
                <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
                    邮箱管理系统
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    正在加载，请稍候...
                </p>

                {/* 加载进度条 */}
                <div className="mx-auto mt-8 h-1 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full animate-[loading_1s_ease-in-out_infinite] bg-gradient-to-r from-primary-500 to-primary-600"></div>
                </div>
            </div>

            <style jsx>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
        </div>
    )
}