'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Folder } from 'lucide-react'
import { emailAccountService } from '@/services/email-account.service'
import { EmailAccount } from '@/types'
import { formatDate } from '@/lib/utils'

interface SyncRecord {
    id: number
    accountId: number
    mailboxName: string
    lastSyncStartTime: string
    lastSyncEndTime: string
    emailsProcessed: number
}

export default function EmailSyncPage() {
    const [accounts, setAccounts] = useState<EmailAccount[]>([])
    const [syncRecords, setSyncRecords] = useState<{ [key: number]: SyncRecord[] }>({})
    const [syncing, setSyncing] = useState<{ [key: number]: boolean }>({})
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
    const [syncOptions, setSyncOptions] = useState({
        syncMode: 'incremental' as 'incremental' | 'full',
        mailboxes: ['INBOX'],
        maxEmailsPerMailbox: 1000,
        includeBody: true
    })

    useEffect(() => {
        loadAccounts()
    }, [])

    const loadAccounts = async () => {
        try {
            const data = await emailAccountService.getAccounts()
            setAccounts(data)
            // 加载每个账户的同步记录
            data.forEach(account => {
                loadSyncRecords(account.id)
            })
        } catch (error) {
            console.error('Failed to load accounts:', error)
        }
    }

    const loadSyncRecords = async (accountId: number) => {
        try {
            // 这里需要调用获取同步记录的API
            // const records = await emailAccountService.getSyncRecords(accountId)
            // setSyncRecords(prev => ({ ...prev, [accountId]: records }))
        } catch (error) {
            console.error('Failed to load sync records:', error)
        }
    }

    const handleSync = async (accountId: number) => {
        setSyncing(prev => ({ ...prev, [accountId]: true }))
        try {
            await emailAccountService.syncAccount(accountId, syncOptions)
            // 重新加载同步记录
            await loadSyncRecords(accountId)
        } catch (error) {
            console.error('Sync failed:', error)
        } finally {
            setSyncing(prev => ({ ...prev, [accountId]: false }))
        }
    }

    const handleDeleteSyncRecord = async (accountId: number, mailbox: string) => {
        try {
            // 调用删除同步记录的API
            // await emailAccountService.deleteSyncRecord(accountId, mailbox)
            await loadSyncRecords(accountId)
        } catch (error) {
            console.error('Failed to delete sync record:', error)
        }
    }

    return (
        <div className="flex h-full">
            {/* 账户列表 */}
            <div className="w-96 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        邮件同步管理
                    </h2>
                </div>
                <div className="overflow-y-auto">
                    {accounts.map((account) => (
                        <div
                            key={account.id}
                            onClick={() => setSelectedAccount(account.id)}
                            className={`cursor-pointer border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 ${selectedAccount === account.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                        {account.emailAddress}
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        上次同步: {account.lastSync ? formatDate(account.lastSync) : '从未同步'}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleSync(account.id)
                                    }}
                                    disabled={syncing[account.id]}
                                    className="rounded-lg p-2 text-primary-600 transition-colors hover:bg-primary-100 disabled:text-gray-400 dark:text-primary-400 dark:hover:bg-primary-900/20"
                                >
                                    <RefreshCw className={`h-4 w-4 ${syncing[account.id] ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 同步详情 */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
                {selectedAccount ? (
                    <div>
                        {/* 同步选项 */}
                        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                                同步选项
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        同步模式
                                    </label>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                value="incremental"
                                                checked={syncOptions.syncMode === 'incremental'}
                                                onChange={(e) => setSyncOptions({ ...syncOptions, syncMode: 'incremental' })}
                                                className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">增量同步</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                value="full"
                                                checked={syncOptions.syncMode === 'full'}
                                                onChange={(e) => setSyncOptions({ ...syncOptions, syncMode: 'full' })}
                                                className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">全量同步</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        同步文件夹
                                    </label>
                                    <div className="space-y-2">
                                        {['INBOX', 'Sent', 'Drafts', 'Trash'].map((mailbox) => (
                                            <label key={mailbox} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={syncOptions.mailboxes.includes(mailbox)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSyncOptions({
                                                                ...syncOptions,
                                                                mailboxes: [...syncOptions.mailboxes, mailbox]
                                                            })
                                                        } else {
                                                            setSyncOptions({
                                                                ...syncOptions,
                                                                mailboxes: syncOptions.mailboxes.filter(m => m !== mailbox)
                                                            })
                                                        }
                                                    }}
                                                    className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{mailbox}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        每个文件夹最大邮件数
                                    </label>
                                    <input
                                        type="number"
                                        value={syncOptions.maxEmailsPerMailbox}
                                        onChange={(e) => setSyncOptions({ ...syncOptions, maxEmailsPerMailbox: parseInt(e.target.value) })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 同步记录 */}
                        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                                同步记录
                            </h3>
                            {syncRecords[selectedAccount]?.length > 0 ? (
                                <div className="space-y-3">
                                    {syncRecords[selectedAccount].map((record) => (
                                        <div
                                            key={record.id}
                                            className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Folder className="h-5 w-5 text-gray-400" />
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {record.mailboxName}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        上次同步: {formatDate(record.lastSyncEndTime)} ·
                                                        处理 {record.emailsProcessed} 封邮件
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSyncRecord(selectedAccount, record.mailboxName)}
                                                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                重置
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                    暂无同步记录
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <RefreshCw className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                            <p className="text-gray-500 dark:text-gray-400">
                                选择一个账户查看同步详情
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}