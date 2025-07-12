'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { syncConfigService } from '@/services/sync-config.service'
import { emailAccountService } from '@/services/email-account.service'
import { Loader2, Clock, Info } from 'lucide-react'
import { EmailAccount } from '@/types'

interface CreateSyncConfigModalProps {
    isOpen: boolean
    onClose: () => void
    accountId: number
    accountEmail: string
    onSuccess?: (config: any) => void
}

// 预设的同步间隔选项（秒）
const PRESET_INTERVALS = [
    { label: '5s', value: 5 },
    { label: '10s', value: 10 },
    { label: '30s', value: 30 },
    { label: '1min', value: 60 },
    { label: '5min', value: 300 },
    { label: '1h', value: 3600 },
    { label: '1d', value: 86400 }
]

export default function CreateSyncConfigModal({
    isOpen,
    onClose,
    accountId,
    accountEmail,
    onSuccess
}: CreateSyncConfigModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [syncInterval, setSyncInterval] = useState(5)
    const [customInterval, setCustomInterval] = useState('')
    const [durationMinutes, setDurationMinutes] = useState(30)
    const [account, setAccount] = useState<EmailAccount | null>(null)
    const [loadingAccount, setLoadingAccount] = useState(false)

    // 获取账户信息
    useEffect(() => {
        if (isOpen && accountId) {
            setLoadingAccount(true)
            emailAccountService.getAccount(accountId)
                .then(accountData => {
                    setAccount(accountData)
                })
                .catch(error => {
                    console.error('获取账户信息失败:', error)
                    toast.error('获取账户信息失败')
                })
                .finally(() => {
                    setLoadingAccount(false)
                })
        }
    }, [isOpen, accountId])

    // 判断是否为Gmail OAuth2账户
    const isGmailOAuth2Account = account?.authType === 'oauth2' &&
        (account?.mailProvider?.type === 'gmail' ||
            account?.mailProvider?.name?.toLowerCase().includes('gmail'))

    // 处理预设间隔选择
    const handlePresetInterval = (interval: number) => {
        setSyncInterval(interval)
        setCustomInterval(interval.toString()) // 在自定义输入框中回显数值
    }

    // 处理自定义间隔输入
    const handleCustomIntervalChange = (value: string) => {
        // 只允许输入正整数，不允许负数和小数
        if (value !== '' && (!/^\d+$/.test(value) || parseInt(value) < 1)) {
            return // 拒绝输入负数、小数或无效字符
        }

        setCustomInterval(value)
        // 允许空值，但如果有值则必须是正整数
        if (value === '') {
            // 允许为空，但不更新 syncInterval
            return
        }
        const numValue = parseInt(value)
        if (!isNaN(numValue) && numValue >= 1) {
            setSyncInterval(numValue)
        }
    }

    // 获取当前有效的同步间隔
    const getEffectiveInterval = () => {
        if (customInterval) {
            const numValue = parseInt(customInterval)
            return !isNaN(numValue) && numValue > 0 ? numValue : syncInterval
        }
        return syncInterval
    }

    const handleSubmit = async () => {
        // 检查是否有有效的同步间隔
        if (customInterval === '' && !syncInterval) {
            toast.error('请输入同步间隔')
            return
        }

        // 验证自定义输入的值
        if (customInterval !== '') {
            const customValue = parseInt(customInterval)
            if (isNaN(customValue) || customValue < 1 || !Number.isInteger(customValue)) {
                toast.error('同步间隔必须为正整数')
                return
            }
        }

        const effectiveInterval = getEffectiveInterval()

        if (effectiveInterval < 1 || !Number.isInteger(effectiveInterval)) {
            toast.error('同步间隔必须为正整数')
            return
        }

        setIsLoading(true)
        try {
            // 创建临时同步配置，不再需要指定文件夹
            const tempConfig = await syncConfigService.createTemporarySyncConfig(accountId, {
                sync_interval: effectiveInterval,
                sync_folders: ['INBOX'], // 默认使用INBOX
                duration_minutes: durationMinutes
            })

            toast.success(`已为 ${accountEmail} 创建临时同步配置`)

            if (onSuccess) {
                onSuccess(tempConfig)
            }

            onClose()
        } catch (error: any) {
            console.error('创建同步配置失败:', error)
            toast.error(error.message || '创建同步配置失败')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>创建临时同步配置</DialogTitle>
                    <DialogDescription>
                        为邮箱 {accountEmail} 创建临时同步配置，用于邮件监听
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Gmail OAuth2 特殊提示 */}
                    {isGmailOAuth2Account && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-800 space-y-2">
                                    <div>
                                        <strong>Gmail OAuth2 账户特殊说明：</strong>
                                        <br />
                                        此账户将优先使用 Gmail API 进行轮询，提供更高效的邮件同步体验。
                                    </div>
                                    <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                                        <div className="font-medium mb-1">Gmail API 配额消耗分析：</div>
                                        <ul className="space-y-0.5">
                                            <li>• 同步算法：History API(2配额) + Messages.Get(5配额/邮件)</li>
                                            <li>• 每分钟20封邮件时：220配额，利用率仅1.47%</li>
                                            <li>• 每秒1次同步极限：每分钟可处理2976封邮件</li>
                                            <li>• 每用户每分钟限制：15,000 个配额单位</li>
                                        </ul>
                                        <div className="mt-1 text-xs text-blue-500 bg-blue-50 p-1.5 rounded">
                                            <div className="font-medium">配额计算公式：</div>
                                            <div>每次同步 = 2 + 5×新邮件数量</div>
                                            <div>极限计算：(15000-60×2)÷5 = 2976封/分钟</div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-blue-200">
                                            <a
                                                href="https://developers.google.com/workspace/gmail/api/reference/quota"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-700 hover:text-blue-800 underline text-xs"
                                            >
                                                📖 查看官方文档
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 同步间隔 */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="sync-interval" className="text-right pt-2">
                            <Clock className="inline-block w-4 h-4 mr-1" />
                            同步间隔
                        </Label>
                        <div className="col-span-3 space-y-3">
                            {/* 自定义输入和预设标签在同一行 */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">自定义:</span>
                                    <Input
                                        type="number"
                                        placeholder="秒"
                                        value={customInterval || syncInterval}
                                        onChange={(e) => handleCustomIntervalChange(e.target.value)}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">秒</span>
                                </div>

                                {/* 预设间隔标签 */}
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_INTERVALS.map(preset => (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${syncInterval === preset.value
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                }`}
                                            onClick={() => handlePresetInterval(preset.value)}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 当前有效间隔显示 */}
                            <div className="text-sm text-muted-foreground">
                                当前间隔: {getEffectiveInterval()} 秒 (请输入正整数)
                            </div>
                        </div>
                    </div>

                    {/* 有效时长 */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right">
                            有效时长
                        </Label>
                        <div className="col-span-3">
                            <Select
                                value={durationMinutes.toString()}
                                onValueChange={(value: string) => setDurationMinutes(parseInt(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 分钟</SelectItem>
                                    <SelectItem value="30">30 分钟（推荐）</SelectItem>
                                    <SelectItem value="60">1 小时</SelectItem>
                                    <SelectItem value="120">2 小时</SelectItem>
                                    <SelectItem value="240">4 小时</SelectItem>
                                    <SelectItem value="480">8 小时</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 文件夹同步说明 */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">
                            同步范围
                        </Label>
                        <div className="col-span-3">
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="text-sm text-gray-700">
                                    系统将自动同步邮箱的所有重要文件夹，包括收件箱、发件箱等。
                                    无需手动选择文件夹。
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        取消
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        创建配置
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}



