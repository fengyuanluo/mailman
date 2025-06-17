'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2, Copy, Check, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { openAIService } from '@/services/openai.service'
import type { OpenAIConfig, AIPromptTemplate, CallOpenAIRequest } from '@/types/openai'

interface AIAssistantModalProps {
    isOpen: boolean
    onClose: () => void
    onGenerate: (content: string) => void
    title?: string
    description?: string
    defaultPrompt?: string
    placeholder?: string
    variables?: Record<string, string>
    scenario?: string
}

export function AIAssistantModal({
    isOpen,
    onClose,
    onGenerate,
    title = '使用 AI 生成',
    description = '选择 AI 配置和提示模板，输入您的需求',
    defaultPrompt = '',
    placeholder = '请描述您的需求...',
    variables = {},
    scenario = 'general'
}: AIAssistantModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    // AI 配置和模板
    const [configs, setConfigs] = useState<OpenAIConfig[]>([])
    const [templates, setTemplates] = useState<AIPromptTemplate[]>([])
    const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null)
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)

    // 输入内容
    const [userInput, setUserInput] = useState(defaultPrompt)
    const [systemPrompt, setSystemPrompt] = useState('')
    const [maxTokens, setMaxTokens] = useState(1000)
    const [temperature, setTemperature] = useState(0.7)

    // 生成结果
    const [generatedContent, setGeneratedContent] = useState('')
    const [error, setError] = useState('')

    // 处理模态框动画
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
            setTimeout(() => setIsAnimating(true), 10)
            loadData()
        } else {
            setIsAnimating(false)
            setTimeout(() => {
                setIsVisible(false)
                setGeneratedContent('')
                setError('')
                setCopied(false)
                setShowAdvanced(false)
            }, 300)
        }
    }, [isOpen])

    const loadData = async () => {
        setLoading(true)
        try {
            const [configsData, templatesData] = await Promise.all([
                openAIService.getOpenAIConfigs(),
                openAIService.getPromptTemplates()
            ])

            setConfigs(configsData.filter(c => c.is_active))

            // 过滤符合场景的模板
            const filteredTemplates = templatesData.filter(t =>
                t.is_active && (t.scenario === scenario || scenario === 'general')
            )
            setTemplates(filteredTemplates)

            // 自动选择第一个活跃的配置
            if (configsData.length > 0 && !selectedConfigId) {
                const activeConfig = configsData.find(c => c.is_active)
                if (activeConfig) {
                    setSelectedConfigId(activeConfig.id)
                }
            }

            // 自动选择第一个符合场景的模板
            if (filteredTemplates.length > 0 && !selectedTemplateId) {
                setSelectedTemplateId(filteredTemplates[0].id)
                // 如果有模板，使用模板的系统提示
                setSystemPrompt(filteredTemplates[0].system_prompt)
                setMaxTokens(filteredTemplates[0].max_tokens)
                setTemperature(filteredTemplates[0].temperature)
            }
        } catch (error) {
            console.error('Failed to load AI configurations:', error)
            setError('加载 AI 配置失败')
        } finally {
            setLoading(false)
        }
    }

    const handleTemplateChange = (templateId: number) => {
        setSelectedTemplateId(templateId)
        const template = templates.find(t => t.id === templateId)
        if (template) {
            setSystemPrompt(template.system_prompt)
            setMaxTokens(template.max_tokens)
            setTemperature(template.temperature)
        }
    }

    const handleGenerate = async () => {
        if (!selectedConfigId || !userInput.trim()) {
            setError('请选择 AI 配置并输入内容')
            return
        }

        setGenerating(true)
        setError('')

        try {
            // 构建增强的用户消息，包含邮件内容上下文
            let enhancedUserMessage = userInput
            if (variables.emailContent) {
                enhancedUserMessage = `邮件内容：\n${variables.emailContent}\n\n用户需求：${userInput}`
            }

            const request: CallOpenAIRequest = {
                config_id: selectedConfigId,
                template_id: selectedTemplateId || undefined,
                system_prompt: systemPrompt || undefined,
                user_message: enhancedUserMessage,
                variables: variables,
                max_tokens: maxTokens,
                temperature: temperature,
                response_format: 'text'
            }

            const response = await openAIService.callOpenAI(request)
            setGeneratedContent(response.content)
        } catch (error: any) {
            console.error('Generation failed:', error)
            setError(error.message || '生成失败，请重试')
        } finally {
            setGenerating(false)
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedContent)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleUseContent = () => {
        onGenerate(generatedContent)
        onClose()
    }

    if (!isVisible) return null

    return (
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
                className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {title}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {description}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 内容区域 */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* AI 配置选择 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        AI 配置
                                    </label>
                                    <select
                                        value={selectedConfigId || ''}
                                        onChange={(e) => setSelectedConfigId(Number(e.target.value))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    >
                                        <option value="">选择 AI 配置</option>
                                        {configs.map((config) => (
                                            <option key={config.id} value={config.id}>
                                                {config.name} ({config.model})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        提示模板（可选）
                                    </label>
                                    <select
                                        value={selectedTemplateId || ''}
                                        onChange={(e) => handleTemplateChange(Number(e.target.value))}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    >
                                        <option value="">不使用模板</option>
                                        {templates.map((template) => (
                                            <option key={template.id} value={template.id}>
                                                {template.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 高级设置 */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                >
                                    <Settings className="h-4 w-4" />
                                    高级设置
                                    {showAdvanced ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </button>

                                <AnimatePresence>
                                    {showAdvanced && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-4 space-y-4 overflow-hidden"
                                        >
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    系统提示（System Prompt）
                                                </label>
                                                <textarea
                                                    value={systemPrompt}
                                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                    placeholder="设置 AI 的角色和行为..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        最大令牌数
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={maxTokens}
                                                        onChange={(e) => setMaxTokens(Number(e.target.value))}
                                                        min={100}
                                                        max={4000}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        温度（0-2）
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={temperature}
                                                        onChange={(e) => setTemperature(Number(e.target.value))}
                                                        min={0}
                                                        max={2}
                                                        step={0.1}
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* 用户输入 */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    您的需求
                                </label>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    placeholder={placeholder}
                                />
                            </div>

                            {/* 错误提示 */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20"
                                >
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </motion.div>
                            )}

                            {/* 生成结果 */}
                            {generatedContent && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            生成结果
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="h-4 w-4 text-green-500" />
                                                    已复制
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4" />
                                                    复制
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                                            {generatedContent}
                                        </pre>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        取消
                    </button>
                    {generatedContent ? (
                        <button
                            type="button"
                            onClick={handleUseContent}
                            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                        >
                            使用此内容
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={generating || !selectedConfigId || !userInput.trim()}
                            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    生成
                                </>
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
