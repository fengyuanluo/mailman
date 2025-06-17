'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'react-hot-toast'
import { syncConfigService } from '@/services/sync-config.service'
import { Loader2, Clock, Folder } from 'lucide-react'

interface CreateSyncConfigModalProps {
    isOpen: boolean
    onClose: () => void
    accountId: number
    accountEmail: string
    onSuccess?: (config: any) => void
}

const DEFAULT_FOLDERS = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam']

export default function CreateSyncConfigModal({
    isOpen,
    onClose,
    accountId,
    accountEmail,
    onSuccess
}: CreateSyncConfigModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [syncInterval, setSyncInterval] = useState(5)
    const [durationMinutes, setDurationMinutes] = useState(30)
    const [selectedFolders, setSelectedFolders] = useState<string[]>(['INBOX'])

    const handleFolderToggle = (folder: string) => {
        setSelectedFolders(prev => {
            if (prev.includes(folder)) {
                return prev.filter(f => f !== folder)
            } else {
                return [...prev, folder]
            }
        })
    }

    const handleSubmit = async () => {
        if (selectedFolders.length === 0) {
            toast.error('请至少选择一个文件夹')
            return
        }

        setIsLoading(true)
        try {
            // 创建临时同步配置
            const tempConfig = await syncConfigService.createTemporarySyncConfig(accountId, {
                sync_interval: syncInterval,
                sync_folders: selectedFolders,
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
                    {/* 同步间隔 */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sync-interval" className="text-right">
                            <Clock className="inline-block w-4 h-4 mr-1" />
                            同步间隔
                        </Label>
                        <div className="col-span-3">
                            <Select
                                value={syncInterval.toString()}
                                onValueChange={(value) => setSyncInterval(parseInt(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 秒</SelectItem>
                                    <SelectItem value="3">3 秒</SelectItem>
                                    <SelectItem value="5">5 秒（推荐）</SelectItem>
                                    <SelectItem value="10">10 秒</SelectItem>
                                    <SelectItem value="30">30 秒</SelectItem>
                                    <SelectItem value="60">60 秒</SelectItem>
                                </SelectContent>
                            </Select>
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
                                onValueChange={(value) => setDurationMinutes(parseInt(value))}
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

                    {/* 同步文件夹 */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">
                            <Folder className="inline-block w-4 h-4 mr-1" />
                            同步文件夹
                        </Label>
                        <div className="col-span-3 space-y-2">
                            {DEFAULT_FOLDERS.map(folder => (
                                <div key={folder} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={folder}
                                        checked={selectedFolders.includes(folder)}
                                        onChange={() => handleFolderToggle(folder)}
                                    />
                                    <label
                                        htmlFor={folder}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {folder}
                                    </label>
                                </div>
                            ))}
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
