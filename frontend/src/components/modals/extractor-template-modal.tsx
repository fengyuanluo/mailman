'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, GripVertical, Sparkles, Hash, Code, Play, CheckCircle, XCircle, Loader2, Bug, HelpCircle, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExtractorTemplate, ExtractorTemplateRequest, ExtractorConfig } from '@/types'
import { extractorTemplateService, TestResult } from '@/services/extractor-template.service'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { ExtractorTemplateTestModal } from './extractor-template-test-modal'

// 扩展ExtractorConfig以包含唯一ID和测试结果
interface ExtractorConfigWithId extends ExtractorConfig {
    id: string
    testResult?: TestResult
}

interface ExtractorTemplateModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    template?: ExtractorTemplate | null
}

const extractorTypes = [
    { value: 'regex', label: '正则表达式', icon: Hash, color: 'text-blue-500' },
    { value: 'js', label: 'JavaScript', icon: Code, color: 'text-green-500' },
    { value: 'gotemplate', label: 'Go模板', icon: Sparkles, color: 'text-purple-500' }
] as const

const fieldOptions = [
    { value: 'ALL', label: '全部字段' },
    { value: 'from', label: '发件人' },
    { value: 'to', label: '收件人' },
    { value: 'cc', label: '抄送' },
    { value: 'subject', label: '主题' },
    { value: 'body', label: '正文' },
    { value: 'html_body', label: 'HTML正文' },
    { value: 'headers', label: '邮件头' }
] as const

// 提取器项组件
function ExtractorItem({
    extractor,
    index,
    onExtractorChange,
    onRemoveExtractor,
    errors
}: {
    extractor: ExtractorConfigWithId
    index: number
    onExtractorChange: (id: string, field: keyof ExtractorConfig, value: any) => void
    onRemoveExtractor: (id: string) => void
    errors: Record<string, string>
}) {
    const dragControls = useDragControls()
    const typeConfig = extractorTypes.find(t => t.value === extractor.type)
    const Icon = typeConfig?.icon || Hash
    const [showHelp, setShowHelp] = useState<Record<string, boolean>>({})
    const [isExpanded, setIsExpanded] = useState(true)

    const toggleHelp = (key: string) => {
        setShowHelp(prev => ({ ...prev, [key]: !prev[key] }))
    }

    return (
        <Reorder.Item
            value={extractor}
            id={extractor.id}
            dragListener={false}
            dragControls={dragControls}
            className="relative"
        >
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            >
                {/* 头部 */}
                <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div
                        className="cursor-move text-gray-400 hover:text-gray-600"
                        onPointerDown={(e) => {
                            e.stopPropagation()
                            dragControls.start(e)
                        }}
                    >
                        <GripVertical className="h-5 w-5" />
                    </div>

                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}

                    <Icon className={cn('h-5 w-5', typeConfig?.color)} />

                    <span className="font-medium">
                        {fieldOptions.find(f => f.value === extractor.field)?.label || extractor.field}
                    </span>

                    <span className="text-sm text-gray-500">
                        ({typeConfig?.label})
                    </span>

                    <motion.button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onRemoveExtractor(extractor.id)
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="ml-auto rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 className="h-4 w-4" />
                    </motion.button>
                </div>

                {/* 展开内容 */}
                {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                        {/* 字段和类型选择 */}
                        <div className="flex items-center gap-3">
                            <select
                                value={extractor.field}
                                onChange={(e) => onExtractorChange(extractor.id, 'field', e.target.value)}
                                className="rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            >
                                {fieldOptions.map(field => (
                                    <option key={field.value} value={field.value}>
                                        {field.label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={extractor.type}
                                onChange={(e) => onExtractorChange(extractor.id, 'type', e.target.value)}
                                className="rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            >
                                {extractorTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Match 配置 */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    匹配条件 (可选)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => toggleHelp(`match_${index}`)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                </button>
                            </div>
                            <textarea
                                value={extractor.match || ''}
                                onChange={(e) => onExtractorChange(extractor.id, 'match', e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                placeholder={
                                    extractor.type === 'regex'
                                        ? '输入正则表达式，例如：订单号.*\\d{10}'
                                        : extractor.type === 'js'
                                            ? '输入JavaScript代码，返回布尔值'
                                            : '输入Go模板表达式，例如：{{ contains .Content "订单号" }}'
                                }
                                rows={2}
                            />
                            {showHelp[`match_${index}`] && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm dark:bg-blue-900/20">
                                    <p className="font-medium mb-1">匹配条件说明：</p>
                                    <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                                        <li>用于判断是否执行提取操作</li>
                                        <li>返回 false 时将跳过该字段的提取</li>
                                        <li>留空则默认执行提取</li>
                                        {extractor.type === 'regex' && (
                                            <li>正则匹配成功返回 true，失败返回 false</li>
                                        )}
                                        {extractor.type === 'js' && (
                                            <li>JavaScript 代码应返回布尔值</li>
                                        )}
                                        {extractor.type === 'gotemplate' && (
                                            <li>模板表达式应返回布尔值</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Extract 配置 */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    提取规则 <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => toggleHelp(`extract_${index}`)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                </button>
                            </div>
                            <textarea
                                value={extractor.extract || extractor.config || ''}
                                onChange={(e) => {
                                    onExtractorChange(extractor.id, 'extract', e.target.value)
                                    // 同时更新config以保持兼容性
                                    onExtractorChange(extractor.id, 'config', e.target.value)
                                }}
                                className={cn(
                                    'w-full rounded-lg border px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
                                    errors[`extractor_${index}_extract`] && 'border-red-500'
                                )}
                                placeholder={
                                    extractor.type === 'regex'
                                        ? '输入正则表达式和捕获组模板，例如：\n订单号[：:]\\s*(\\d{10})\n$1'
                                        : extractor.type === 'js'
                                            ? '输入JavaScript代码，例如：\nconst match = text.match(/订单号[：:]\\s*(\\d{10})/);\nreturn match ? match[1] : null;'
                                            : '输入Go模板，例如：\n{{ regexFind "订单号[：:]\\s*(\\d{10})" .Content 1 }}'
                                }
                                rows={4}
                            />
                            {errors[`extractor_${index}_extract`] && (
                                <p className="mt-1 text-xs text-red-500">{errors[`extractor_${index}_extract`]}</p>
                            )}

                            {showHelp[`extract_${index}`] && (
                                <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm dark:bg-blue-900/20">
                                    <p className="font-medium mb-2">提取规则说明：</p>
                                    {extractor.type === 'regex' ? (
                                        <div className="space-y-2">
                                            <div>
                                                <p className="font-medium">格式：</p>
                                                <p className="text-gray-700 dark:text-gray-300">第一行：正则表达式（支持捕获组）</p>
                                                <p className="text-gray-700 dark:text-gray-300">第二行：返回模板（可选）</p>
                                            </div>
                                            <div>
                                                <p className="font-medium">捕获组使用：</p>
                                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                                                    <li>$0 - 完整匹配</li>
                                                    <li>$1, $2, ... - 对应的捕获组</li>
                                                    <li>可组合使用：$1-$2</li>
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="font-medium">示例：</p>
                                                <div className="mt-1 p-2 bg-white rounded border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                                                    <code className="text-xs">
                                                        订单号[：:]\\s*(\\d{'{'}10{'}'})<br />
                                                        $1
                                                    </code>
                                                </div>
                                            </div>
                                        </div>
                                    ) : extractor.type === 'js' ? (
                                        <div className="space-y-2">
                                            <p className="text-gray-700 dark:text-gray-300">使用JavaScript处理文本，返回提取的值或null</p>
                                            <div>
                                                <p className="font-medium">可用变量：</p>
                                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                                                    <li>text - 输入文本</li>
                                                    <li>field - 当前字段名</li>
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-gray-700 dark:text-gray-300">使用Go模板语法提取内容</p>
                                            <div>
                                                <p className="font-medium">可用函数：</p>
                                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                                                    <li>regexFind - 正则查找</li>
                                                    <li>contains - 包含判断</li>
                                                    <li>trim - 去除空白</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 示例 */}
                        {extractor.type === 'regex' && (
                            <div className="bg-gray-100 p-3 rounded-md dark:bg-gray-800">
                                <p className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">常用示例：</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">提取订单号：</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onExtractorChange(extractor.id, 'extract', '订单号[：:]\\s*(\\d{10})\\n$1')
                                                onExtractorChange(extractor.id, 'config', '订单号[：:]\\s*(\\d{10})\\n$1')
                                            }}
                                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <Copy className="h-3 w-3" />
                                            使用
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">提取金额：</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onExtractorChange(extractor.id, 'extract', '金额[：:]\\s*([\\d,]+\\.\\d{2})\\n$1')
                                                onExtractorChange(extractor.id, 'config', '金额[：:]\\s*([\\d,]+\\.\\d{2})\\n$1')
                                            }}
                                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <Copy className="h-3 w-3" />
                                            使用
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">提取日期：</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onExtractorChange(extractor.id, 'extract', '(\\d{4})年(\\d{1,2})月(\\d{1,2})日\\n$1-$2-$3')
                                                onExtractorChange(extractor.id, 'config', '(\\d{4})年(\\d{1,2})月(\\d{1,2})日\\n$1-$2-$3')
                                            }}
                                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <Copy className="h-3 w-3" />
                                            使用
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </Reorder.Item>
    )
}

export function ExtractorTemplateModal({
    isOpen,
    onClose,
    onSuccess,
    template
}: ExtractorTemplateModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const contentRef = useRef<HTMLDivElement>(null)
    const [contentHeight, setContentHeight] = useState<number>(0)

    // 测试模态框状态
    const [isTestModalOpen, setIsTestModalOpen] = useState(false)
    const [tempTemplate, setTempTemplate] = useState<ExtractorTemplate | null>(null)

    // 用于存储带ID的提取器
    const [extractorsWithId, setExtractorsWithId] = useState<ExtractorConfigWithId[]>([])

    const [form, setForm] = useState<ExtractorTemplateRequest>({
        name: '',
        description: '',
        extractors: []
    })

    // 生成唯一ID
    const generateId = () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    // 处理模态框动画
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
            setTimeout(() => setIsAnimating(true), 10)
            if (template) {
                setForm({
                    name: template.name,
                    description: template.description || '',
                    extractors: template.extractors
                })
                // 为现有提取器添加ID，并确保有extract字段
                setExtractorsWithId(template.extractors.map(ext => ({
                    ...ext,
                    id: generateId(),
                    extract: ext.extract || ext.config || '',
                    config: ext.config || ext.extract || ''
                })))
            } else {
                setForm({
                    name: '',
                    description: '',
                    extractors: []
                })
                setExtractorsWithId([])
            }
        } else {
            setIsAnimating(false)
            setTimeout(() => {
                setIsVisible(false)
                setErrors({})
                setIsTestModalOpen(false)
                setTempTemplate(null)
            }, 300)
        }
    }, [isOpen, template])

    // 同步extractorsWithId到form.extractors
    useEffect(() => {
        setForm(prev => ({
            ...prev,
            extractors: extractorsWithId.map(({ id, testResult, ...extractor }) => extractor)
        }))
    }, [extractorsWithId])

    // 监听内容高度变化
    useEffect(() => {
        if (contentRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const { height } = entry.contentRect
                    setContentHeight(height)
                }
            })

            resizeObserver.observe(contentRef.current)

            return () => {
                resizeObserver.disconnect()
            }
        }
    }, [extractorsWithId.length])

    const handleAddExtractor = () => {
        setExtractorsWithId(prev => [
            ...prev,
            {
                id: generateId(),
                field: 'ALL',
                type: 'regex',
                match: '',
                extract: '',
                config: ''
            }
        ])
    }

    const handleRemoveExtractor = (id: string) => {
        setExtractorsWithId(prev => prev.filter(ext => ext.id !== id))
    }

    const handleExtractorChange = (id: string, field: keyof ExtractorConfig, value: any) => {
        setExtractorsWithId(prev => prev.map(extractor =>
            extractor.id === id ? { ...extractor, [field]: value, testResult: undefined } : extractor
        ))
    }

    const handleReorderExtractors = (newOrder: ExtractorConfigWithId[]) => {
        setExtractorsWithId(newOrder)
    }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!form.name.trim()) {
            newErrors.name = '请输入模板名称'
        }

        if (form.extractors.length === 0) {
            newErrors.extractors = '请至少添加一个提取器'
        }

        form.extractors.forEach((extractor, index) => {
            if (!extractor.extract?.trim() && !extractor.config?.trim()) {
                newErrors[`extractor_${index}_extract`] = '请输入提取规则'
            }
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleOpenDebugMode = async () => {
        // 验证基本信息
        if (!form.name.trim()) {
            setErrors({ name: '请先输入模板名称' })
            return
        }

        if (form.extractors.length === 0) {
            setErrors({ extractors: '请先添加至少一个提取器' })
            return
        }

        // 创建临时模板对象
        const tempTemplateData: ExtractorTemplate = {
            id: template?.id || 0,
            name: form.name,
            description: form.description || '',
            extractors: form.extractors,
            created_at: template?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        setTempTemplate(tempTemplateData)
        setIsTestModalOpen(true)
    }

    const handleSaveFromTest = (updatedTemplate: ExtractorTemplate) => {
        // 更新表单数据
        setForm({
            name: updatedTemplate.name,
            description: updatedTemplate.description || '',
            extractors: updatedTemplate.extractors
        })

        // 更新带ID的提取器
        setExtractorsWithId(updatedTemplate.extractors.map(ext => ({
            ...ext,
            id: generateId(),
            extract: ext.extract || ext.config || '',
            config: ext.config || ext.extract || ''
        })))

        // 关闭测试模态框
        setIsTestModalOpen(false)
        setTempTemplate(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setLoading(true)
        try {
            if (template) {
                await extractorTemplateService.updateTemplate(template.id, form)
            } else {
                await extractorTemplateService.createTemplate(form)
            }
            onSuccess()
            onClose()
        } catch (error: any) {
            setErrors({ submit: error.response?.data?.error || '操作失败' })
        } finally {
            setLoading(false)
        }
    }

    if (!isVisible) return null

    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300',
                    isAnimating ? 'bg-black/50' : 'bg-black/0'
                )}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={isAnimating ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
                    onClick={(e) => e.stopPropagation()}
                >
                    <form onSubmit={handleSubmit}>
                        {/* 头部 */}
                        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {template ? '编辑取件模板' : '新建取件模板'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 内容 */}
                        <div
                            ref={contentRef}
                            className="p-6"
                            style={{
                                maxHeight: '60vh',
                                overflowY: 'auto',
                                transition: 'height 0.3s ease-in-out'
                            }}
                        >
                            {/* 基本信息 */}
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        模板名称 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className={cn(
                                            'w-full rounded-lg border px-4 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white',
                                            errors.name && 'border-red-500'
                                        )}
                                        placeholder="例如：订单信息提取"
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        模板描述
                                    </label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className="w-full rounded-lg border px-4 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        placeholder="描述这个模板的用途..."
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* 提取器列表 */}
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        提取器配置 <span className="text-red-500">*</span>
                                    </label>
                                    <motion.button
                                        type="button"
                                        onClick={handleAddExtractor}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                                    >
                                        <Plus className="h-4 w-4" />
                                        添加提取器
                                    </motion.button>
                                </div>

                                {errors.extractors && (
                                    <p className="mb-2 text-sm text-red-500">{errors.extractors}</p>
                                )}

                                <AnimatePresence>
                                    {extractorsWithId.length > 0 ? (
                                        <Reorder.Group
                                            axis="y"
                                            values={extractorsWithId}
                                            onReorder={handleReorderExtractors}
                                            className="space-y-4"
                                        >
                                            {extractorsWithId.map((extractor, index) => (
                                                <ExtractorItem
                                                    key={extractor.id}
                                                    extractor={extractor}
                                                    index={index}
                                                    onExtractorChange={handleExtractorChange}
                                                    onRemoveExtractor={handleRemoveExtractor}
                                                    errors={errors}
                                                />
                                            ))}
                                        </Reorder.Group>
                                    ) : (
                                        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                                            <p className="text-gray-500 dark:text-gray-400">
                                                还没有添加提取器，点击上方按钮添加
                                            </p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* 底部 */}
                        <div className="flex items-center justify-between border-t border-gray-200 p-6 dark:border-gray-700">
                            {errors.submit && (
                                <p className="text-sm text-red-500">{errors.submit}</p>
                            )}
                            <div className="ml-auto flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    取消
                                </button>
                                <motion.button
                                    type="button"
                                    onClick={handleOpenDebugMode}
                                    disabled={loading}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
                                >
                                    <Bug className="h-4 w-4" />
                                    调试模式
                                </motion.button>
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                                >
                                    {loading ? '保存中...' : template ? '更新' : '创建'}
                                </motion.button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </div>

            {/* 测试模态框 */}
            {tempTemplate && (
                <ExtractorTemplateTestModal
                    isOpen={isTestModalOpen}
                    onClose={() => {
                        setIsTestModalOpen(false)
                        setTempTemplate(null)
                    }}
                    template={tempTemplate}
                    onSave={handleSaveFromTest}
                />
            )}
        </>
    )
}