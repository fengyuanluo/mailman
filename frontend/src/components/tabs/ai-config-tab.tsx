'use client'

import { useState } from 'react'
import { OpenAIConfigTab } from './openai-config-tab'
import { AIPromptTemplateTab } from './ai-prompt-template-tab'

export function AIConfigTab() {
    const [activeSubTab, setActiveSubTab] = useState<'openai' | 'prompts'>('openai')

    return (
        <div className="h-full flex flex-col">
            {/* 子标签导航 */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveSubTab('openai')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeSubTab === 'openai'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                            }
                        `}
                    >
                        OpenAI 配置
                    </button>
                    <button
                        onClick={() => setActiveSubTab('prompts')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeSubTab === 'prompts'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                            }
                        `}
                    >
                        提示模板
                    </button>
                </nav>
            </div>

            {/* 子标签内容 */}
            <div className="flex-1 overflow-auto">
                {activeSubTab === 'openai' && <OpenAIConfigTab />}
                {activeSubTab === 'prompts' && <AIPromptTemplateTab />}
            </div>
        </div>
    )
}
