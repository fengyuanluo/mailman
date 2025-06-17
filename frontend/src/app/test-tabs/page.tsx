'use client'

import { useState } from 'react'
import { TabManager } from '@/components/layout/tab-manager'

export default function TestTabsPage() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [openTabs, setOpenTabs] = useState<string[]>(['dashboard'])

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId)
        if (!openTabs.includes(tabId)) {
            setOpenTabs([...openTabs, tabId])
        }
    }

    const handleTabClose = (tabId: string) => {
        const newOpenTabs = openTabs.filter(id => id !== tabId)
        if (newOpenTabs.length === 0) {
            return
        }
        setOpenTabs(newOpenTabs)

        if (activeTab === tabId) {
            setActiveTab(newOpenTabs[newOpenTabs.length - 1])
        }
    }

    const handleTabOpen = (tabId: string) => {
        if (!openTabs.includes(tabId)) {
            setOpenTabs([...openTabs, tabId])
        }
        setActiveTab(tabId)
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Tab管理器测试页面</h1>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <TabManager
                        activeTab={activeTab}
                        openTabs={openTabs}
                        onTabChange={handleTabChange}
                        onTabClose={handleTabClose}
                        onTabOpen={handleTabOpen}
                    />

                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-2">当前激活的Tab: {activeTab}</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            打开的Tabs: {openTabs.join(', ')}
                        </p>

                        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded">
                            <p>这是 {activeTab} 的内容区域</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
