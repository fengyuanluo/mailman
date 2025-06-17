'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { triggerService } from '@/services/trigger.service'

interface CreateTriggerModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    trigger?: any
}

export default function CreateTriggerModal({ isOpen, onClose, onSuccess, trigger }: CreateTriggerModalProps) {
    const [triggerName, setTriggerName] = useState('')
    const [description, setDescription] = useState('')
    const [enabled, setEnabled] = useState(true)
    const [executionOrder, setExecutionOrder] = useState(1)

    // 邮件过滤条件
    const [senderEmail, setSenderEmail] = useState('')
    const [subject, setSubject] = useState('')
    const [senderName, setSenderName] = useState('')
    const [recipientName, setRecipientName] = useState('')
    const [hasAttachment, setHasAttachment] = useState(false)
    const [noAttachment, setNoAttachment] = useState(false)
    const [folderTypes, setFolderTypes] = useState<string[]>(['INBOX'])

    // 触发条件
    const [conditionType, setConditionType] = useState('JavaScript')
    const [conditionScript, setConditionScript] = useState(`// 触发条件示例
// 返回 true 表示满足触发条件
function shouldTrigger(email) {
    // 检查邮件主题是否包含特定关键词
    if (email.subject && email.subject.includes('重要')) {
        return true;
    }
    
    // 检查发件人
    if (email.sender && email.sender.includes('admin@')) {
        return true;
    }
    
    return false;
}`)

    // 触发动作
    const [actions, setActions] = useState([{
        name: '',
        type: '内容修改',
        config: `// 动作配置示例
function executeAction(email) {
    // 在这里定义具体的动作逻辑
    console.log('处理邮件:', email.subject);
    
    // 返回处理结果
    return {
        success: true,
        message: '邮件处理完成'
    };
}`,
        enabled: true
    }])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (trigger) {
            setTriggerName(trigger.name || '')
            setDescription(trigger.description || '')
            setEnabled(trigger.enabled !== false)
            setExecutionOrder(trigger.execution_order || 1)

            // 解析过滤条件
            const filters = trigger.email_filters || {}
            setSenderEmail(filters.sender_email || '')
            setSubject(filters.subject || '')
            setSenderName(filters.sender_name || '')
            setRecipientName(filters.recipient_name || '')
            setHasAttachment(filters.has_attachment || false)
            setNoAttachment(filters.no_attachment || false)
            setFolderTypes(filters.folder_types || ['INBOX'])

            setConditionType(trigger.condition_type || 'JavaScript')
            setConditionScript(trigger.condition_script || '')

            // 解析动作
            if (trigger.actions && trigger.actions.length > 0) {
                setActions(trigger.actions)
            }
        } else {
            // 重置表单
            setTriggerName('')
            setDescription('')
            setEnabled(true)
            setExecutionOrder(1)
            setSenderEmail('')
            setSubject('')
            setSenderName('')
            setRecipientName('')
            setHasAttachment(false)
            setNoAttachment(false)
            setFolderTypes(['INBOX'])
            setConditionType('JavaScript')
            setConditionScript(`// 触发条件示例
// 返回 true 表示满足触发条件
function shouldTrigger(email) {
    // 检查邮件主题是否包含特定关键词
    if (email.subject && email.subject.includes('重要')) {
        return true;
    }
    
    // 检查发件人
    if (email.sender && email.sender.includes('admin@')) {
        return true;
    }
    
    return false;
}`)
            setActions([{
                name: '',
                type: '内容修改',
                config: `// 动作配置示例
function executeAction(email) {
    // 在这里定义具体的动作逻辑
    console.log('处理邮件:', email.subject);
    
    // 返回处理结果
    return {
        success: true,
        message: '邮件处理完成'
    };
}`,
                enabled: true
            }])
        }
        setError('')
    }, [trigger, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            if (trigger) {
                // 更新触发器
                const updatePayload = {
                    id: trigger.id,
                    name: triggerName,
                    description,
                    status: enabled ? 'enabled' as const : 'disabled' as const,
                    check_interval: 60, // 默认60秒检查间隔
                    email_address: senderEmail,
                    subject,
                    from: senderName,
                    to: recipientName,
                    has_attachment: hasAttachment,
                    folders: folderTypes,
                    condition: {
                        type: conditionType.toLowerCase(),
                        script: conditionScript,
                        timeout: 30
                    },
                    actions: actions.map((action, index) => ({
                        type: action.type === '内容修改' ? 'modify_content' as const : 'smtp' as const,
                        name: action.name || `动作${index + 1}`,
                        description: action.name,
                        config: action.config,
                        enabled: action.enabled,
                        order: index + 1
                    })),
                    enable_logging: true
                }
                await triggerService.updateTrigger(trigger.id, updatePayload)
            } else {
                // 创建触发器
                const createPayload = {
                    name: triggerName,
                    description,
                    status: enabled ? 'enabled' as const : 'disabled' as const,
                    check_interval: 60, // 默认60秒检查间隔
                    email_address: senderEmail,
                    subject,
                    from: senderName,
                    to: recipientName,
                    has_attachment: hasAttachment,
                    folders: folderTypes,
                    condition: {
                        type: conditionType.toLowerCase(),
                        script: conditionScript,
                        timeout: 30
                    },
                    actions: actions.map((action, index) => ({
                        type: action.type === '内容修改' ? 'modify_content' as const : 'smtp' as const,
                        name: action.name || `动作${index + 1}`,
                        description: action.name,
                        config: action.config,
                        enabled: action.enabled,
                        order: index + 1
                    })),
                    enable_logging: true
                }
                await triggerService.createTrigger(createPayload)
            }

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || '操作失败，请重试')
        } finally {
            setLoading(false)
        }
    }

    const addAction = () => {
        setActions([...actions, {
            name: '',
            type: '内容修改',
            config: `// 动作配置示例
function executeAction(email) {
    // 在这里定义具体的动作逻辑
    console.log('处理邮件:', email.subject);
    
    // 返回处理结果
    return {
        success: true,
        message: '邮件处理完成'
    };
}`,
            enabled: true
        }])
    }

    const removeAction = (index: number) => {
        setActions(actions.filter((_, i) => i !== index))
    }

    const handleActionChange = (index: number, field: string, value: any) => {
        const newActions = [...actions]
        newActions[index] = { ...newActions[index], [field]: value }
        setActions(newActions)
    }

    const handleFolderTypeChange = (type: string, checked: boolean) => {
        if (checked) {
            setFolderTypes([...folderTypes, type])
        } else {
            setFolderTypes(folderTypes.filter(t => t !== type))
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-800">
                {/* 标题栏 */}
                <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {trigger ? '编辑触发器' : '创建触发器'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* 表单内容 */}
                <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 基本信息 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">基本信息</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="triggerName">触发器名称 *</Label>
                                    <Input
                                        id="triggerName"
                                        value={triggerName}
                                        onChange={(e) => setTriggerName(e.target.value)}
                                        placeholder="输入触发器名称"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="executionOrder">执行顺序 (数字)</Label>
                                    <Input
                                        id="executionOrder"
                                        type="number"
                                        value={executionOrder}
                                        onChange={(e) => setExecutionOrder(parseInt(e.target.value) || 1)}
                                        placeholder="1"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">描述</Label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
                                    rows={2}
                                    placeholder="输入触发器描述（可选）"
                                />
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={enabled}
                                        onCheckedChange={setEnabled}
                                    />
                                    <Label>启用触发器</Label>
                                </div>
                            </div>
                        </div>

                        {/* 邮件过滤条件 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">邮件过滤条件</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="senderEmail">发件地址</Label>
                                    <Input
                                        id="senderEmail"
                                        value={senderEmail}
                                        onChange={(e) => setSenderEmail(e.target.value)}
                                        placeholder="example@domain.com"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="subject">主题</Label>
                                    <Input
                                        id="subject"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="邮件主题关键词"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="senderName">发件人</Label>
                                    <Input
                                        id="senderName"
                                        value={senderName}
                                        onChange={(e) => setSenderName(e.target.value)}
                                        placeholder="发件人邮箱"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="recipientName">收件人</Label>
                                    <Input
                                        id="recipientName"
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        placeholder="收件人邮箱"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={hasAttachment}
                                        onCheckedChange={setHasAttachment}
                                    />
                                    <Label>有附件</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={noAttachment}
                                        onCheckedChange={setNoAttachment}
                                    />
                                    <Label>无附件</Label>
                                </div>
                            </div>

                            <div>
                                <Label>文件夹类型</Label>
                                <div className="mt-2 flex flex-wrap gap-4">
                                    {['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam', 'Junk'].map((type) => (
                                        <div key={type} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={type}
                                                checked={folderTypes.includes(type)}
                                                onChange={(e) => handleFolderTypeChange(type, e.target.checked)}
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-primary-600"
                                            />
                                            <Label htmlFor={type}>{type}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 触发条件 */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">触发条件</h3>

                            <div>
                                <Label htmlFor="conditionType">条件类型</Label>
                                <Select value={conditionType} onValueChange={setConditionType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="JavaScript">JavaScript</SelectItem>
                                        <SelectItem value="Python">Python</SelectItem>
                                        <SelectItem value="Lua">Lua</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="conditionScript">条件脚本 *</Label>
                                <textarea
                                    id="conditionScript"
                                    value={conditionScript}
                                    onChange={(e) => setConditionScript(e.target.value)}
                                    className="w-full h-32 p-3 border border-gray-300 bg-white text-gray-900 rounded-lg font-mono text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
                                    placeholder="输入触发条件脚本"
                                />
                            </div>
                        </div>

                        {/* 触发动作 */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">触发动作</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addAction}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    添加动作
                                </Button>
                            </div>

                            {actions.map((action, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3 dark:border-gray-600">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-gray-900 dark:text-white">动作 {index + 1}</h4>
                                        {actions.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeAction(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>动作名称</Label>
                                            <Input
                                                value={action.name}
                                                onChange={(e) => handleActionChange(index, 'name', e.target.value)}
                                                placeholder="动作描述（可选）"
                                            />
                                        </div>
                                        <div>
                                            <Label>动作类型</Label>
                                            <Select
                                                value={action.type}
                                                onValueChange={(value) => handleActionChange(index, 'type', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="内容修改">内容修改</SelectItem>
                                                    <SelectItem value="转发邮件">转发邮件</SelectItem>
                                                    <SelectItem value="发送通知">发送通知</SelectItem>
                                                    <SelectItem value="标记邮件">标记邮件</SelectItem>
                                                    <SelectItem value="移动邮件">移动邮件</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div>
                                        <Label>配置脚本</Label>
                                        <textarea
                                            value={action.config}
                                            onChange={(e) => handleActionChange(index, 'config', e.target.value)}
                                            className="w-full h-24 p-3 border border-gray-300 bg-white text-gray-900 rounded-lg font-mono text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
                                            placeholder="输入动作配置脚本"
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={action.enabled}
                                            onCheckedChange={(checked) => handleActionChange(index, 'enabled', checked)}
                                        />
                                        <Label>启用此动作</Label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                disabled={loading}
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? '处理中...' : trigger ? '保存' : '创建'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}