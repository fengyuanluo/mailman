'use client'

import { ReactNode, useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface MainLayoutProps {
    children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
    const [activeTab, setActiveTab] = useState('accounts')

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* 侧边栏 */}
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* 主内容区 */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* 顶部导航栏 */}
                <Header />

                {/* 页面内容 */}
                <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <div className="container mx-auto px-6 py-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
