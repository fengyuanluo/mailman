'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    Plus,
    Loader2,
    Globe,
    User,
    Clock,
    Folder,
    Zap,
    Settings,
    Mail,
    CheckCircle,
    Search,
    ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncConfig {
    id?: number
    account_id?: number
    enable_auto_sync: boolean
    sync_interval: number
    sync_folders: string[]
}

interface Account {
    id: number
    emailAddress: string
    name?: string
    authType?: string
    mailProviderId?: number
    mailProvider?: {
        id: number
        name: string
        type: string
        imapServer: string
        imapPort: number
    }
    isVerified?: boolean
}

interface PaginatedAccountsResponse {
    data: Account[]
    total: number
    page: number
    limit: number
    total_pages: number
}

interface Mailbox {
    id: number
    name: string
    delimiter: string
    flags: string[]
    is_deleted: boolean
}

interface SyncConfigModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    config?: SyncConfig & { account?: Account }
    mode: 'create' | 'edit' | 'global'
    accounts?: Account[]
}

export default function SyncConfigModal({
    isOpen,
    onClose,
    onSuccess,
    config,
    mode,
    accounts = []
}: SyncConfigModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<SyncConfig>({
        enable_auto_sync: true,
        sync_interval: 300,
        sync_folders: ['INBOX']
    })
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
    const [customInterval, setCustomInterval] = useState<string>('')
    const [newFolder, setNewFolder] = useState('')

    // 账户搜索相关状态
    const [accountSearchQuery, setAccountSearchQuery] = useState('')
    const [showAccountDropdown, setShowAccountDropdown] = useState(false)
    const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
    const [loadingAccounts, setLoadingAccounts] = useState(false)
    const [accountsPage, setAccountsPage] = useState(1)
    const [accountsLimit] = useState(10)
    const [accountsTotal, setAccountsTotal] = useState(0)
    const [accountsTotalPages, setAccountsTotalPages] = useState(1)
    const [hasMoreAccounts, setHasMoreAccounts] = useState(false)

    // 文件夹相关状态
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
    const [loadingMailboxes, setLoadingMailboxes] = useState(false)

    // 引用用于点击外部关闭
    const accountDropdownRef = useRef<HTMLDivElement>(null)

    // 预定义的文件夹选项（仅作为最后的后备，优先使用从服务器获取的文件夹）
    const folderOptions = ['INBOX']  // 只保留 INBOX，其他文件夹应该从服务器动态获取

    // 预定义的同步间隔选项
    const intervalOptions = [
        { value: 5, label: '5 秒' },
        { value: 10, label: '10 秒' },
        { value: 30, label: '30 秒' },
        { value: 60, label: '1 分钟' },
        { value: 300, label: '5 分钟' },
        { value: 600, label: '10 分钟' },
        { value: 900, label: '15 分钟' },
        { value: 1800, label: '30 分钟' },
        { value: 3600, label: '1 小时' },
        { value: 'custom', label: '自定义' }
    ]

    // 处理模态框动画
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
            setTimeout(() => setIsAnimating(true), 10)
        } else {
            setIsAnimating(false)
            setTimeout(() => setIsVisible(false), 300)
        }
    }, [isOpen])

    useEffect(() => {
        if (config) {
            setFormData({
                enable_auto_sync: config.enable_auto_sync,
                sync_interval: config.sync_interval,
                sync_folders: config.sync_folders || ['INBOX']
            })
            if (config.account_id) {
                setSelectedAccountId(config.account_id)
                // 如果有账户信息，设置选中的账户
                if (config.account) {
                    setSelectedAccount(config.account)
                }
            }
            // 如果是自定义间隔，设置自定义值
            const isCustomInterval = !intervalOptions.find(opt => typeof opt.value === 'number' && opt.value === config.sync_interval)
            if (isCustomInterval) {
                setCustomInterval(config.sync_interval.toString())
            }
        } else {
            setFormData({
                enable_auto_sync: true,
                sync_interval: 300,
                sync_folders: ['INBOX']
            })
            setSelectedAccountId(null)
            setSelectedAccount(null)
            setCustomInterval('')
        }
    }, [config])

    // 加载账户数据的函数
    const loadAccounts = async (page: number = 1, search: string = '', reset: boolean = false) => {
        if (mode !== 'create') return;

        try {
            setLoadingAccounts(true);

            const params = new URLSearchParams({
                page: page.toString(),
                limit: accountsLimit.toString()
            });

            if (search.trim()) {
                params.append('search', search.trim());
            }

            const response = await apiClient.get(`/accounts/paginated?${params}`);
            const data: PaginatedAccountsResponse = response;
            console.log("API Response:", data);

            // 确保数据存在
            if (data && data.data) {
                if (reset || page === 1) {
                    setFilteredAccounts(data.data);
                    console.log("Set filtered accounts:", data.data);
                } else {
                    setFilteredAccounts(prev => [...prev, ...data.data]);
                }
            } else {
                console.error("No data in response");
                setFilteredAccounts([]);
            }

            setAccountsTotal(data.total || 0);
            setAccountsTotalPages(data.total_pages || 1);
            setHasMoreAccounts(page < (data.total_pages || 1));
            setAccountsPage(page);

        } catch (error) {
            console.error('Failed to load accounts:', error);
            setFilteredAccounts([]);
        } finally {
            setLoadingAccounts(false);
        }
    };

    // 加载账户文件夹
    const loadMailboxes = async (accountId: number) => {
        try {
            setLoadingMailboxes(true);
            const response = await apiClient.get(`/accounts/${accountId}/mailboxes`);
            setMailboxes(response);
        } catch (error) {
            console.error('Failed to load mailboxes:', error);
            setMailboxes([]);
        } finally {
            setLoadingMailboxes(false);
        }
    };

    // 初始加载账户数据 - 修改为模态框打开时就加载
    useEffect(() => {
        if (mode === 'create' && isOpen) {
            // 预加载账户数据，不需要等待下拉框打开
            loadAccounts(1, '', true);
        }
    }, [mode, isOpen]);

    // 当选择账户或编辑模式时加载文件夹
    useEffect(() => {
        const accountId = mode === 'edit' && config?.account_id ? config.account_id : selectedAccountId;
        if (accountId && isOpen) {
            loadMailboxes(accountId);
        }
    }, [selectedAccountId, config?.account_id, mode, isOpen]);

    // 搜索防抖处理
    useEffect(() => {
        if (mode !== 'create') return;

        const timeoutId = setTimeout(() => {
            if (showAccountDropdown) {
                loadAccounts(1, accountSearchQuery, true);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [accountSearchQuery, mode]);

    // 点击外部关闭下拉框
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
                setShowAccountDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleIntervalChange = (value: string) => {
        if (value === 'custom') {
            // 保持当前值，只是切换到自定义模式
            setCustomInterval(formData.sync_interval.toString())
        } else {
            setFormData({ ...formData, sync_interval: parseInt(value) })
            setCustomInterval('')
        }
    }

    const handleCustomIntervalChange = (value: string) => {
        setCustomInterval(value)
        const numValue = parseInt(value)
        if (!isNaN(numValue) && numValue >= 5) {
            setFormData({ ...formData, sync_interval: numValue })
        }
    }

    const toggleFolder = (folder: string) => {
        const folders = formData.sync_folders || []
        if (folders.includes(folder)) {
            setFormData({
                ...formData,
                sync_folders: folders.filter(f => f !== folder)
            })
        } else {
            setFormData({
                ...formData,
                sync_folders: [...folders, folder]
            })
        }
    }

    const addCustomFolder = () => {
        if (newFolder && !formData.sync_folders.includes(newFolder)) {
            setFormData({
                ...formData,
                sync_folders: [...formData.sync_folders, newFolder]
            })
            setNewFolder('')
        }
    }

    const removeFolder = (folder: string) => {
        setFormData({
            ...formData,
            sync_folders: formData.sync_folders.filter(f => f !== folder)
        })
    }

    const handleSubmit = async () => {
        try {
            setLoading(true)

            if (mode === 'create' && !selectedAccountId) {
                toast.error('请选择一个账户')
                return
            }

            if (formData.sync_interval < 5) {
                toast.error('同步间隔不能小于5秒')
                return
            }

            if (formData.sync_folders.length === 0) {
                toast.error('请至少选择一个同步文件夹')
                return
            }

            let endpoint = ''
            let method = ''
            let body: any = {
                enable_auto_sync: formData.enable_auto_sync,
                sync_interval: formData.sync_interval,
                sync_folders: formData.sync_folders
            }

            if (mode === 'global') {
                endpoint = '/sync/global-config'
                method = 'PUT'
                body = {
                    default_enable_sync: formData.enable_auto_sync,
                    default_sync_interval: formData.sync_interval,
                    default_sync_folders: formData.sync_folders
                }
            } else if (mode === 'create') {
                endpoint = `/accounts/${selectedAccountId}/sync-config`
                method = 'POST'
            } else if (mode === 'edit' && config?.account_id) {
                endpoint = `/accounts/${config.account_id}/sync-config`
                method = 'PUT'
            }

            await apiClient.request({
                method,
                url: endpoint,
                data: body
            })

            toast.success(
                mode === 'global'
                    ? '全局同步配置已更新'
                    : mode === 'create'
                        ? '同步配置已创建'
                        : '同步配置已更新'
            )

            onSuccess()
            onClose()
        } catch (error) {
            console.error('Failed to save sync config:', error)
            toast.error('保存配置失败')
        } finally {
            setLoading(false)
        }
    }

    const getTitle = () => {
        switch (mode) {
            case 'global':
                return '编辑全局同步配置'
            case 'create':
                return '新增账户同步配置'
            case 'edit':
                return '编辑同步配置'
        }
    }

    const getDescription = () => {
        switch (mode) {
            case 'global':
                return '配置所有新账户的默认同步行为'
            case 'create':
                return '为指定账户创建同步配置'
            case 'edit':
                return `编辑 ${config?.account?.emailAddress || '账户'} 的同步配置`
        }
    }

    const getIcon = () => {
        switch (mode) {
            case 'global':
                return <Settings className="w-5 h-5 text-gray-400" />
            case 'create':
                return <Plus className="w-5 h-5 text-gray-400" />
            case 'edit':
                return <Mail className="w-5 h-5 text-gray-400" />
        }
    }

    const currentIntervalValue = intervalOptions.find(opt => opt.value === formData.sync_interval)
        ? formData.sync_interval.toString()
        : 'custom'

    if (!isVisible) return null

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
            isAnimating ? "bg-black/50" : "bg-black/0"
        )}>
            <div className={cn(
                "w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl dark:bg-gray-800 transition-all duration-300",
                isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}>
                {/* 标题栏 */}
                <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {getTitle()}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {getDescription()}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {mode === 'create' && (
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <User className="w-4 h-4 text-gray-400" />
                                选择账户
                            </label>
                            <div className="relative" ref={accountDropdownRef}>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={selectedAccount ? selectedAccount.emailAddress : accountSearchQuery}
                                        onChange={(e) => {
                                            setAccountSearchQuery(e.target.value);
                                            setShowAccountDropdown(true);
                                            if (selectedAccountId) {
                                                setSelectedAccountId(null);
                                                setSelectedAccount(null);
                                            }
                                        }}
                                        onFocus={() => {
                                            console.log('Input focused, showing dropdown');
                                            setShowAccountDropdown(true);
                                            // 如果没有数据，重新加载
                                            if (filteredAccounts.length === 0 && !loadingAccounts) {
                                                loadAccounts(1, accountSearchQuery, true);
                                            }
                                        }}
                                        placeholder="搜索或选择账户..."
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-20 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                                        {loadingAccounts ? (
                                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                        ) : (
                                            <Search className="w-4 h-4 text-gray-400" />
                                        )}
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                {showAccountDropdown && (
                                    <div
                                        className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                                        style={{ zIndex: 9999 }}
                                    >
                                        {(() => {
                                            console.log('Dropdown Debug:', {
                                                showAccountDropdown,
                                                filteredAccountsLength: filteredAccounts.length,
                                                loadingAccounts,
                                                mode
                                            });
                                            return null;
                                        })()}
                                        {loadingAccounts && filteredAccounts.length === 0 ? (
                                            <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                加载中...
                                            </div>
                                        ) : filteredAccounts.length > 0 ? (
                                            <>
                                                {filteredAccounts.map((account) => (
                                                    <div
                                                        key={account.id}
                                                        onClick={() => {
                                                            setSelectedAccountId(account.id);
                                                            setSelectedAccount(account);
                                                            setAccountSearchQuery('');
                                                            setShowAccountDropdown(false);
                                                        }}
                                                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedAccountId === account.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium truncate">{account.emailAddress}</div>
                                                                {account.mailProvider && (
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                        {account.mailProvider.name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-2">
                                                                {account.isVerified && (
                                                                    <div className="w-2 h-2 bg-green-500 rounded-full" title="已验证" />
                                                                )}
                                                                {selectedAccountId === account.id && (
                                                                    <CheckCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {hasMoreAccounts && (
                                                    <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-600">
                                                        <button
                                                            onClick={() => {
                                                                if (!loadingAccounts) {
                                                                    loadAccounts(accountsPage + 1, accountSearchQuery, false);
                                                                }
                                                            }}
                                                            disabled={loadingAccounts}
                                                            className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 flex items-center justify-center gap-2"
                                                        >
                                                            {loadingAccounts ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    加载中...
                                                                </>
                                                            ) : (
                                                                `加载更多 (${filteredAccounts.length}/${accountsTotal})`
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                                                {accountSearchQuery ? '未找到匹配的账户' : '暂无账户数据'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <label className="flex items-center gap-2 text-base font-medium text-gray-700 dark:text-gray-300">
                                    <Zap className="w-4 h-4 text-gray-400" />
                                    启用自动同步
                                </label>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    开启后将按设定的间隔自动同步邮件
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-sm font-medium",
                                    formData.enable_auto_sync ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                                )}>
                                    {formData.enable_auto_sync ? '开启' : '关闭'}
                                </span>
                                <Switch
                                    checked={formData.enable_auto_sync}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, enable_auto_sync: checked })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Clock className="w-4 h-4 text-gray-400" />
                            同步间隔
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={currentIntervalValue}
                                onChange={(e) => handleIntervalChange(e.target.value)}
                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                            >
                                {intervalOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value.toString()}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {currentIntervalValue === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="5"
                                        value={customInterval || formData.sync_interval}
                                        onChange={(e) => handleCustomIntervalChange(e.target.value)}
                                        className="w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                        placeholder="秒"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400">秒</span>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            最小同步间隔为 5 秒
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Folder className="w-4 h-4 text-gray-400" />
                            同步文件夹
                        </label>
                        <div className="space-y-4">
                            {loadingMailboxes ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                    <span className="ml-2 text-sm text-gray-500">加载文件夹中...</span>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {/* 如果有动态文件夹，使用它们；否则使用预定义的 */}
                                    {(mailboxes.length > 0 ? mailboxes : folderOptions.map(name => ({ name, is_deleted: false })))
                                        .filter((folder) => {
                                            const folderName = typeof folder === 'string' ? folder : folder.name;
                                            // 过滤掉无效的文件夹
                                            return folderName !== '[Gmail]' && folderName.trim() !== '';
                                        })
                                        .map((folder) => {
                                            const folderName = typeof folder === 'string' ? folder : folder.name;
                                            const isDeleted = typeof folder === 'object' && folder.is_deleted;
                                            const isSelected = formData.sync_folders.includes(folderName);

                                            return (
                                                <button
                                                    key={folderName}
                                                    type="button"
                                                    onClick={() => !isDeleted && toggleFolder(folderName)}
                                                    disabled={isDeleted}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-all",
                                                        isDeleted
                                                            ? "bg-gray-100 text-gray-400 line-through cursor-not-allowed dark:bg-gray-800 dark:text-gray-500"
                                                            : isSelected
                                                                ? "bg-primary-600 text-white hover:bg-primary-700 hover:scale-105"
                                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                                    )}
                                                    title={isDeleted ? "此文件夹已被删除" : undefined}
                                                >
                                                    {isSelected && !isDeleted && (
                                                        <CheckCircle className="w-3 h-3" />
                                                    )}
                                                    {folderName}
                                                </button>
                                            );
                                        })}
                                </div>
                            )}

                            {formData.sync_folders.filter(f => !folderOptions.includes(f)).length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">自定义文件夹：</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.sync_folders
                                            .filter(f => !folderOptions.includes(f))
                                            .map((folder) => (
                                                <div key={folder} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300">
                                                    {folder}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFolder(folder)}
                                                        className="ml-1 p-0.5 hover:bg-gray-300 dark:hover:bg-gray-500 rounded"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newFolder}
                                    onChange={(e) => setNewFolder(e.target.value)}
                                    placeholder="添加自定义文件夹"
                                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            addCustomFolder()
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={addCustomFolder}
                                    disabled={!newFolder}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 底部操作栏 */}
                <div className="flex items-center justify-end space-x-3 border-t border-gray-200 p-6 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                <span>保存中...</span>
                            </>
                        ) : (
                            <span>{mode === 'create' ? '创建' : '保存'}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
