'use client'

import { useState } from 'react'
import { Shuffle, Clock, BarChart3, Copy, CheckCircle } from 'lucide-react'
import { emailService } from '@/services/email.service'

export default function EmailToolsPage() {
    const [activeTab, setActiveTab] = useState<'random' | 'wait' | 'stats'>('random')
    const [randomEmail, setRandomEmail] = useState<any>(null)
    const [waitConfig, setWaitConfig] = useState({
        accountId: '',
        email: '',
        timeout: 30,
        interval: 5
    })
    const [waiting, setWaiting] = useState(false)
    const [waitResult, setWaitResult] = useState<any>(null)
    const [copied, setCopied] = useState(false)

    const handleGenerateRandom = async (options: { alias?: boolean; domain?: boolean }) => {
        try {
            const response = await emailService.getRandomEmail(options)
            setRandomEmail(response)
        } catch (error) {
            console.error('Failed to generate random email:', error)
        }
    }

    const handleWaitForEmail = async () => {
        setWaiting(true)
        setWaitResult(null)
        try {
            const response = await emailService.waitForEmail({
                ...waitConfig,
                accountId: waitConfig.accountId ? parseInt(waitConfig.accountId) : undefined
            })
            setWaitResult(response)
        } catch (error) {
            console.error('Wait for email failed:', error)
        } finally {
            setWaiting(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="h-full bg-gray-50 p-6 dark:bg-gray-900">
            <div className="mx-auto max-w-6xl">
                <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
                    邮件工具集
                </h2>

                {/* 标签页导航 */}
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('random')}
                            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${activeTab === 'random'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <div className="flex items-center space-x-2">
                                <Shuffle className="h-4 w-4" />
                                <span>随机邮件生成器</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('wait')}
                            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${activeTab === 'wait'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>邮件等待监控</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${activeTab === 'stats'
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <div className="flex items-center space-x-2">
                                <BarChart3 className="h-4 w-4" />
                                <span>邮件统计分析</span>
                            </div>
                        </button>
                    </nav>
                </div>

                {/* 内容区 */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    {/* 随机邮件生成器 */}
                    {activeTab === 'random' && (
                        <div>
                            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                                随机邮件账户生成器
                            </h3>
                            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                                从现有账户中随机选择一个邮件账户，支持生成Gmail别名和域名邮箱。
                            </p>

                            <div className="mb-6 flex space-x-4">
                                <button
                                    onClick={() => handleGenerateRandom({})}
                                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                                >
                                    生成随机账户
                                </button>
                                <button
                                    onClick={() => handleGenerateRandom({ alias: true })}
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                    生成Gmail别名
                                </button>
                                <button
                                    onClick={() => handleGenerateRandom({ domain: true })}
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                    生成域名邮箱
                                </button>
                            </div>

                            {randomEmail && (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                            生成的邮件账户
                                        </h4>
                                        <button
                                            onClick={() => copyToClipboard(randomEmail.email)}
                                            className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                                        >
                                            {copied ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span>已复制</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4" />
                                                    <span>复制</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400">邮箱地址: </span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {randomEmail.email}
                                            </span>
                                        </div>
                                        {randomEmail.originalEmail && (
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">原始邮箱: </span>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {randomEmail.originalEmail}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400">类型: </span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {randomEmail.isAlias ? 'Gmail别名' :
                                                    randomEmail.isDomain ? '域名邮箱' : '普通邮箱'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 邮件等待监控 */}
                    {activeTab === 'wait' && (
                        <div>
                            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                                邮件等待监控器
                            </h3>
                            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                                等待特定账户或邮箱地址收到新邮件，支持超时和间隔检查。
                            </p>

                            <div className="mb-6 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        账户ID（可选）
                                    </label>
                                    <input
                                        type="text"
                                        value={waitConfig.accountId}
                                        onChange={(e) => setWaitConfig({ ...waitConfig, accountId: e.target.value })}
                                        placeholder="输入账户ID"
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        邮箱地址（可选）
                                    </label>
                                    <input
                                        type="email"
                                        value={waitConfig.email}
                                        onChange={(e) => setWaitConfig({ ...waitConfig, email: e.target.value })}
                                        placeholder="输入邮箱地址"
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        超时时间（秒）
                                    </label>
                                    <input
                                        type="number"
                                        value={waitConfig.timeout}
                                        onChange={(e) => setWaitConfig({ ...waitConfig, timeout: parseInt(e.target.value) })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        检查间隔（秒）
                                    </label>
                                    <input
                                        type="number"
                                        value={waitConfig.interval}
                                        onChange={(e) => setWaitConfig({ ...waitConfig, interval: parseInt(e.target.value) })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleWaitForEmail}
                                disabled={waiting || (!waitConfig.accountId && !waitConfig.email)}
                                className="mb-6 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:bg-gray-400"
                            >
                                {waiting ? '等待中...' : '开始监控'}
                            </button>

                            {waitResult && (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                                    <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                                        监控结果
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400">状态: </span>
                                            <span className={`font-medium ${waitResult.found ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                                                }`}>
                                                {waitResult.found ? '收到新邮件' : '超时未收到邮件'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400">检查次数: </span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {waitResult.checksPerformed}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400">耗时: </span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {waitResult.elapsedTime}秒
                                            </span>
                                        </div>
                                        {waitResult.email && (
                                            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {waitResult.email.subject || '(无主题)'}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    来自: {waitResult.email.from}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 邮件统计分析 */}
                    {activeTab === 'stats' && (
                        <div>
                            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                                邮件统计分析
                            </h3>
                            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                                查看邮件账户的统计信息和使用情况分析。
                            </p>
                            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                <p className="text-gray-500 dark:text-gray-400">
                                    统计功能开发中...
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}