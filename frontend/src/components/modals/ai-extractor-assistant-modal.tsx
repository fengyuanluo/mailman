import React, { useState, useEffect } from 'react'
import { X, Sparkles, Copy, Check } from 'lucide-react'
import { openAIService } from '@/services/openai.service'
import { toast } from 'react-hot-toast'
import type { OpenAIConfig } from '@/types/openai'
import type { ExtractorConfig } from '@/types'

interface AIExtractorAssistantModalProps {
    isOpen: boolean
    onClose: () => void
    onGenerate: (configs: ExtractorConfig[]) => void
    context: string
}

export function AIExtractorAssistantModal({
    isOpen,
    onClose,
    onGenerate,
    context
}: AIExtractorAssistantModalProps) {
    const [prompt, setPrompt] = useState('')
    const [generatedConfigs, setGeneratedConfigs] = useState<ExtractorConfig[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [configs, setConfigs] = useState<OpenAIConfig[]>([])
    const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadConfigs()
        }
    }, [isOpen])

    const loadConfigs = async () => {
        try {
            const configsData = await openAIService.getOpenAIConfigs()
            const activeConfigs = configsData.filter(c => c.is_active)
            setConfigs(activeConfigs)
            if (activeConfigs.length > 0 && !selectedConfigId) {
                setSelectedConfigId(activeConfigs[0].id)
            }
        } catch (error) {
            console.error('Failed to load AI configurations:', error)
            toast.error('加载 AI 配置失败')
        }
    }

    if (!isOpen) return null

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error('请输入提示词')
            return
        }

        if (!selectedConfigId) {
            toast.error('请选择 AI 配置')
            return
        }

        setIsGenerating(true)
        try {
            const fullPrompt = `${context}\n\n用户需求：${prompt}\n\n请返回 JSON 格式的提取器配置数组。`
            const response = await openAIService.callOpenAI({
                config_id: selectedConfigId,
                user_message: fullPrompt,
                temperature: 0.7,
                response_format: 'json'
            })

            // 解析响应内容
            let parsedContent = response.content

            // 尝试从 markdown 代码块中提取 JSON
            const codeBlockMatch = response.content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
            if (codeBlockMatch) {
                parsedContent = codeBlockMatch[1].trim()
            }

            // 解析 JSON
            try {
                const jsonData = JSON.parse(parsedContent)
                let configs: ExtractorConfig[] = []

                if (Array.isArray(jsonData)) {
                    configs = jsonData.map(item => {
                        const field = item.field || 'ALL'
                        // 确保 field 是有效的类型
                        const validFields = ['ALL', 'from', 'to', 'cc', 'subject', 'body', 'html_body', 'headers']
                        const validField = validFields.includes(field) ? field : 'ALL'

                        return {
                            field: validField as ExtractorConfig['field'],
                            type: item.type || 'regex',
                            match: item.match || '',
                            extract: item.extract || item.pattern || '',
                            config: item.config || item.extract || item.pattern || '',
                            replacement: item.replacement || (item.type === 'regex' ? '$1' : undefined)
                        }
                    })
                } else if (typeof jsonData === 'object') {
                    const field = jsonData.field || 'ALL'
                    const validFields = ['ALL', 'from', 'to', 'cc', 'subject', 'body', 'html_body', 'headers']
                    const validField = validFields.includes(field) ? field : 'ALL'

                    configs = [{
                        field: validField as ExtractorConfig['field'],
                        type: jsonData.type || 'regex',
                        match: jsonData.match || '',
                        extract: jsonData.extract || jsonData.pattern || '',
                        config: jsonData.config || jsonData.extract || jsonData.pattern || '',
                        replacement: jsonData.replacement || (jsonData.type === 'regex' ? '$1' : undefined)
                    }]
                }

                setGeneratedConfigs(configs)
                toast.success('生成成功')
            } catch (e) {
                console.error('JSON 解析失败:', e)
                toast.error('生成的内容格式不正确')
            }
        } catch (error) {
            console.error('生成失败:', error)
            toast.error('生成失败，请重试')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCopy = () => {
        const contentToCopy = JSON.stringify(generatedConfigs, null, 2)
        navigator.clipboard.writeText(contentToCopy)
        setCopied(true)
        toast.success('已复制到剪贴板')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleUseContent = () => {
        onGenerate(generatedConfigs)
        onClose()
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'regex': return '正则表达式'
            case 'xpath': return 'XPath'
            case 'css': return 'CSS选择器'
            case 'json': return 'JSON路径'
            default: return type
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <h2 className="text-xl font-semibold dark:text-white">AI 生成提取规则</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-180px)]">
                    {/* AI 配置选择 */}
                    {configs.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                AI 配置
                            </label>
                            <select
                                value={selectedConfigId || ''}
                                onChange={(e) => setSelectedConfigId(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-purple-500"
                            >
                                <option value="">选择 AI 配置</option>
                                {configs.map((config) => (
                                    <option key={config.id} value={config.id}>
                                        {config.name} ({config.model})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            请描述您想要提取的内容
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-purple-500"
                            rows={4}
                            placeholder="例如：提取邮件中的日期时间信息、订单号、金额等"
                        />
                    </div>

                    {generatedConfigs.length > 0 && (
                        <div className="border-t dark:border-gray-700 pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">生成的提取规则</h3>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                    <span>{copied ? '已复制' : '复制JSON'}</span>
                                </button>
                            </div>

                            <div className="space-y-3">
                                {generatedConfigs.map((config, index) => (
                                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">字段</label>
                                                <p className="font-medium text-sm dark:text-gray-200">{config.field}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">类型</label>
                                                <p className="font-medium text-sm dark:text-gray-200">{getTypeLabel(config.type)}</p>
                                            </div>
                                        </div>

                                        {config.match && (
                                            <div className="mb-3">
                                                <label className="text-xs text-gray-500 dark:text-gray-400">匹配条件</label>
                                                <p className="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 break-all dark:text-gray-300">
                                                    {config.match}
                                                </p>
                                            </div>
                                        )}

                                        <div className="mb-3">
                                            <label className="text-xs text-gray-500 dark:text-gray-400">提取规则</label>
                                            <p className="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 break-all dark:text-gray-300">
                                                {config.extract}
                                            </p>
                                        </div>

                                        {config.replacement && (
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">替换模板</label>
                                                <p className="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 dark:text-gray-300">
                                                    {config.replacement}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 p-6 border-t dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                        取消
                    </button>
                    {generatedConfigs.length > 0 && (
                        <button
                            onClick={handleUseContent}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
                        >
                            使用这些规则
                        </button>
                    )}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                    >
                        {isGenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>生成中...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                <span>生成</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
