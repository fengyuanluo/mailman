'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Filter, Mail, Paperclip, Star, Archive, Trash2, RefreshCw, Code, X, ChevronDown, Printer } from 'lucide-react'
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
                "p-4 cursor-pointer border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                selected && "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600"
            )}
        >
            <div className="flex items-start gap-3">
                {/* 圆形图标 */}
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                    selected ? "bg-blue-500 text-white" : "bg-gray-500 dark:bg-gray-600 text-white"
                )}>
                    📧
                </div>

                {/* 邮件信息 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "font-bold text-sm truncate",
                                selected ? "text-blue-900 dark:text-blue-200" : "text-gray-900 dark:text-gray-100"
                            )}>
                                {Array.isArray(email.From) ? email.From[0] : email.From || '未知发件人'}
                            </span>
                            {email.Attachments && email.Attachments.length > 0 && (
                                <div className="bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                                    📎 {email.Attachments.length}
                                </div>
                            )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {formatDate(email.Date)}
                        </span>
                    </div>
                    <p className={cn(
                        "text-sm font-medium mb-1 truncate",
                        selected ? "text-blue-900 dark:text-blue-200" : "text-gray-900 dark:text-gray-100"
                    )}>
                        {email.Subject || '(无主题)'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {truncate(email.Body || '', 100)}
                    </p>
                </div>
            </div>
        </div>
    )
}

// 邮件详情组件
function EmailDetail({ email }: { email: Email | null }) {
    // 添加状态变量控制是否显示原始内容
    const [showRawContent, setShowRawContent] = useState(false);
    // 添加收藏状态
    const [isStarred, setIsStarred] = useState(false);

    // 检查邮件是否已收藏
    useEffect(() => {
        if (email) {
            const starredEmails = JSON.parse(localStorage.getItem('starredEmails') || '[]');
            setIsStarred(starredEmails.includes(email.ID));
        }
    }, [email]);

    // 切换收藏状态
    const toggleStar = () => {
        if (!email) return;

        const starredEmails = JSON.parse(localStorage.getItem('starredEmails') || '[]');
        let newStarredEmails;

        if (isStarred) {
            newStarredEmails = starredEmails.filter((id: number) => id !== email.ID);
        } else {
            newStarredEmails = [...starredEmails, email.ID];
        }

        localStorage.setItem('starredEmails', JSON.stringify(newStarredEmails));
        setIsStarred(!isStarred);
    };

    // 打印邮件
    const printEmail = () => {
        if (!email) return;

        const printContent = `
            <html>
                <head>
                    <title>打印邮件 - ${email.Subject || '(无主题)'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
                        .subject { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                        .info { margin-bottom: 5px; }
                        .label { font-weight: bold; }
                        .content { margin-top: 20px; line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="subject">${email.Subject || '(无主题)'}</div>
                        <div class="info"><span class="label">发件人:</span> ${Array.isArray(email.From) ? email.From.join(', ') : email.From || '未知发件人'}</div>
                        <div class="info"><span class="label">收件人:</span> ${Array.isArray(email.To) ? email.To.join(', ') : email.To || '未知收件人'}</div>
                        <div class="info"><span class="label">时间:</span> ${formatDate(email.Date)}</div>
                    </div>
                    <div class="content">
                        ${email.HTMLBody || `<pre>${email.Body || '(无内容)'}</pre>`}
                    </div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

    // 删除邮件（从当前列表中移除）
    const deleteEmail = () => {
        if (!email) return;

        if (confirm('确定要删除这封邮件吗？\n注意：这只会从当前列表中移除，不会从服务器删除。')) {
            // 触发父组件的删除逻辑
            const event = new CustomEvent('deleteEmail', { detail: { emailId: email.ID } });
            window.dispatchEvent(event);
        }
    };
    if (!email) {
        return (
            <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                选择一封邮件查看详情
            </div>
        )
    }

    return (
        <div className="h-full max-h-screen flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* 邮件详情标题栏 */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate max-w-[70%]" title={email.Subject || '(无主题)'}>
                        {email.Subject || '(无主题)'}
                    </h2>
                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                        <button
                            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isStarred
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                                : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
                                }`}
                            onClick={toggleStar}
                            title={isStarred ? "取消收藏" : "收藏邮件"}
                        >
                            <Star className={`w-4 h-4 ${isStarred ? 'text-yellow-500 fill-current' : 'text-gray-600 dark:text-gray-300'}`} />
                        </button>
                        <button
                            className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                            onClick={printEmail}
                            title="打印邮件"
                        >
                            <Printer className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        {/* 删除按钮已隐藏 */}
                        <button
                            className={`w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors ${showRawContent ? 'bg-gray-200 dark:bg-gray-500' : ''}`}
                            onClick={() => setShowRawContent(!showRawContent)}
                            title="查看原始内容"
                        >
                            <Code className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 邮件信息 */}
            <div className="px-6 py-4 space-y-2 text-sm border-b border-gray-200 dark:border-gray-600 flex-shrink-0 max-h-32 overflow-y-auto">
                <div className="flex items-start">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex-shrink-0 min-w-[60px]">发件人: </span>
                    <span className="text-gray-600 dark:text-gray-400 truncate" title={Array.isArray(email.From) ? email.From.join(', ') : email.From || '未知发件人'}>
                        {Array.isArray(email.From) ? email.From.join(', ') : email.From || '未知发件人'}
                    </span>
                </div>
                <div className="flex items-start">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex-shrink-0 min-w-[60px]">收件人: </span>
                    <span className="text-gray-600 dark:text-gray-400 truncate" title={Array.isArray(email.To) ? email.To.join(', ') : email.To || '未知收件人'}>
                        {Array.isArray(email.To) ? email.To.join(', ') : email.To || '未知收件人'}
                    </span>
                </div>
                <div className="flex items-start">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex-shrink-0 min-w-[60px]">时间: </span>
                    <span className="text-gray-600 dark:text-gray-400">{formatDate(email.Date)}</span>
                </div>
            </div>

            {/* 邮件内容 */}
            <div className="flex-1 p-6 overflow-y-auto min-h-0">
                {showRawContent ? (
                    // 显示原始邮件内容
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 overflow-auto max-h-full h-full">
                        <pre className="whitespace-pre-wrap text-xs font-mono text-gray-700 dark:text-gray-300 break-words max-w-full">
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
                    <div className="w-full h-full overflow-auto border border-gray-200 dark:border-gray-600 rounded">
                        <iframe
                            srcDoc={email.HTMLBody}
                            title="邮件内容"
                            className="w-full min-h-[400px] border-0 bg-white dark:bg-gray-800"
                            sandbox="allow-same-origin allow-popups"
                            style={{ height: '100%', maxHeight: '80vh' }}
                        />
                    </div>
                ) : (
                    <div className="overflow-auto max-h-full h-full">
                        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 break-words max-w-full">
                            {email.Body || '(无内容)'}
                        </p>
                    </div>
                )}
            </div>

            {/* 附件区域 */}
            {email.Attachments && email.Attachments.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                    <div className="mb-2">
                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
                            附件 ({email.Attachments.length}):
                        </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {email.Attachments.map((attachment, index) => (
                            <div
                                key={attachment.id || index}
                                className="bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <Paperclip className="w-4 h-4" />
                                    <span>{attachment.filename}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        ({Math.round(attachment.size / 1024)} KB)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
    const [skipAccountSelection, setSkipAccountSelection] = useState(false)
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
    const [loading, setLoading] = useState(true)
    const [accountsLoading, setAccountsLoading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showSyncModal, setShowSyncModal] = useState(false)
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [folders, setFolders] = useState<string[]>([])
    const [foldersLoading, setFoldersLoading] = useState(false)
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
            console.error('Failed to load accounts:', error)
        } finally {
            setAccountsLoading(false)
        }
    }

    const handleAccountListScroll = () => {
        if (accountListRef.current && hasMoreAccounts && !accountsLoading) {
            const { scrollTop, scrollHeight, clientHeight } = accountListRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 10) {
                console.log('账户列表触发滚动加载，当前页:', currentPage, '下一页:', currentPage + 1);
                setCurrentPage(currentPage + 1);
                loadAccounts(currentPage + 1);
            }
        }
    };

    // 加载文件夹列表
    const loadFolders = async () => {
        setFoldersLoading(true);
        try {
            const response = await emailService.getEmailFolders();
            console.log('文件夹API响应:', response);

            // 正确解析API返回的数据格式: {"count":2,"folders":["INBOX","[Gmail]/所有邮件"]}
            if (response && response.folders && Array.isArray(response.folders)) {
                setFolders(response.folders);
            } else if (response && response.data && response.data.folders && Array.isArray(response.data.folders)) {
                setFolders(response.data.folders);
            } else if (response && Array.isArray(response.data)) {
                setFolders(response.data);
            } else if (response && Array.isArray(response)) {
                setFolders(response);
            } else {
                console.warn('文件夹数据格式不正确:', response);
                setFolders(['INBOX', 'Sent', 'Drafts', 'Trash']); // 默认文件夹
            }
        } catch (error) {
            console.error('加载文件夹失败:', error);
            setFolders(['INBOX', 'Sent', 'Drafts', 'Trash']); // 默认文件夹
        } finally {
            setFoldersLoading(false);
        }
    };

    useEffect(() => {
        console.log('[EmailsTab] 首次加载组件时运行初始化逻辑');

        // 加载文件夹列表
        loadFolders();

        // 优先从LocalStorage获取保存的账户信息
        const savedAccount = getAccountFromStorage();

        if (savedAccount) {
            console.log('[EmailsTab] 从localStorage获取到账户信息:', savedAccount);
            setSelectedAccount(savedAccount.id);
            setSelectedAccountLabel(savedAccount.email);
            // 设置跳过账户选择的标记，避免loadAccounts覆盖这个设置
            setSkipAccountSelection(true);
        } else {
            // 没有保存的账户，默认加载所有邮件
            console.log('[EmailsTab] 没有保存的账户，默认加载所有邮件');
            loadEmails(1, true);
        }

        // 设置2秒延迟，然后加载账户列表
        const timer = setTimeout(() => {
            console.log('[EmailsTab] 2秒延迟后加载账户列表');
            loadAccounts(1, true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    const searchEmailsByToQuery = async (email: string, page = 1, isInitialLoad = false) => {
        console.log('🔍 使用邮箱地址搜索邮件:', email, 'page:', page);

        if (isInitialLoad) {
            setLoading(true);
        } else {
            setEmailsLoading(true);
        }

        try {
            const limit = 20;
            const offset = (page - 1) * limit;

            // 搜索发送给指定邮箱的邮件
            const params: EmailSearchParams = {
                limit: limit,
                offset: offset,
                sort_by: 'date_desc',
                to_query: email // 使用to_query参数搜索收件人
            };

            console.log('邮箱搜索参数:', params);

            // 调用搜索API
            const response = await emailService.getAllEmails(params);
            console.log('邮箱搜索API响应:', response);

            let emailsData = null;

            if (response && typeof response === 'object') {
                // 根据不同的响应结构处理数据
                if (response.emails) {
                    emailsData = response.emails; // 如果response有emails字段
                } else if (response.data) {
                    emailsData = response.data; // 如果response有data字段
                } else if (Array.isArray(response)) {
                    emailsData = response; // 如果response本身就是数组
                } else {
                    console.warn('无法识别的响应格式:', response);
                    emailsData = [];
                }

                console.log('提取的邮件数据:', emailsData);

                // 数据后处理
                if (emailsData && Array.isArray(emailsData)) {
                    // 辅助函数：递归查找数组字段
                    const findArray = (obj: any, path = ''): any[] | null => {
                        if (Array.isArray(obj)) {
                            console.log(`找到数组字段 ${path}:`, obj);
                            return obj;
                        }
                        if (obj && typeof obj === 'object') {
                            for (const [key, value] of Object.entries(obj)) {
                                const result = findArray(value, path ? `${path}.${key}` : key);
                                if (result) return result;
                            }
                        }
                        return null;
                    };

                    // 处理每个邮件对象，确保From、To等字段是数组
                    const processedEmails = emailsData.map((email: any) => ({
                        ...email,
                        From: findArray(email.From) || [email.From].filter(Boolean),
                        To: findArray(email.To) || [email.To].filter(Boolean),
                        Cc: findArray(email.Cc) || (email.Cc ? [email.Cc] : []),
                        Bcc: findArray(email.Bcc) || (email.Bcc ? [email.Bcc] : [])
                    }));

                    console.log('处理后的邮件数据:', processedEmails);

                    if (isInitialLoad || page === 1) {
                        setEmails(processedEmails);
                        setEmailsCurrentPage(1);
                    } else {
                        setEmails(prev => [...prev, ...processedEmails]);
                        setEmailsCurrentPage(page);
                    }

                    setHasMoreEmails(processedEmails.length >= limit);

                    // 如果有邮件，自动选择第一封
                    if (processedEmails.length > 0 && isInitialLoad) {
                        setSelectedEmail(processedEmails[0]);
                    }

                    console.log(`✅ 邮箱搜索成功，找到 ${processedEmails.length} 封邮件`);
                } else {
                    console.warn('邮件数据不是数组:', emailsData);
                    if (isInitialLoad) {
                        setEmails([]);
                    }
                    setHasMoreEmails(false);
                }
            } else {
                console.warn('无效的API响应:', response);
                if (isInitialLoad) {
                    setEmails([]);
                }
                setHasMoreEmails(false);
            }
        } catch (error) {
            console.error('邮箱搜索失败:', error);
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
    };

    const handleFilterChange = (field: string, value: string) => {
        setFilterOptions(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const applyFilters = () => {
        // 检查是否在邮箱搜索模式
        if (isEmailSearchMode && emailSearchTarget) {
            console.log('应用筛选 - 邮箱搜索模式，目标邮箱:', emailSearchTarget);
            // 在邮箱搜索模式下，使用特殊的搜索逻辑
            searchEmailsByToQuery(emailSearchTarget, 1, true);
        } else if (selectedAccount) {
            console.log('应用筛选 - 账户模式，选中账户:', selectedAccount);
            // 构建筛选参数
            const filterParams: EmailSearchParams = {
                limit: 20,
                offset: 0,
                sort_by: 'date_desc'
            }

            // 添加各种筛选条件
            if (filterOptions.startDate) filterParams.start_date = filterOptions.startDate
            if (filterOptions.endDate) filterParams.end_date = filterOptions.endDate
            if (filterOptions.fromQuery) filterParams.from_query = filterOptions.fromQuery
            if (filterOptions.toQuery) filterParams.to_query = filterOptions.toQuery
            if (filterOptions.ccQuery) filterParams.cc_query = filterOptions.ccQuery
            if (filterOptions.subjectQuery) filterParams.subject_query = filterOptions.subjectQuery
            if (filterOptions.bodyQuery) filterParams.body_query = filterOptions.bodyQuery
            if (filterOptions.mailbox) filterParams.mailbox = filterOptions.mailbox
            if (searchQuery) filterParams.keyword = searchQuery

            setLoading(true)
            emailService.getEmails(selectedAccount, filterParams)
                .then(response => {
                    processEmailsResponse(response, true)
                })
                .catch(error => {
                    console.error('Failed to apply filters:', error)
                    setEmails([])
                })
                .finally(() => {
                    setLoading(false)
                })
        } else {
            console.log('应用筛选 - 全局模式');
            // 全局搜索，传递所有筛选参数
            const filterParams: EmailSearchParams = {
                limit: 20,
                offset: 0,
                sort_by: 'date_desc'
            }

            // 添加各种筛选条件
            if (filterOptions.startDate) filterParams.start_date = filterOptions.startDate
            if (filterOptions.endDate) filterParams.end_date = filterOptions.endDate
            if (filterOptions.fromQuery) filterParams.from_query = filterOptions.fromQuery
            if (filterOptions.toQuery) filterParams.to_query = filterOptions.toQuery
            if (filterOptions.ccQuery) filterParams.cc_query = filterOptions.ccQuery
            if (filterOptions.subjectQuery) filterParams.subject_query = filterOptions.subjectQuery
            if (filterOptions.bodyQuery) filterParams.body_query = filterOptions.bodyQuery
            if (filterOptions.mailbox) filterParams.mailbox = filterOptions.mailbox
            if (searchQuery) filterParams.keyword = searchQuery

            console.log('全局搜索筛选参数:', filterParams);

            setLoading(true)
            emailService.getAllEmails(filterParams)
                .then(response => {
                    processEmailsResponse(response, true)
                })
                .catch(error => {
                    console.error('Failed to apply global filters:', error)
                    setEmails([])
                })
                .finally(() => {
                    setLoading(false)
                })
        }

        // 关闭筛选面板
        setShowFilterPanel(false)
        setEmailsCurrentPage(1)
        setHasMoreEmails(true)
    }

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
        setSearchQuery('')
        setIsEmailSearchMode(false)
        setEmailSearchTarget(null)
        loadEmails(1, true)
    }

    const processEmailsResponse = (response: any, isInitialLoad = false) => {
        console.log('处理邮件API响应:', response);

        let emailsData = null;

        if (response && typeof response === 'object') {
            // 根据不同的响应结构处理数据
            if (response.emails) {
                emailsData = response.emails; // 如果response有emails字段
            } else if (response.data) {
                emailsData = response.data; // 如果response有data字段
            } else if (Array.isArray(response)) {
                emailsData = response; // 如果response本身就是数组
            } else {
                console.warn('无法识别的响应格式:', response);
                emailsData = [];
            }

            console.log('提取的邮件数据:', emailsData);

            // 数据后处理
            if (emailsData && Array.isArray(emailsData)) {
                // 处理每个邮件对象，确保From、To等字段是数组
                const processedEmails = emailsData.map((email: any) => ({
                    ...email,
                    From: Array.isArray(email.From) ? email.From : [email.From].filter(Boolean),
                    To: Array.isArray(email.To) ? email.To : [email.To].filter(Boolean),
                    Cc: Array.isArray(email.Cc) ? email.Cc : (email.Cc ? [email.Cc] : []),
                    Bcc: Array.isArray(email.Bcc) ? email.Bcc : (email.Bcc ? [email.Bcc] : [])
                }));

                if (isInitialLoad) {
                    setEmails(processedEmails);
                    setEmailsCurrentPage(1);
                } else {
                    setEmails(prev => [...prev, ...processedEmails]);
                }

                // 如果有邮件且是初始加载，自动选择第一封
                if (processedEmails.length > 0 && isInitialLoad) {
                    setSelectedEmail(processedEmails[0]);
                }
            } else {
                console.warn('邮件数据不是数组:', emailsData);
            }
        }
    };

    const loadEmails = useCallback(async (page = 1, isInitialLoad = false) => {
        console.log('[loadEmails] 开始加载邮件，page:', page, 'isInitialLoad:', isInitialLoad);
        console.log('[loadEmails] 当前状态 - selectedAccount:', selectedAccount, 'isEmailSearchMode:', isEmailSearchMode, 'emailSearchTarget:', emailSearchTarget);

        // 检查是否在邮箱搜索模式
        if (isEmailSearchMode && emailSearchTarget) {
            console.log('[loadEmails] 当前在邮箱搜索模式，调用searchEmailsByToQuery');
            searchEmailsByToQuery(emailSearchTarget, page, isInitialLoad);
            return;
        }

        if (isInitialLoad) {
            setLoading(true);
        } else {
            setEmailsLoading(true);
        }

        try {
            const limit = 20;
            const offset = (page - 1) * limit;

            let response;
            const params = {
                limit: limit,
                offset: offset,
                sort_by: 'date_desc',
                keyword: searchQuery || undefined
            };

            if (selectedAccount) {
                console.log('[loadEmails] 使用选中账户加载邮件:', selectedAccount);
                response = await emailService.getEmails(selectedAccount, params);
            } else {
                console.log('[loadEmails] 使用全局模式加载邮件');
                response = await emailService.getAllEmails(params);
            }

            let emailsData = null;

            if (response && typeof response === 'object') {
                // 根据不同的响应结构处理数据
                if (response.emails) {
                    emailsData = response.emails; // 如果response有emails字段
                } else if (response.data) {
                    emailsData = response.data; // 如果response有data字段
                } else if (Array.isArray(response)) {
                    emailsData = response; // 如果response本身就是数组
                } else {
                    console.warn('无法识别的响应格式:', response);
                    emailsData = [];
                }

                // 数据后处理
                if (emailsData && Array.isArray(emailsData)) {
                    // 处理每个邮件对象，确保From、To等字段是数组
                    const processedEmails = emailsData.map((email: any) => ({
                        ...email,
                        From: Array.isArray(email.From) ? email.From : [email.From].filter(Boolean),
                        To: Array.isArray(email.To) ? email.To : [email.To].filter(Boolean),
                        Cc: Array.isArray(email.Cc) ? email.Cc : (email.Cc ? [email.Cc] : []),
                        Bcc: Array.isArray(email.Bcc) ? email.Bcc : (email.Bcc ? [email.Bcc] : [])
                    }));

                    console.log('[loadEmails] 处理后的邮件数据:', processedEmails.length, '条');

                    if (isInitialLoad || page === 1) {
                        setEmails(processedEmails);
                        setEmailsCurrentPage(1);
                    } else {
                        setEmails(prev => [...prev, ...processedEmails]);
                        setEmailsCurrentPage(page);
                    }

                    setHasMoreEmails(processedEmails.length >= limit);

                    // 如果有邮件且是初始加载，自动选择第一封
                    if (processedEmails.length > 0 && isInitialLoad) {
                        setSelectedEmail(processedEmails[0]);
                    }
                } else {
                    console.warn('[loadEmails] 邮件数据不是数组:', emailsData);
                    if (isInitialLoad) {
                        setEmails([]);
                    }
                    setHasMoreEmails(false);
                }
            } else {
                console.warn('[loadEmails] 无效的API响应:', response);
                if (isInitialLoad) {
                    setEmails([]);
                }
                setHasMoreEmails(false);
            }
        } catch (error) {
            console.error('[loadEmails] 加载邮件失败:', error);
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
    }, [selectedAccount, searchQuery, isEmailSearchMode, emailSearchTarget]);

    const handleEmailsListScroll = () => {
        if (emailsListRef.current && hasMoreEmails && !emailsLoading) {
            const { scrollTop, scrollHeight, clientHeight } = emailsListRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 10) {
                loadEmails(emailsCurrentPage + 1);
            }
        }
    };

    useEffect(() => {
        // 当选中账户改变时，重新加载邮件
        if (selectedAccount !== null) {
            console.log('[useEffect] selectedAccount 改变，重新加载邮件:', selectedAccount);
            // 重置邮箱搜索模式
            setIsEmailSearchMode(false);
            setEmailSearchTarget(null);
            loadEmails(1, true);
        }
    }, [selectedAccount, loadEmails]);

    // 添加点击外部关闭下拉框的逻辑
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.account-dropdown')) {
                setAccountDropdownOpen(false);
            }
        };

        // 处理删除邮件事件
        const handleDeleteEmail = (e: CustomEvent) => {
            const { emailId } = e.detail;
            setEmails(prevEmails => prevEmails.filter(email => email.ID !== emailId));
            // 如果删除的是当前选中的邮件，清除选中状态
            if (selectedEmail && selectedEmail.ID === emailId) {
                setSelectedEmail(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('deleteEmail', handleDeleteEmail as EventListener);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('deleteEmail', handleDeleteEmail as EventListener);
        };
    }, [selectedEmail]);

    // 当搜索查询改变时，加载邮件
    useEffect(() => {
        if (selectedAccount !== null || isEmailSearchMode) {
            loadEmails(1, true);
        }
    }, [searchQuery, loadEmails, selectedAccount, isEmailSearchMode]);

    // 监听账户列表变化，在找到账户时触发相应逻辑
    useEffect(() => {
        // 检查是否有待处理的账户选择
        const pendingAccountId = (window as any).__pendingSelectedAccountId;
        if (pendingAccountId && accounts.length > 0) {
            const account = accounts.find(acc => acc.id === pendingAccountId);
            if (account) {
                console.log('[useEffect] 在新的账户列表中找到待选择的账户:', account.emailAddress);
                setSelectedAccount(pendingAccountId);
                setSelectedAccountLabel(account.emailAddress);
                delete (window as any).__pendingSelectedAccountId;
            }
        }
    }, [accounts]);

    const loadAllAccountsForSelection = async (targetAccountId: number) => {
        console.log('[loadAllAccountsForSelection] 尝试加载所有账户以找到目标账户:', targetAccountId);
        try {
            let allAccounts: EmailAccount[] = [];
            let currentPage = 1;
            let hasMore = true;

            while (hasMore) {
                const response = await emailAccountService.getAccountsPaginated({
                    page: currentPage,
                    limit: 50, // 使用较大的限制以减少请求次数
                    search: ''
                });

                const pageAccounts = response.data;
                allAccounts = [...allAccounts, ...pageAccounts];

                // 检查是否找到目标账户
                const targetAccount = pageAccounts.find(acc => acc.id === targetAccountId);
                if (targetAccount) {
                    console.log('[loadAllAccountsForSelection] 找到目标账户:', targetAccount.emailAddress);
                    setAccounts(prev => {
                        // 去重合并
                        const existingIds = new Set(prev.map(acc => acc.id));
                        const newAccounts = allAccounts.filter(acc => !existingIds.has(acc.id));
                        return [...prev, ...newAccounts];
                    });
                    setSelectedAccount(targetAccount.id);
                    setSelectedAccountLabel(targetAccount.emailAddress);
                    return;
                }

                hasMore = pageAccounts.length > 0 && currentPage < (response.total_pages || 1);
                currentPage++;
            }

            // 如果遍历完所有账户都没找到，设置一个全局变量用于后续处理
            console.warn('[loadAllAccountsForSelection] 未找到目标账户ID:', targetAccountId);
            (window as any).__pendingSelectedAccountId = targetAccountId;

        } catch (error) {
            console.error('[loadAllAccountsForSelection] 加载账户失败:', error);
        }
    };

    const handleSyncClick = () => {
        if (!selectedAccount) return;
        setShowSyncModal(true);
    };


    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* 统一筛选区域 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg mx-5 mt-5 mb-4 p-4">
                {/* 第一行：账户选择 + 快速筛选标签 + 同步按钮 */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        {/* 账户选择 */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">账户:</span>
                            <div className="relative account-dropdown">
                                <div
                                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-100 min-w-[200px] cursor-pointer flex items-center justify-between"
                                    onClick={() => {
                                        setAccountDropdownOpen(!accountDropdownOpen);
                                        if (!accountDropdownOpen) {
                                            setCurrentPage(1);
                                            loadAccounts(1, true);
                                        }
                                    }}
                                >
                                    <span>{selectedAccountLabel || '所有账户'}</span>
                                    <div className="flex items-center gap-1">
                                        {selectedAccount && (
                                            <button
                                                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedAccount(null);
                                                    setSelectedAccountLabel('');
                                                    setAccountSearchQuery('');
                                                    clearAccountFromStorage();
                                                    setIsEmailSearchMode(false);
                                                    setEmailSearchTarget(null);
                                                    // 加载所有邮件
                                                    loadEmails(1, true);
                                                }}
                                                title="清空选择"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    </div>
                                </div>

                                {accountDropdownOpen && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                            <input
                                                type="text"
                                                placeholder="搜索账户..."
                                                value={accountSearchQuery}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setAccountSearchQuery(value);

                                                    // 防抖搜索
                                                    if (accountSearchDebounceTimer.current) {
                                                        clearTimeout(accountSearchDebounceTimer.current);
                                                    }

                                                    accountSearchDebounceTimer.current = setTimeout(() => {
                                                        console.log('防抖搜索触发，搜索词:', value);
                                                        setCurrentPage(1);
                                                        loadAccounts(1, true);
                                                    }, 300);
                                                }}
                                            />
                                        </div>

                                        <div
                                            ref={accountListRef}
                                            className="max-h-60 overflow-y-auto"
                                            onScroll={handleAccountListScroll}
                                        >
                                            {/* 所有账户选项 */}
                                            <div
                                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm font-medium text-blue-600 dark:text-blue-400"
                                                onClick={() => {
                                                    setSelectedAccount(null);
                                                    setSelectedAccountLabel('');
                                                    setAccountDropdownOpen(false);
                                                    setAccountSearchQuery('');
                                                    clearAccountFromStorage();
                                                    setIsEmailSearchMode(false);
                                                    setEmailSearchTarget(null);
                                                    // 加载所有邮件
                                                    loadEmails(1, true);
                                                }}
                                            >
                                                📨 所有账户
                                            </div>

                                            {accounts.length > 0 ? (
                                                accounts.map((account) => (
                                                    <div
                                                        key={account.id}
                                                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                                                        onClick={() => {
                                                            setSelectedAccount(account.id);
                                                            setSelectedAccountLabel(account.emailAddress);
                                                            setAccountDropdownOpen(false);
                                                            setAccountSearchQuery('');
                                                            saveAccountToStorage(account.id, account.emailAddress);
                                                            setIsEmailSearchMode(false);
                                                            setEmailSearchTarget(null);
                                                        }}
                                                    >
                                                        {account.emailAddress}
                                                    </div>
                                                ))
                                            ) : !accountsLoading ? (
                                                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                    没有找到账户
                                                </div>
                                            ) : null}

                                            {accountsLoading && (
                                                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                    加载中...
                                                </div>
                                            )}

                                            {hasMoreAccounts && !accountsLoading && (
                                                <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 text-center">
                                                    向下滚动加载更多...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 快速筛选标签 */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">文件夹:</span>
                            <div className="flex gap-1.5 flex-wrap">
                                {foldersLoading ? (
                                    <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                                        加载文件夹中...
                                    </div>
                                ) : (
                                    <>
                                        {/* 全部邮件按钮 */}
                                        <button
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                                !filterOptions.mailbox
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            )}
                                            onClick={() => {
                                                handleFilterChange('mailbox', '');
                                                applyFilters();
                                            }}
                                        >
                                            📨 全部
                                        </button>

                                        {/* 动态文件夹按钮 */}
                                        {folders.map((folderName) => {
                                            // 为文件夹添加合适的图标
                                            const getFolderIcon = (name: string) => {
                                                const lowerName = name.toLowerCase();
                                                if (lowerName.includes('inbox') || lowerName.includes('收件')) return '📥';
                                                if (lowerName.includes('sent') || lowerName.includes('已发')) return '📤';
                                                if (lowerName.includes('draft') || lowerName.includes('草稿')) return '📝';
                                                if (lowerName.includes('trash') || lowerName.includes('垃圾') || lowerName.includes('deleted')) return '🗑️';
                                                if (lowerName.includes('spam') || lowerName.includes('垃圾邮件')) return '🚫';
                                                if (lowerName.includes('junk')) return '📂';
                                                return '📁';
                                            };

                                            return (
                                                <button
                                                    key={folderName}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                                        filterOptions.mailbox === folderName
                                                            ? "bg-blue-500 text-white"
                                                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    )}
                                                    onClick={() => {
                                                        handleFilterChange('mailbox', folderName);
                                                        applyFilters();
                                                    }}
                                                >
                                                    {getFolderIcon(folderName)} {folderName}
                                                </button>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 同步按钮 - 只有选择了账户时才显示 */}
                    {selectedAccount && (
                        <button
                            className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            onClick={handleSyncClick}
                            disabled={syncing}
                        >
                            {syncing ? '同步中...' : '🔄 同步'}
                        </button>
                    )}
                </div>

                {/* 第二行：搜索框 + 高级筛选 + 活跃筛选指示器 */}
                <div className="flex items-center gap-3">
                    {/* 搜索框 */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">搜索:</span>
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                                type="text"
                                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-10 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 w-80"
                                placeholder="搜索邮件内容、主题、发件人..."
                                value={searchQuery}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearchQuery(value);

                                    // 防抖搜索
                                    if (searchDebounceTimer.current) {
                                        clearTimeout(searchDebounceTimer.current);
                                    }

                                    searchDebounceTimer.current = setTimeout(() => {
                                        console.log('邮件搜索防抖触发，搜索词:', value);

                                        // 检查是否是邮箱格式
                                        const isEmail = isValidEmail(value);
                                        console.log('输入是否为邮箱格式:', isEmail);

                                        if (isEmail && value.trim()) {
                                            // 如果是邮箱格式，切换到邮箱搜索模式
                                            console.log('🔄 切换到邮箱搜索模式，目标邮箱:', value);
                                            setIsEmailSearchMode(true);
                                            setEmailSearchTarget(value.trim());
                                            searchEmailsByToQuery(value.trim(), 1, true);
                                        } else {
                                            // 否则使用常规搜索
                                            console.log('使用常规搜索模式');
                                            setIsEmailSearchMode(false);
                                            setEmailSearchTarget(null);
                                            if (selectedAccount) {
                                                loadEmails(1, true);
                                            } else {
                                                // 全局搜索
                                                emailService.getAllEmails({
                                                    limit: 20,
                                                    offset: 0,
                                                    sort_by: 'date_desc',
                                                    keyword: value || undefined
                                                })
                                                    .then(response => {
                                                        processEmailsResponse(response, true);
                                                    })
                                                    .catch(error => {
                                                        console.error('全局搜索失败:', error);
                                                        setEmails([]);
                                                    });
                                            }
                                        }
                                    }, 500); // 增加防抖延迟到500ms
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const value = searchQuery.trim();
                                        if (value) {
                                            const isEmail = isValidEmail(value);
                                            if (isEmail) {
                                                console.log('回车键触发邮箱搜索:', value);
                                                setIsEmailSearchMode(true);
                                                setEmailSearchTarget(value);
                                                searchEmailsByToQuery(value, 1, true);
                                            } else {
                                                console.log('回车键触发常规搜索:', value);
                                                setIsEmailSearchMode(false);
                                                setEmailSearchTarget(null);
                                                if (selectedAccount) {
                                                    loadEmails(1, true);
                                                } else {
                                                    emailService.getAllEmails({
                                                        limit: 20,
                                                        offset: 0,
                                                        sort_by: 'date_desc',
                                                        keyword: value
                                                    })
                                                        .then(response => {
                                                            processEmailsResponse(response, true);
                                                        })
                                                        .catch(error => {
                                                            console.error('全局搜索失败:', error);
                                                            setEmails([]);
                                                        });
                                                }
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>

                        {/* 搜索按钮 */}
                        <button
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
                            onClick={() => {
                                const value = searchQuery.trim();
                                console.log('手动触发搜索，搜索词:', value);

                                // 检查是否是邮箱格式
                                const isEmail = isValidEmail(value);

                                if (isEmail && value) {
                                    console.log('🔄 手动触发邮箱搜索模式，目标邮箱:', value);
                                    setIsEmailSearchMode(true);
                                    setEmailSearchTarget(value);
                                    searchEmailsByToQuery(value, 1, true);
                                } else {
                                    console.log('手动触发常规搜索模式');
                                    setIsEmailSearchMode(false);
                                    setEmailSearchTarget(null);
                                    if (selectedAccount) {
                                        loadEmails(1, true);
                                    } else {
                                        // 全局搜索，应用所有筛选条件
                                        const searchParams = {
                                            limit: 20,
                                            offset: 0,
                                            sort_by: 'date_desc',
                                            keyword: value || undefined,
                                            // 应用筛选条件
                                            mailbox: filterOptions.mailbox || undefined,
                                            sender: filterOptions.fromQuery || undefined,
                                            subject: filterOptions.subjectQuery || undefined,
                                            body: filterOptions.bodyQuery || undefined,
                                            to: filterOptions.toQuery || undefined,
                                            cc: filterOptions.ccQuery || undefined,
                                            start_date: filterOptions.startDate || undefined,
                                            end_date: filterOptions.endDate || undefined
                                        };

                                        console.log('手动搜索参数:', searchParams);

                                        emailService.getAllEmails(searchParams)
                                            .then(response => {
                                                processEmailsResponse(response, true);
                                            })
                                            .catch(error => {
                                                console.error('手动搜索失败:', error);
                                                setEmails([]);
                                            });
                                    }
                                }
                            }}
                        >
                            🔍 搜索
                        </button>
                    </div>

                    {/* 高级筛选按钮 */}
                    <button
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                    >
                        🔧 高级筛选
                    </button>

                    {/* 活跃筛选指示器 */}
                    <div className="flex gap-2">
                        {(filterOptions.startDate || filterOptions.endDate) && (
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-600 px-3 py-2 rounded text-xs font-medium flex items-center gap-2">
                                <span>📅 {filterOptions.startDate && filterOptions.endDate
                                    ? `${filterOptions.startDate} 至 ${filterOptions.endDate}`
                                    : filterOptions.startDate
                                        ? `从 ${filterOptions.startDate}`
                                        : `到 ${filterOptions.endDate}`}</span>
                                <button
                                    className="hover:text-red-600 dark:hover:text-red-400"
                                    onClick={() => {
                                        handleFilterChange('startDate', '');
                                        handleFilterChange('endDate', '');
                                        applyFilters();
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        {filterOptions.fromQuery && (
                            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-600 px-3 py-2 rounded text-xs font-medium flex items-center gap-2">
                                <span>发件人: {filterOptions.fromQuery}</span>
                                <button
                                    className="hover:text-red-600 dark:hover:text-red-400"
                                    onClick={() => {
                                        handleFilterChange('fromQuery', '');
                                        applyFilters();
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 高级筛选面板 */}
            {showFilterPanel && (
                <div className="mx-5 mb-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">高级筛选选项</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">开始日期</label>
                            <input
                                type="date"
                                value={filterOptions.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">结束日期</label>
                            <input
                                type="date"
                                value={filterOptions.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">发件人</label>
                            <input
                                type="text"
                                value={filterOptions.fromQuery}
                                onChange={(e) => handleFilterChange('fromQuery', e.target.value)}
                                placeholder="输入发件人邮箱或关键词..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">收件人</label>
                            <input
                                type="text"
                                value={filterOptions.toQuery}
                                onChange={(e) => handleFilterChange('toQuery', e.target.value)}
                                placeholder="输入收件人邮箱或关键词..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">抄送</label>
                            <input
                                type="text"
                                value={filterOptions.ccQuery}
                                onChange={(e) => handleFilterChange('ccQuery', e.target.value)}
                                placeholder="输入抄送邮箱或关键词..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">主题</label>
                            <input
                                type="text"
                                value={filterOptions.subjectQuery}
                                onChange={(e) => handleFilterChange('subjectQuery', e.target.value)}
                                placeholder="输入主题关键词..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">正文</label>
                            <input
                                type="text"
                                value={filterOptions.bodyQuery}
                                onChange={(e) => handleFilterChange('bodyQuery', e.target.value)}
                                placeholder="输入正文关键词..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">邮箱文件夹</label>
                            <select
                                value={filterOptions.mailbox}
                                onChange={(e) => handleFilterChange('mailbox', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">所有文件夹</option>
                                <option value="INBOX">收件箱</option>
                                <option value="Sent">已发送</option>
                                <option value="Drafts">草稿</option>
                                <option value="Trash">垃圾箱</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
                            onClick={applyFilters}
                        >
                            应用筛选
                        </button>
                        <button
                            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
                            onClick={resetFilters}
                        >
                            重置
                        </button>
                        <button
                            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            onClick={() => setShowFilterPanel(false)}
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}

            {/* 主要内容区域 - 左右分栏 */}
            <div className="flex-1 flex mx-5 mb-5 gap-5 min-h-0 max-h-[calc(100vh-360px)]">
                {/* 左侧邮件列表 */}
                <div className="w-2/5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-gray-900 dark:text-gray-100">
                                📋 邮件列表 {isEmailSearchMode && emailSearchTarget && (
                                    <span className="text-sm font-normal text-blue-600 dark:text-blue-400">
                                        (搜索: {emailSearchTarget})
                                    </span>
                                )}
                            </h2>
                            {emails.length > 0 && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    共 {emails.length} 封邮件
                                </p>
                            )}
                        </div>
                    </div>

                    <div
                        ref={emailsListRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden"
                        onScroll={handleEmailsListScroll}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="text-gray-500 dark:text-gray-400">加载中...</div>
                            </div>
                        ) : emails.length > 0 ? (
                            emails.map((email) => (
                                <EmailItem
                                    key={email.ID}
                                    email={email}
                                    selected={selectedEmail?.ID === email.ID}
                                    onSelect={setSelectedEmail}
                                />
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-32">
                                <div className="text-gray-500 dark:text-gray-400">
                                    {isEmailSearchMode
                                        ? `没有找到发给 ${emailSearchTarget} 的邮件`
                                        : '没有邮件'
                                    }
                                </div>
                            </div>
                        )}

                        {emailsLoading && (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                加载更多邮件...
                            </div>
                        )}
                    </div>
                </div>

                {/* 右侧邮件详情 */}
                <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-w-[60%] min-w-[400px] overflow-hidden">
                    <EmailDetail email={selectedEmail} />
                </div>
            </div>

            {/* 同步确认模态框 */}
            {showSyncModal && (
                <SyncAccountModal
                    isOpen={showSyncModal}
                    onClose={() => setShowSyncModal(false)}
                    accountId={selectedAccount}
                    accountEmail={selectedAccountLabel}
                    onSuccess={() => {
                        setEmailsCurrentPage(1);
                        setHasMoreEmails(true);
                        loadEmails(1, true);
                    }}
                    onError={(error) => {
                        console.error('同步失败:', error);
                        alert('同步失败: ' + error);
                    }}
                />
            )}
        </div>
    )
}


