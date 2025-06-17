'use client'

import { useState } from 'react'
import { openAIService } from '@/services/openai.service'
import { extractorTemplateService } from '@/services/extractor-template.service'
import type { GenerateEmailTemplateRequest } from '@/types/openai'
import type { ExtractorTemplate } from '@/types'

interface AITemplateGeneratorModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (template: ExtractorTemplate) => void
}

export function AITemplateGeneratorModal({ isOpen, onClose, onSuccess }: AITemplateGeneratorModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState<GenerateEmailTemplateRequest>({
        user_input: '',
        template_name: '',
        description: '',
        scenario: 'email_template_generation'
    })
    const [generatedContent, setGeneratedContent] = useState<string | null>(null)

    const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        setGeneratedContent(null)

        try {
            setLoading(true)
            const response = await openAIService.generateEmailTemplate(formData)
            setGeneratedContent(response.generated_content)

            // 获取生成的模板详情
            const template = await extractorTemplateService.getTemplate(response.id)
            onSuccess(template)
            onClose()
        } catch (err: any) {
            setError(err.response?.data?.message || '生成模板失败，请检查 OpenAI 配置是否正确')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">AI 生成邮件模板</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleGenerate}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                模板名称
                            </label>
                            <input
                                type="text"
                                value={formData.template_name}
                                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="例如：订单确认邮件提取器"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                描述（可选）
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="用于提取订单确认邮件中的关键信息"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                需求描述
                            </label>
                            <textarea
                                value={formData.user_input}
                                onChange={(e) => setFormData({ ...formData, user_input: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="请详细描述您想要提取的信息，例如：&#10;我需要从订单确认邮件中提取：&#10;1. 订单号（格式：ORD-XXXXXX）&#10;2. 客户姓名&#10;3. 订单金额&#10;4. 发货地址&#10;5. 预计送达时间"
                                rows={6}
                                required
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                请尽可能详细地描述您的需求，包括字段名称、格式示例等
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {generatedContent && (
                            <div className="bg-green-50 border border-green-200 p-4 rounded">
                                <h4 className="font-medium text-green-800 mb-2">生成成功！</h4>
                                <p className="text-sm text-green-700">
                                    AI 已成功生成邮件提取模板，正在保存...
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                            disabled={loading}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    AI 生成
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
