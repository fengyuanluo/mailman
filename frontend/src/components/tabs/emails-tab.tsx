'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Filter, Mail, Paperclip, Star, Archive, Trash2, RefreshCw, Code, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { emailService, EmailSearchParams } from '@/services/email.service'
import { emailAccountService } from '@/services/email-account.service'
import { Email, EmailAccount } from '@/types'
import { formatDate, truncate } from '@/lib/utils'
import SyncAccountModal from '@/components/modals/sync-account-modal'
import { registerTabCallback, unregisterTabCallback } from '@/lib/tab-utils'

// 邮件列表项组件
function EmailItem({
    email,
    selected,
    onSelect
}: {
    email: Email
    selected: boolean
    onSelect: (email: Email) => void
}) {
    return (
        <div
            onClick={() => onSelect(email)}
            className={cn(
                "cursor-pointer border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
                selected && "bg-primary-50 dark:bg-primary-900/20"
            )}
        >
            <div className="flex items-start space-x-3">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => { }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {Array.isArray(email.From) ? email.From[0] : email.From || '未知发件人'}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(email.Date)}
                        </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {email.Subject || '(无主题)'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {truncate(email.Body || '', 100)}
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        {email.Attachments && email.Attachments.length > 0 && (
                            <span className="flex items-center">
                                <Paperclip className="mr-1 h-3 w-3" />
                                {email.Attachments.length}
                            </span>
                        )}
                        <span>{email.MailboxName}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// 邮件详情组件
function EmailDetail({ email }: { email: Email | null }) {
    // 添加状态变量控制是否显示原始内容
    const [showRawContent, setShowRawContent] = useState(false);
    if (!email) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <Mail className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">选择一封邮件查看详情</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            {/* 邮件头部 */}
            <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {email.Subject || '(无主题)'}
                </h2>
                <div className="mt-4 space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">发件人:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                            {Array.isArray(email.From) ? email.From.join(', ') : email.From || '未知发件人'}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">收件人:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                            {Array.isArray(email.To) ? email.To.join(', ') : email.To || '未知收件人'}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">日期:</span>
                        <span className="text-gray-700 dark:text-gray-300">{formatDate(email.Date)}</span>
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="mt-4 flex space-x-2">
                    <button className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                        <Star className="h-5 w-5" />
                    </button>
                    <button className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                        <Archive className="h-5 w-5" />
                    </button>
                    <button className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                        <Trash2 className="h-5 w-5" />
                    </button>
                    <button
                        className={`rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${showRawContent ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                        onClick={() => setShowRawContent(!showRawContent)}
                        title="查看原始内容"
                    >
                        <Code className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* 邮件内容 */}
            <div className="flex-1 overflow-y-auto p-6">
                {showRawContent ? (
                    // 显示原始邮件内容
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto">
                        <pre className="whitespace-pre-wrap text-xs font-mono text-gray-700 dark:text-gray-300">
                            {email.RawMessage ? email.RawMessage :
                                `From: ${Array.isArray(email.From) ? email.From.join(', ') : email.From}
To: ${Array.isArray(email.To) ? email.To.join(', ') : email.To}
${email.Cc ? `Cc: ${Array.isArray(email.Cc) ? email.Cc.join(', ') : email.Cc}\n` : ''}
${email.Bcc ? `Bcc: ${Array.isArray(email.Bcc) ? email.Bcc.join(', ') : email.Bcc}\n` : ''}
Date: ${email.Date}
Subject: ${email.Subject}
Message-ID: ${email.MessageID}
Mailbox: ${email.MailboxName}

${email.HTMLBody ? '--- HTML Content ---\n\n' + email.HTMLBody + '\n\n--- Plain Text Content ---\n\n' : ''}${email.Body || '(无内容)'}`}
                        </pre>
                    </div>
                ) : email.HTMLBody ? (
                    <iframe
                        srcDoc={email.HTMLBody}
                        title="邮件内容"
                        className="w-full h-full border-0 bg-white dark:bg-gray-800"
                        sandbox="allow-same-origin allow-popups"
                        onLoad={(e) => {
                            // 调整iframe高度以适应内容
                            try {
                                const iframe = e.target as HTMLIFrameElement;
                                if (iframe && iframe.contentWindow) {
                                    const height = iframe.contentWindow.document.body.scrollHeight;
                                    iframe.style.height = `${height}px`;
                                }
                            } catch (err) {
                                console.error("无法调整iframe高度:", err);
                            }
                        }}
                    />
                ) : (
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {email.Body || '(无内容)'}
                    </p>
                )}

                {/* 附件 */}
                {email.Attachments && email.Attachments.length > 0 && (
                    <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                        <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                            附件 ({email.Attachments.length})
                        </h3>
                        <div className="space-y-2">
                            {email.Attachments.map((attachment, index) => (
                                <div
                                    key={attachment.id || index}
                                    className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                                >
                                    <Paperclip className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {attachment.filename}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        ({Math.round(attachment.size / 1024)} KB)
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function EmailsTab() {
    const [accounts, setAccounts] = useState<EmailAccount[]>([])
    const [accountSearchQuery, setAccountSearchQuery] = useState('')
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
    const [selectedAccountLabel, setSelectedAccountLabel] = useState<string>('')
    const [emails, setEmails] = useState<Email[]>([])
    // 添加一个状态变量，用于跟踪是否应该跳过账户选择
    const [skipAccountSelection, setSkipAccountSelection] = useState(false)
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
    const [loading, setLoading] = useState(true)
    const [accountsLoading, setAccountsLoading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showSyncModal, setShowSyncModal] = useState(false)
    // 添加筛选面板状态
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [filterOptions, setFilterOptions] = useState({
        startDate: '',
        endDate: '',
        fromQuery: '',
        toQuery: '',
        ccQuery: '',
        subjectQuery: '',
        bodyQuery: '',
        mailbox: ''
    })

    // 添加搜索防抖定时器引用
    const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null)
    const accountSearchDebounceTimer = useRef<NodeJS.Timeout | null>(null)

    // 添加邮箱搜索模式状态
    const [isEmailSearchMode, setIsEmailSearchMode] = useState(false)
    const [emailSearchTarget, setEmailSearchTarget] = useState<string | null>(null)

    // 添加邮箱验证函数
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const result = emailRegex.test(email.trim())
        console.log('邮箱验证结果:', email, result)
        return result
    }

    // 分页和滚动相关状态
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [hasMoreAccounts, setHasMoreAccounts] = useState(true)
    const [isFirstPage, setIsFirstPage] = useState(true)
    const [isLastPage, setIsLastPage] = useState(false)
    const accountListRef = React.useRef<HTMLDivElement>(null)

    // 邮件列表分页状态
    const [emailsCurrentPage, setEmailsCurrentPage] = useState(1)
    const [hasMoreEmails, setHasMoreEmails] = useState(true)
    const [emailsLoading, setEmailsLoading] = useState(false)
    const emailsListRef = React.useRef<HTMLDivElement>(null)

    // 保存账户信息到localStorage的工具函数
    const saveAccountToStorage = (accountId: number, accountEmail: string) => {
        try {
            localStorage.setItem('selectedEmailAccount', JSON.stringify({
                id: accountId,
                email: accountEmail,
                timestamp: new Date().getTime()
            }));
            console.log('[EmailsTab] 保存账户信息到localStorage:', accountId, accountEmail);
        } catch (error) {
            console.error('[EmailsTab] 无法保存账户信息到localStorage:', error);
        }
    };

    // 从localStorage获取账户信息的工具函数
    const getAccountFromStorage = () => {
        try {
            const data = localStorage.getItem('selectedEmailAccount');
            if (!data) return null;

            const account = JSON.parse(data);
            // 检查数据是否过期（10分钟）
            if (new Date().getTime() - account.timestamp > 10 * 60 * 1000) {
                localStorage.removeItem('selectedEmailAccount');
                return null;
            }

            return account;
        } catch (error) {
            console.error('[EmailsTab] 无法从localStorage获取账户信息:', error);
            return null;
        }
    };

    // 清除localStorage中的账户信息
    const clearAccountFromStorage = () => {
        try {
            localStorage.removeItem('selectedEmailAccount');
        } catch (error) {
            console.error('[EmailsTab] 无法清除localStorage中的账户信息:', error);
        }
    };

    // 处理从账户管理页面切换过来的账户选择
    const handleAccountSelection = useCallback((data: any) => {
        console.log('[EmailsTab] 回调函数收到账户选择数据:', data);

        if (data?.selectedAccountId) {
            const accountId = data.selectedAccountId;
            const accountEmail = data.selectedAccountEmail;

            // 如果有邮箱地址，直接设置账户并加载邮件
            if (accountEmail) {
                console.log('[EmailsTab] 从回调设置账户:', accountEmail, 'ID:', accountId);

                // 同时保存到localStorage，作为备份
                saveAccountToStorage(accountId, accountEmail);

                // 直接加载对应账户的邮件
                setSelectedAccount(accountId);
                setSelectedAccountLabel(accountEmail);
                setAccountSearchQuery('');

                // 禁止任何loadAccounts自动选择账户
                setSkipAccountSelection(true);
            } else {
                // 查找对应的账户
                const account = accounts.find(acc => acc.id === accountId);
                if (account) {
                    setSelectedAccount(account.id);
                    setSelectedAccountLabel(account.emailAddress);
                    setAccountSearchQuery('');

                    // 保存到localStorage
                    saveAccountToStorage(account.id, account.emailAddress);
                } else {
                    // 直接找对应ID的账户
                    loadAllAccountsForSelection(accountId);
                }
            }
        }
    }, [accounts]);

    // 注册回调函数，在组件挂载完成时调用
    useEffect(() => {
        console.log('[EmailsTab] 注册onReady回调函数');

        // 注册回调函数
        registerTabCallback('emails', 'onReady', handleAccountSelection);

        // 创建一个自定义事件，通知主页面回调已注册
        const event = new CustomEvent('tabCallbackRegistered', {
            detail: { tabId: 'emails', callbackName: 'onReady' }
        });
        window.dispatchEvent(event);

        // 组件卸载时清理回调
        return () => {
            console.log('[EmailsTab] 卸载组件，注销onReady回调');
            unregisterTabCallback('emails', 'onReady');
        };
    }, [handleAccountSelection]);

    const loadAccounts = async (page = currentPage, isInitialLoad = false) => {
        // 首先检查是否有从账户管理页面传递过来的账户信息
        const switchTabData = (window as any).switchTabData;
        if (switchTabData && switchTabData.selectedAccountId && switchTabData.selectedAccountEmail) {
            console.log('[loadAccounts] 检测到全局变量中的 switchTabData:', switchTabData);

            // 直接设置选中的账户，并返回，不进行任何自动选择
            setSelectedAccount(switchTabData.selectedAccountId);
            setSelectedAccountLabel(switchTabData.selectedAccountEmail);

            // 清除全局变量，避免影响后续操作
            delete (window as any).switchTabData;

            // 设置跳过标记，确保所有自动选择都被跳过
            setSkipAccountSelection(true);
            return;
        }

        setAccountsLoading(true)
        try {

            // 显式处理搜索参数，确保非空时传递
            const searchParam = accountSearchQuery ? accountSearchQuery.trim() : '';
            console.log('搜索参数:', searchParam);

            // 检查是否是邮箱格式
            const isEmail = isValidEmail(searchParam);
            console.log('账户搜索框输入是否为邮箱:', isEmail);

            // 使用分页API搜索账户，强制传递search参数（即使为空）
            const response = await emailAccountService.getAccountsPaginated({
                page: page,
                limit: 10,
                search: searchParam
            })

            console.log('请求URL参数:', `page=${page}&limit=10&search=${encodeURIComponent(searchParam)}`);
            console.log('账户API响应:', response);

            const data = response.data;

            // 如果搜索的是邮箱地址但没有找到账户，切换到邮箱搜索模式
            if (isEmail && searchParam && data.length === 0 && page === 1) {
                console.log('🔄 检测到邮箱地址但无对应账户，切换到邮箱搜索模式');
                setIsEmailSearchMode(true);
                setEmailSearchTarget(searchParam);
                // 清除选中的账户
                setSelectedAccount(null);
                setSelectedAccountLabel('');
                // 关闭下拉框
                setAccountDropdownOpen(false);
                // 执行邮箱搜索
                searchEmailsByToQuery(searchParam, 1, true);
                return;
            }

            // 如果是初始加载或重置搜索，则替换数据
            if (isInitialLoad || page === 1) {
                setAccounts(data);
            } else {
                // 否则追加数据（滚动加载模式）
                setAccounts(prev => [...prev, ...data]);
            }

            // 更新分页状态
            setTotalPages(response.total_pages || 1);
            setIsFirstPage(page === 1);
            setIsLastPage(page >= (response.total_pages || 1));
            setHasMoreAccounts(data.length > 0 && page < (response.total_pages || 1));

            // 处理账户选择
            if (data.length > 0) {
                console.log('[loadAccounts] 处理账户选择，isInitialLoad:', isInitialLoad);
                console.log('[loadAccounts] 当前 selectedAccount:', selectedAccount);

                // 检查是否有 __skipAccountSelection 标记
                if ((window as any).__skipAccountSelection) {
                    console.log('[loadAccounts] 检测到 __skipAccountSelection 标记，跳过账户选择');
                    return;
                }

                // 检查是否是从账户管理页面切换过来的
                const fromAccountsTab = (window as any).__fromAccountsTab;
                const targetAccountId = (window as any).__targetAccountId;
                const targetAccountEmail = (window as any).__targetAccountEmail;

                if (fromAccountsTab && targetAccountId && targetAccountEmail) {
                    console.log('[loadAccounts] 从账户管理页面切换过来，保持选中状态:', targetAccountEmail);
                    // 清除标记
                    delete (window as any).__fromAccountsTab;
                    delete (window as any).__targetAccountId;
                    delete (window as any).__targetAccountEmail;
                    // 保持当前选中状态，不做任何改变
                    return;
                }

                // 首先检查是否有待处理的账户选择
                const pendingAccountId = (window as any).__pendingSelectedAccountId;
                console.log('[loadAccounts] 待处理的账户ID:', pendingAccountId);

                if (pendingAccountId) {
                    // 查找所有账户中是否有匹配的
                    const allAccounts = page === 1 ? data : [...accounts, ...data];
                    const account = allAccounts.find(acc => acc.id === pendingAccountId);
                    if (account) {
                        console.log('[loadAccounts] 找到待选择的账户:', account.emailAddress);
                        setSelectedAccount(pendingAccountId);
                        setSelectedAccountLabel(account.emailAddress);
                        delete (window as any).__pendingSelectedAccountId;
                        return; // 找到了就直接返回，不执行后续逻辑
                    } else {
                        console.log('[loadAccounts] 未找到待选择的账户');
                        // 保留待选择ID，可能在后续页面中
                    }
                }

                // 检查是否应该跳过账户选择 - 使用React状态
                if (skipAccountSelection) {
                    console.log('[loadAccounts] 检测到skipAccountSelection状态为true，跳过账户选择');
                    return;
                }

                // 只有在初次加载且没有选中账户时，才选择第一个
                if (isInitialLoad && !selectedAccount && !pendingAccountId) {
                    console.log('[loadAccounts] 没有选中的账户，选择第一个:', data[0].emailAddress);

                    // 如果有全局变量中的switchTabData，即使处于初始加载也不选择第一个账户
                    if ((window as any).switchTabData) {
                        console.log('[loadAccounts] 由于存在switchTabData，跳过自动选择第一个账户');
                        return;
                    }

                    setSelectedAccount(data[0].id);
                    setSelectedAccountLabel(data[0].emailAddress);
                } else if (selectedAccount) {
                    console.log('[loadAccounts] 已有选中的账户，保持不变');
                }
            }
        } catch (error) {
            console.error('Failed to load accounts:', error);
            setHasMoreAccounts(false);
        } finally {
            setAccountsLoading(false);
        }
    }

    // 处理账户列表滚动
    const handleAccountListScroll = () => {
        if (!accountListRef.current || accountsLoading || !hasMoreAccounts) return;

        const { scrollTop, scrollHeight, clientHeight } = accountListRef.current;
        // 当滚动到底部时（预留20px缓冲区）加载更多
        if (scrollHeight - scrollTop - clientHeight < 20) {
            setCurrentPage(prev => prev + 1);
            loadAccounts(currentPage + 1);
        }
    };

    // 搜索查询变化时，重置状态并执行搜索
    useEffect(() => {
        // 如果有全局变量中的switchTabData，不要触发搜索
        if ((window as any).switchTabData) {
            return;
        }

        // 如果是从账户管理页面切换过来的，不要触发搜索
        if ((window as any).__fromAccountsTab) {
            return;
        }

        // 检查是否应该跳过账户选择
        if (skipAccountSelection) {
            return;
        }

        const timer = setTimeout(() => {
            setCurrentPage(1);
            loadAccounts(1, true); // 以初始加载模式执行
        }, 300);

        return () => clearTimeout(timer);
    }, [accountSearchQuery, skipAccountSelection]); // 添加skipAccountSelection作为依赖项


    // 添加基于to_query的搜索函数
    const searchEmailsByToQuery = async (email: string, page = 1, isInitialLoad = false) => {
        console.log('===> 执行邮箱专用搜索函数, 邮箱:', email)

        // 强制转换为字符串确保安全
        const emailStr = String(email).trim()

        if (!emailStr) {
            console.error('邮箱地址为空，无法执行搜索')
            return
        }
        if (isInitialLoad) {
            setLoading(true)
            setEmailsCurrentPage(1)
        } else {
            setEmailsLoading(true)
        }

        try {
            const limit = 20 // 每页加载数量
            const offset = (page - 1) * limit

            // 构建搜索参数，确保to_query一定存在
            const searchParams: EmailSearchParams = {
                to_query: emailStr,
                limit: limit,
                offset: offset,
                sort_by: 'date_desc'
            }

            console.log('构建邮箱专用搜索请求:', searchParams)

            // 直接调用backend的/emails/search API
            const response = await emailService.searchEmails(searchParams)

            console.log('搜索邮箱API原始响应:', response)

            // 详细记录response的结构
            if (response) {
                console.log('响应状态:', response.status)
                console.log('响应数据类型:', typeof response.data)
                if (response.data) {
                    console.log('响应数据结构:', Object.keys(response.data))

                    // 检查是否包含搜索条件回显
                    if (response.data.search_criteria) {
                        console.log('搜索条件回显:', response.data.search_criteria)
                    }
                }
            }

            console.log('使用to_query搜索结果:', response)

            // 处理搜索结果...
            let emailsData = null

            // 首先检查响应格式，后端返回格式应该是：{ emails: [...] }
            if (response && response.data && response.data.emails && Array.isArray(response.data.emails)) {
                console.log('找到了正确的emails数组结构')
                emailsData = response.data.emails
            } else if (response && response.data && Array.isArray(response.data)) {
                console.log('直接使用response.data作为邮件数组')
                emailsData = response.data
            } else if (response && Array.isArray(response)) {
                console.log('直接使用response作为邮件数组')
                emailsData = response
            } else {
                console.log('尝试在response中查找任何可能的数组')
                // 递归查找任何可能的响应数组
                const findArray = (obj: any, path = ''): any[] | null => {
                    if (!obj || typeof obj !== 'object') return null

                    // 如果找到了数组并且看起来像emails（检查第一个元素是否有常见字段）
                    if (Array.isArray(obj) && obj.length > 0 &&
                        (obj[0].Subject !== undefined || obj[0].From !== undefined)) {
                        console.log(`在${path}找到可能的邮件数组`)
                        return obj
                    }

                    // 递归查找所有对象属性
                    for (const key in obj) {
                        const result = findArray(obj[key], `${path}.${key}`)
                        if (result) return result
                    }

                    return null
                }

                // 先尝试在response.data中查找
                if (response && response.data) {
                    emailsData = findArray(response.data, 'response.data')
                }

                // 如果还没找到，尝试在整个response中查找
                if (!emailsData && response) {
                    emailsData = findArray(response, 'response')
                }
            }

            if (emailsData && emailsData.length > 0) {
                // 确保数据格式正确
                const processedEmails = emailsData.map((email: any) => ({
                    ...email,
                    // 确保关键字段存在
                    ID: email.ID,
                    From: email.From || ['未知发件人'],
                    To: email.To || ['未知收件人'],
                    Subject: email.Subject || '',
                    Date: email.Date || new Date().toISOString(),
                    Body: email.Body || '',
                    HTMLBody: email.HTMLBody || '',
                    MailboxName: email.MailboxName || 'INBOX'
                }))

                // 如果是初始加载或重置搜索，则替换数据
                if (isInitialLoad || page === 1) {
                    setEmails(processedEmails)
                } else {
                    // 否则追加数据（滚动加载模式）
                    setEmails(prev => [...prev, ...processedEmails])
                }

                // 更新分页状态
                setHasMoreEmails(emailsData.length >= limit)
                setEmailsCurrentPage(page)
            } else {
                console.error('无法找到有效的邮件数组:', response)
                if (isInitialLoad) {
                    setEmails([])
                }
                setHasMoreEmails(false)
            }
        } catch (error: any) {
            console.error('❌ Failed to search emails by to_query:', error)
            console.error('错误详情:', {
                message: error?.message,
                response: error?.response,
                status: error?.response?.status,
                data: error?.response?.data
            })

            // 显示错误提示
            const errorMessage = error?.response?.data?.error || error?.message || '搜索失败'
            console.error('用户可见错误:', errorMessage)

            if (isInitialLoad) {
                setEmails([])
            }
            setHasMoreEmails(false)
        } finally {
            if (isInitialLoad) {
                setLoading(false)
            } else {
                setEmailsLoading(false)
            }
        }
    }

    // 处理筛选选项变化
    const handleFilterChange = (field: string, value: string) => {
        setFilterOptions(prev => ({
            ...prev,
            [field]: value
        }))
    }

    // 应用筛选
    const applyFilters = () => {
        // 使用筛选选项构建搜索参数
        const searchParams: EmailSearchParams = {
            limit: 20,
            offset: 0,
            sort_by: 'date_desc'
        }

        // 添加非空筛选条件
        if (filterOptions.startDate) searchParams.start_date = filterOptions.startDate
        if (filterOptions.endDate) searchParams.end_date = filterOptions.endDate
        if (filterOptions.fromQuery) searchParams.from_query = filterOptions.fromQuery
        if (filterOptions.toQuery) searchParams.to_query = filterOptions.toQuery
        if (filterOptions.ccQuery) searchParams.cc_query = filterOptions.ccQuery
        if (filterOptions.subjectQuery) searchParams.subject_query = filterOptions.subjectQuery
        if (filterOptions.bodyQuery) searchParams.body_query = filterOptions.bodyQuery
        if (filterOptions.mailbox) searchParams.mailbox = filterOptions.mailbox

        // 如果有搜索框关键字，也添加
        if (searchQuery) searchParams.keyword = searchQuery

        // 执行搜索
        setLoading(true)
        if (selectedAccount) {
            // 有选中账户，使用账户特定搜索
            emailService.getEmails(selectedAccount, searchParams)
                .then(response => {
                    processEmailsResponse(response, true)
                })
                .catch(error => {
                    console.error('Filter search failed:', error)
                    setEmails([])
                })
                .finally(() => {
                    setLoading(false)
                })
        } else {
            // 无选中账户，使用全局搜索
            emailService.searchEmails(searchParams)
                .then(response => {
                    processEmailsResponse(response, true)
                })
                .catch(error => {
                    console.error('Filter search failed:', error)
                    setEmails([])
                })
                .finally(() => {
                    setLoading(false)
                })
        }

        // 关闭筛选面板
        setShowFilterPanel(false)
    }

    // 重置筛选
    const resetFilters = () => {
        setFilterOptions({
            startDate: '',
            endDate: '',
            fromQuery: '',
            toQuery: '',
            ccQuery: '',
            subjectQuery: '',
            bodyQuery: '',
            mailbox: ''
        })
    }

    // 处理并解析邮件响应数据的辅助函数
    const processEmailsResponse = (response: any, isInitialLoad = false) => {
        let emailsData = null
        if (response && Array.isArray(response)) {
            emailsData = response
        } else if (response && response.emails && Array.isArray(response.emails)) {
            emailsData = response.emails
        } else if (response && response.data && Array.isArray(response.data)) {
            emailsData = response.data
        } else {
            // 尝试寻找任何可能的数组类型字段
            for (const key in response) {
                if (response[key] && Array.isArray(response[key])) {
                    emailsData = response[key]
                    console.log(`使用response.${key}作为邮件数组`)
                    break
                }
            }
        }

        if (emailsData && emailsData.length > 0) {
            // 确保数据格式正确
            const processedEmails = emailsData.map((email: any) => ({
                ...email,
                // 确保关键字段存在
                ID: email.ID,
                From: email.From || ['未知发件人'],
                To: email.To || ['未知收件人'],
                Subject: email.Subject || '',
                Date: email.Date || new Date().toISOString(),
                Body: email.Body || '',
                HTMLBody: email.HTMLBody || '',
                MailboxName: email.MailboxName || 'INBOX'
            }))

            setEmails(processedEmails)
            setHasMoreEmails(emailsData.length >= 20)
            setEmailsCurrentPage(1)
        } else {
            console.error('无法找到有效的邮件数组:', response)
            setEmails([])
            setHasMoreEmails(false)
        }
    }

    const loadEmails = useCallback(async (page = 1, isInitialLoad = false) => {
        if (!selectedAccount) return

        if (isInitialLoad) {
            setLoading(true)
            setEmailsCurrentPage(1)
        } else {
            setEmailsLoading(true)
        }

        try {
            const limit = 20 // 每页加载数量
            const offset = (page - 1) * limit

            const response = await emailService.getEmails(selectedAccount, {
                limit: limit,
                offset: offset,
                sort_by: 'date_desc',
                keyword: searchQuery || undefined
            })
            console.log('API Response:', response)
            console.log('API Response type:', typeof response)
            console.log('API Response keys:', response ? Object.keys(response) : 'no response')

            // 检查API响应中是否直接包含邮件数组（而不是在emails字段中）
            let emailsData = null;
            if (response && Array.isArray(response)) {
                emailsData = response;
                console.log('使用响应本身作为邮件数组');
            } else if (response && response.emails && Array.isArray(response.emails)) {
                emailsData = response.emails;
                console.log('使用response.emails作为邮件数组');
            } else if (response && response.data && Array.isArray(response.data)) {
                emailsData = response.data;
                console.log('使用response.data作为邮件数组');
            } else {
                // 尝试寻找任何可能的数组类型字段
                for (const key in response) {
                    if (response[key] && Array.isArray(response[key])) {
                        emailsData = response[key];
                        console.log(`使用response.${key}作为邮件数组`);
                        break;
                    }
                }
            }

            if (emailsData && emailsData.length > 0) {
                console.log('找到邮件数据，长度:', emailsData.length);
                console.log('第一封邮件示例:', emailsData[0]);

                // 确保数据格式正确
                const processedEmails = emailsData.map((email: any) => ({
                    ...email,
                    // 确保关键字段存在
                    ID: email.ID,
                    From: email.From || ['未知发件人'],
                    To: email.To || ['未知收件人'],
                    Subject: email.Subject || '',
                    Date: email.Date || new Date().toISOString(),
                    Body: email.Body || '',
                    HTMLBody: email.HTMLBody || '',
                    MailboxName: email.MailboxName || 'INBOX'
                }));

                console.log('Processed emails:', processedEmails);

                // 如果是初始加载或重置搜索，则替换数据
                if (isInitialLoad || page === 1) {
                    setEmails(processedEmails);
                } else {
                    // 否则追加数据（滚动加载模式）
                    setEmails(prev => [...prev, ...processedEmails]);
                }

                // 更新分页状态
                setHasMoreEmails(emailsData.length >= limit);
                setEmailsCurrentPage(page);
            } else {
                console.error('无法找到有效的邮件数组:', response);
                if (isInitialLoad) {
                    setEmails([]);
                }
                setHasMoreEmails(false);
                return;
            }
        } catch (error) {
            console.error('Failed to load emails:', error);
            if (isInitialLoad) {
                setEmails([]);
            }
            setHasMoreEmails(false);
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            } else {
                setEmailsLoading(false);
            }
        }
    }, [selectedAccount, searchQuery]);

    // 处理邮件列表滚动
    const handleEmailsListScroll = () => {
        if (!emailsListRef.current || emailsLoading || !hasMoreEmails || !selectedAccount) return;

        const { scrollTop, scrollHeight, clientHeight } = emailsListRef.current;
        // 当滚动到底部时（预留20px缓冲区）加载更多
        if (scrollHeight - scrollTop - clientHeight < 30) {
            const nextPage = emailsCurrentPage + 1;
            setEmailsCurrentPage(nextPage);
            loadEmails(nextPage);
        }
    };

    // 组件挂载时的初始化
    useEffect(() => {
        // 首先检查全局变量（作为向后兼容）
        const switchTabData = (window as any).switchTabData;
        if (switchTabData && switchTabData.selectedAccountId && switchTabData.selectedAccountEmail) {
            console.log('[EmailsTab] 组件挂载时检测到全局变量中的 switchTabData:', switchTabData);

            // 直接调用我们的回调函数处理数据
            handleAccountSelection(switchTabData);

            // 清除全局变量，避免影响后续操作
            delete (window as any).switchTabData;

            return;
        }

        // 其次检查localStorage中是否有保存的账户信息
        const savedAccount = getAccountFromStorage();
        if (savedAccount) {
            console.log('[EmailsTab] 组件挂载时从localStorage获取到账户信息:', savedAccount);

            // 设置选中的账户
            setSelectedAccount(savedAccount.id);
            setSelectedAccountLabel(savedAccount.email);

            // 清除localStorage，避免影响后续操作
            clearAccountFromStorage();

            // 设置跳过标记，防止其他useEffect触发loadAccounts
            setSkipAccountSelection(true);

            return;
        }

        // 如果不是从账户管理页面切换过来的，且没有跳过选择标记，才加载账户
        if (!(window as any).__fromAccountsTab && !skipAccountSelection) {
            loadAccounts();
        }

        // 点击页面其他地方关闭下拉框
        const handleClickOutside = (e: MouseEvent) => {
            if (accountDropdownOpen) {
                setAccountDropdownOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // 选择账户变更时，重置邮件列表并加载第一页
    useEffect(() => {
        if (selectedAccount && !isEmailSearchMode) {  // 添加检查：非邮箱搜索模式才加载账户邮件
            // 如果是从账户管理页面切换过来的，确保使用正确的账户ID
            if (skipAccountSelection) {
                console.log('[EmailsTab] 账户变更(来自账户管理页面)，加载指定账户邮件:', selectedAccount);
            } else {
                console.log('[EmailsTab] 账户变更，加载邮件:', selectedAccount);
            }

            setEmailsCurrentPage(1);
            setHasMoreEmails(true);
            loadEmails(1, true);
        }
    }, [selectedAccount, loadEmails, skipAccountSelection, isEmailSearchMode]);  // 添加 isEmailSearchMode 依赖

    // 搜索查询变更时，重置并重新加载
    useEffect(() => {
        if (selectedAccount) {
            setEmailsCurrentPage(1);
            setHasMoreEmails(true);
            const timer = setTimeout(() => {
                loadEmails(1, true);
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [searchQuery, selectedAccount]);

    // 删除重复的 switchTab 事件监听器，已经在第231行有处理

    // 删除处理全局变量的 useEffect，已经在第231行的监听器中处理

    // 加载所有账户以查找特定账户
    const loadAllAccountsForSelection = async (targetAccountId: number) => {
        console.log('[EmailsTab] 开始加载所有账户以查找目标账户:', targetAccountId);
        setAccountsLoading(true);
        try {
            let page = 1;
            let hasMore = true;

            // 循环加载所有页面
            while (hasMore) {
                const response = await emailAccountService.getAccountsPaginated({
                    page: page,
                    limit: 10,
                    search: ''
                });

                // 检查是否找到目标账户
                const targetAccount = response.data.find(acc => acc.id === targetAccountId);
                if (targetAccount) {
                    console.log('[EmailsTab] 在第', page, '页找到目标账户:', targetAccount.emailAddress);

                    // 只更新选中状态，不要调用 setAccounts(allAccounts)
                    setSelectedAccount(targetAccountId);
                    setSelectedAccountLabel(targetAccount.emailAddress);
                    setAccountDropdownOpen(false);
                    delete (window as any).__pendingSelectedAccountId;

                    // 如果需要，可以将找到的账户添加到当前列表中（而不是替换整个列表）
                    setAccounts(prev => {
                        const exists = prev.find(acc => acc.id === targetAccountId);
                        if (!exists) {
                            console.log('[EmailsTab] 将目标账户添加到当前列表');
                            return [...prev, targetAccount];
                        }
                        return prev;
                    });
                    break;
                }

                hasMore = page < (response.total_pages || 1);
                page++;
            }

            if (!(window as any).__pendingSelectedAccountId) {
                console.log('[EmailsTab] 成功找到并选择了目标账户');
            } else {
                console.log('[EmailsTab] 未能找到目标账户');
                delete (window as any).__pendingSelectedAccountId;
            }
        } catch (error) {
            console.error('[EmailsTab] 加载账户失败:', error);
            delete (window as any).__pendingSelectedAccountId;
        } finally {
            setAccountsLoading(false);
        }
    };

    const handleSyncClick = () => {
        if (!selectedAccount) return;
        setShowSyncModal(true);
    };

    const handleSyncConfirm = async () => {
        if (!selectedAccount) return;

        setSyncing(true);
        setShowSyncModal(false);

        try {
            await emailAccountService.syncAccount(selectedAccount);
            setEmailsCurrentPage(1);
            setHasMoreEmails(true);
            await loadEmails(1, true);
        } catch (error) {
            console.error('Failed to sync emails:', error);
            alert('同步失败');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-12rem)] -mx-6">
            {/* 左侧邮件列表 */}
            <div className="w-96 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                {/* 账户选择和搜索 */}
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                    {/* 邮箱搜索模式提示 */}
                    {isEmailSearchMode && emailSearchTarget && (
                        <div className="mb-2 flex items-center gap-2 rounded-lg bg-blue-50 p-2 text-sm dark:bg-blue-900/20">
                            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-blue-700 dark:text-blue-300">
                                正在搜索发送给 {emailSearchTarget} 的邮件
                            </span>
                            <button
                                onClick={() => {
                                    setIsEmailSearchMode(false);
                                    setEmailSearchTarget(null);
                                    setAccountSearchQuery('');
                                    setSelectedAccountLabel('');
                                    setSelectedAccount(null); // 清除选中的账户
                                    setEmails([]); // 清空邮件列表
                                    setSearchQuery(''); // 清空搜索框
                                    loadAccounts(1, true);
                                }}
                                className="ml-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <div className="relative">
                        {/* 账户选择下拉框 */}
                        <input
                            type="text"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                            placeholder={isEmailSearchMode ? "邮箱搜索模式" : "选择账户或输入邮箱地址"}
                            value={accountSearchQuery || selectedAccountLabel}
                            onChange={(e) => {
                                const value = e.target.value;
                                setAccountSearchQuery(value);
                                setAccountDropdownOpen(true);

                                // 清除之前的定时器
                                if (accountSearchDebounceTimer.current) {
                                    clearTimeout(accountSearchDebounceTimer.current);
                                }

                                // 如果清空了输入，也清空选择
                                if (!value) {
                                    setSelectedAccount(null);
                                    setSelectedAccountLabel('');
                                    // 用户手动修改输入，重置跳过选择标记
                                    setSkipAccountSelection(false);
                                    // 退出邮箱搜索模式
                                    setIsEmailSearchMode(false);
                                    setEmailSearchTarget(null);
                                    setEmails([]); // 清空邮件列表
                                    // 重新加载账户列表
                                    loadAccounts(1, true);
                                } else {
                                    // 检查是否是邮箱格式
                                    const isEmail = isValidEmail(value);
                                    console.log('账户搜索框输入是否为邮箱:', isEmail, value);

                                    // 设置防抖定时器
                                    accountSearchDebounceTimer.current = setTimeout(() => {
                                        console.log('账户搜索防抖触发，搜索:', value, '是否邮箱:', isEmail);

                                        if (isEmail) {
                                            // 如果是邮箱格式，直接切换到邮箱搜索模式
                                            console.log('🔄 检测到邮箱格式，切换到邮箱搜索模式');
                                            setIsEmailSearchMode(true);
                                            setEmailSearchTarget(value);
                                            setSelectedAccount(null);
                                            setSelectedAccountLabel('');
                                            setAccountDropdownOpen(false);
                                            // 执行邮箱搜索
                                            searchEmailsByToQuery(value, 1, true);
                                        } else {
                                            // 普通文本，执行账户搜索
                                            setIsEmailSearchMode(false);
                                            setEmailSearchTarget(null);
                                            loadAccounts(1, true);
                                        }
                                    }, 500); // 500ms 防抖延迟
                                }
                            }}
                            onFocus={() => setAccountDropdownOpen(true)}
                            onBlur={(e) => {
                                // 延迟关闭，以便点击下拉选项时能够触发
                                setTimeout(() => {
                                    // 如果没有选中账户且输入框有值，尝试匹配第一个结果
                                    // 但在邮箱搜索模式下不要自动选择
                                    if (!selectedAccount && accountSearchQuery && accounts.length > 0 && !isEmailSearchMode) {
                                        const firstMatch = accounts[0];
                                        setSelectedAccount(firstMatch.id);
                                        setSelectedAccountLabel(firstMatch.emailAddress);
                                        setAccountSearchQuery('');
                                    }
                                    setAccountDropdownOpen(false);
                                }, 200);
                            }}
                        />

                        {/* 下拉内容 - 在邮箱搜索模式下不显示 */}
                        {accountDropdownOpen && accounts.length > 0 && !isEmailSearchMode && (
                            <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg dark:bg-gray-700">
                                {/* 账户列表 - 添加滚动事件和ref */}
                                <div
                                    ref={accountListRef}
                                    className="max-h-60 overflow-y-auto py-1"
                                    onScroll={handleAccountListScroll}
                                >
                                    {/* 第一页提示 */}
                                    {isFirstPage && !accountsLoading && (
                                        <div className="px-3 py-1 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                            已显示第一页
                                        </div>
                                    )}

                                    {accounts.length > 0 ? (
                                        accounts.map((account) => (
                                            <div
                                                key={account.id}
                                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${selectedAccount === account.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                                                onClick={() => {
                                                    setSelectedAccount(account.id);
                                                    setSelectedAccountLabel(account.emailAddress);
                                                    setAccountSearchQuery(''); // 清空搜索框
                                                    setAccountDropdownOpen(false);
                                                    // 用户手动选择账户，重置跳过选择标记
                                                    setSkipAccountSelection(false);
                                                }}
                                            >
                                                {account.emailAddress}
                                            </div>
                                        ))
                                    ) : !accountsLoading ? (
                                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                            未找到账户
                                        </div>
                                    ) : null}

                                    {/* 加载状态 */}
                                    {accountsLoading && (
                                        <div className="flex justify-center py-2">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
                                        </div>
                                    )}

                                    {/* 无更多数据提示 */}
                                    {!accountsLoading && accounts.length > 0 && isLastPage && (
                                        <div className="px-3 py-1 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                            没有更多账户
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索邮件..."
                            value={searchQuery}
                            onChange={(e) => {
                                const value = e.target.value
                                setSearchQuery(value)
                                console.log('搜索框输入变化:', value)

                                // 清除之前的定时器
                                if (searchDebounceTimer.current) {
                                    clearTimeout(searchDebounceTimer.current)
                                }

                                // 直接检查是否是邮箱格式
                                const isEmail = isValidEmail(value)
                                console.log('是否是邮箱格式:', isEmail)

                                // 设置防抖处理，300ms后执行搜索
                                searchDebounceTimer.current = setTimeout(() => {
                                    console.log('防抖触发搜索，输入值:', value, '是否邮箱:', isEmail)

                                    if (isEmail) {
                                        // 检测到有效邮箱地址，切换到邮箱搜索模式
                                        console.log('✅ 检测到有效邮箱，切换到邮箱搜索模式:', value)
                                        setIsEmailSearchMode(true)
                                        setEmailSearchTarget(value)
                                        setSelectedAccount(null)
                                        setSelectedAccountLabel('')
                                        // 执行邮箱搜索
                                        searchEmailsByToQuery(value, 1, true)
                                    } else if (isEmailSearchMode && emailSearchTarget) {
                                        // 当前处于邮箱搜索模式，支持额外的关键词筛选
                                        console.log('📧 当前处于邮箱搜索模式，添加关键词筛选:', emailSearchTarget, value)
                                        if (value) {
                                            setLoading(true)
                                            emailService.searchEmails({
                                                to_query: emailSearchTarget,
                                                keyword: value,
                                                limit: 20,
                                                offset: 0,
                                                sort_by: 'date_desc'
                                            })
                                                .then(response => {
                                                    processEmailsResponse(response, true)
                                                })
                                                .catch(error => {
                                                    console.error('邮箱搜索失败:', error)
                                                    setEmails([])
                                                })
                                                .finally(() => {
                                                    setLoading(false)
                                                })
                                        } else {
                                            // 如果搜索框为空，重新执行邮箱搜索
                                            searchEmailsByToQuery(emailSearchTarget, 1, true)
                                        }
                                    } else if (value) {
                                        console.log('⚡ 执行普通关键词搜索:', value)
                                        // 普通关键词搜索
                                        if (selectedAccount && !isEmailSearchMode) {
                                            loadEmails(1, true)
                                        } else {
                                            // 没有选中账户时，使用全局搜索
                                            setLoading(true)
                                            emailService.searchEmails({
                                                keyword: value,
                                                limit: 20,
                                                offset: 0,
                                                sort_by: 'date_desc'
                                            })
                                                .then(response => {
                                                    processEmailsResponse(response, true)
                                                })
                                                .catch(error => {
                                                    console.error('搜索失败:', error)
                                                    setEmails([])
                                                })
                                                .finally(() => {
                                                    setLoading(false)
                                                })
                                        }
                                    } else {
                                        // 搜索框为空时，重置为初始状态
                                        if (selectedAccount && !isEmailSearchMode) {
                                            loadEmails(1, true)
                                        } else if (isEmailSearchMode && emailSearchTarget) {
                                            // 邮箱搜索模式下，重新执行邮箱搜索
                                            searchEmailsByToQuery(emailSearchTarget, 1, true)
                                        } else {
                                            setEmails([])
                                        }
                                    }
                                }, 300)
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    console.log('按下Enter键，当前搜索词:', searchQuery)
                                    // 清除定时器，立即执行搜索
                                    if (searchDebounceTimer.current) {
                                        clearTimeout(searchDebounceTimer.current)
                                        searchDebounceTimer.current = null
                                    }

                                    // 检查是否是有效的邮箱地址
                                    const isEmail = isValidEmail(searchQuery)
                                    console.log('Enter键处理 - 是否是邮箱格式:', isEmail)

                                    if (isEmail) {
                                        console.log('✅ Enter键 - 检测到邮箱格式，执行邮箱专用搜索:', searchQuery)
                                        // 使用to_query搜索
                                        searchEmailsByToQuery(searchQuery, 1, true)
                                    } else if (selectedAccount) {
                                        console.log('⚡ Enter键 - 执行账户邮件搜索')
                                        loadEmails(1, true)
                                    } else {
                                        // 全局搜索
                                        emailService.searchEmails({
                                            keyword: searchQuery,
                                            limit: 20,
                                            offset: 0,
                                            sort_by: 'date_desc'
                                        })
                                            .then(response => {
                                                processEmailsResponse(response, true)
                                            })
                                            .catch(error => {
                                                console.error('搜索失败:', error)
                                                setEmails([])
                                            })
                                            .finally(() => {
                                                setLoading(false)
                                            })
                                    }
                                }
                            }}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className={`flex items-center space-x-1 text-sm ${showFilterPanel ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            <Filter className="h-4 w-4" />
                            <span>筛选</span>
                        </button>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleSyncClick}
                                disabled={syncing || !selectedAccount}
                                className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400"
                            >
                                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                                <span>{syncing ? '同步中' : '同步'}</span>
                            </button>

                        </div>
                    </div>
                </div>

                {/* 筛选面板 */}
                {showFilterPanel && (
                    <div className="border-b border-gray-200 p-4 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    开始日期
                                </label>
                                <input
                                    type="date"
                                    value={filterOptions.startDate}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    结束日期
                                </label>
                                <input
                                    type="date"
                                    value={filterOptions.endDate}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    发件人
                                </label>
                                <input
                                    type="text"
                                    placeholder="筛选发件人..."
                                    value={filterOptions.fromQuery}
                                    onChange={(e) => handleFilterChange('fromQuery', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    收件人
                                </label>
                                <input
                                    type="text"
                                    placeholder="筛选收件人..."
                                    value={filterOptions.toQuery}
                                    onChange={(e) => handleFilterChange('toQuery', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    抄送
                                </label>
                                <input
                                    type="text"
                                    placeholder="筛选抄送..."
                                    value={filterOptions.ccQuery}
                                    onChange={(e) => handleFilterChange('ccQuery', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    主题
                                </label>
                                <input
                                    type="text"
                                    placeholder="筛选主题..."
                                    value={filterOptions.subjectQuery}
                                    onChange={(e) => handleFilterChange('subjectQuery', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    内容
                                </label>
                                <input
                                    type="text"
                                    placeholder="筛选邮件内容..."
                                    value={filterOptions.bodyQuery}
                                    onChange={(e) => handleFilterChange('bodyQuery', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    文件夹
                                </label>
                                <input
                                    type="text"
                                    placeholder="筛选文件夹..."
                                    value={filterOptions.mailbox}
                                    onChange={(e) => handleFilterChange('mailbox', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                onClick={resetFilters}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            >
                                重置
                            </button>
                            <button
                                onClick={applyFilters}
                                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600"
                            >
                                应用筛选
                            </button>
                        </div>
                    </div>
                )}

                {/* 邮件列表 */}
                <div
                    ref={emailsListRef}
                    className="h-[calc(100%-10rem)] overflow-y-auto"
                    onScroll={handleEmailsListScroll}
                >

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                        </div>
                    ) : emails && emails.length > 0 ? (
                        <>
                            {emails.map((email, index) => (
                                <EmailItem
                                    key={email.ID || index}
                                    email={email}
                                    selected={selectedEmail?.ID === email.ID}
                                    onSelect={setSelectedEmail}
                                />
                            ))}

                            {/* 加载状态 */}
                            {emailsLoading && (
                                <div className="flex justify-center py-3">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
                                </div>
                            )}

                            {/* 无更多数据提示 */}
                            {!emailsLoading && emails.length > 0 && !hasMoreEmails && (
                                <div className="px-3 py-2 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                    没有更多邮件
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-20 text-center text-gray-500 dark:text-gray-400">
                            暂无邮件
                        </div>
                    )}
                </div>
            </div>

            {/* 右侧邮件详情 */}
            <div className="flex-1 bg-white dark:bg-gray-800">
                <EmailDetail email={selectedEmail} />
            </div>

            {/* 同步账户模态框 */}
            {selectedAccount && (
                <SyncAccountModal
                    isOpen={showSyncModal}
                    onClose={() => setShowSyncModal(false)}
                    accountId={selectedAccount}
                    accountEmail={selectedAccountLabel}
                    onSuccess={handleSyncConfirm}
                />
            )}
        </div>
    );
}