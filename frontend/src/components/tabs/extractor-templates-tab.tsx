'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Copy, FileText, ChevronLeft, ChevronRight, TestTube } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExtractorTemplateModal } from '@/components/modals/extractor-template-modal'
import { ExtractorTemplateTestModal } from '@/components/modals/extractor-template-test-modal'
import { extractorTemplateService } from '@/services/extractor-template.service'
import type { ExtractorTemplate } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

// 分页组件
function Pagination({
    currentPage,
    totalPages,
    onPageChange
}: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}) {
    const pages = []
    const maxVisiblePages = 5

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
    }

    return (
        <div className="flex items-center justify-center space-x-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>

            {startPage > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        className="rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        1
                    </button>
                    {startPage > 2 && <span className="text-gray-400">...</span>}
                </>
            )}

            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={cn(
                        "rounded-lg px-3 py-1 text-sm transition-colors",
                        page === currentPage
                            ? "bg-primary-600 text-white"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    )}
                >
                    {page}
                </button>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        className="rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700"
            >
                <ChevronRight className="h-5 w-5" />
            </button>
        </div>
    )
}

export function ExtractorTemplatesTab() {
    const [templates, setTemplates] = useState<ExtractorTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<ExtractorTemplate | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
    const [isTestModalOpen, setIsTestModalOpen] = useState(false)
    const [testTemplate, setTestTemplate] = useState<ExtractorTemplate | null>(null)
    const [debugMode, setDebugMode] = useState(false)
    const [testEmailId, setTestEmailId] = useState<number | undefined>()

    const limit = 10

    useEffect(() => {
        loadTemplates()
    }, [currentPage])

    const loadTemplates = async () => {
        setLoading(true)
        try {
            const response = await extractorTemplateService.getTemplates(currentPage, limit)
            setTemplates(response?.data || [])
            setTotal(response?.total || 0)
            setTotalPages(response?.total_pages || 0)
        } catch (error) {
            console.error('Failed to load templates:', error)
            // 确保在错误情况下也设置为空数组
            setTemplates([])
            setTotal(0)
            setTotalPages(0)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setSelectedTemplate(null)
        setDebugMode(false)
        setTestEmailId(undefined)
        setIsModalOpen(true)
    }

    const handleEdit = (template: ExtractorTemplate) => {
        setSelectedTemplate(template)
        setDebugMode(false)
        setTestEmailId(undefined)
        setIsModalOpen(true)
    }

    const handleDuplicate = async (template: ExtractorTemplate) => {
        try {
            await extractorTemplateService.createTemplate({
                name: `${template.name} (副本)`,
                description: template.description,
                extractors: template.extractors
            })
            loadTemplates()
        } catch (error) {
            console.error('Failed to duplicate template:', error)
        }
    }

    const handleDelete = async (id: number) => {
        if (deleteConfirm === id) {
            try {
                await extractorTemplateService.deleteTemplate(id)
                setDeleteConfirm(null)
                loadTemplates()
            } catch (error) {
                console.error('Failed to delete template:', error)
            }
        } else {
            setDeleteConfirm(id)
            setTimeout(() => setDeleteConfirm(null), 3000)
        }
    }

    const handleTest = (template: ExtractorTemplate) => {
        setTestTemplate(template)
        setIsTestModalOpen(true)
    }

    const handleSaveTemplate = async (updatedTemplate: ExtractorTemplate) => {
        // 更新列表中的模板
        setTemplates(prev => (prev || []).map(t => t.id === updatedTemplate.id ? updatedTemplate : t))
        // 如果需要，可以重新加载列表
        await loadTemplates()
    }

    const filteredTemplates = (templates || []).filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* 头部 */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">取件模板</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        管理邮件内容提取模板，支持正则表达式、关键词和AI智能提取
                    </p>
                </div>
                <motion.button
                    onClick={handleCreate}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-primary-700"
                >
                    <Plus className="h-4 w-4" />
                    新建模板
                </motion.button>
            </div>

            {/* 搜索栏 */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索模板名称或描述..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
            </div>

            {/* 模板列表 */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                        <FileText className="mb-4 h-12 w-12 text-gray-300" />
                        <p className="text-lg font-medium">暂无模板</p>
                        <p className="mt-1 text-sm">点击"新建模板"创建您的第一个取件模板</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            模板名称
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            描述
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            提取器数量
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            创建时间
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            操作
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    <AnimatePresence>
                                        {filteredTemplates.map((template, index) => (
                                            <motion.tr
                                                key={template.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -100 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="group hover:bg-gray-50 dark:hover:bg-gray-900/50"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {template.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {template.description || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-900 dark:text-white">
                                                            {template.extractors.length}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            个提取器
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(template.created_at).toLocaleDateString('zh-CN')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                        <motion.button
                                                            onClick={() => handleTest(template)}
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                                            title="测试"
                                                        >
                                                            <TestTube className="h-4 w-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            onClick={() => handleEdit(template)}
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                                            title="编辑"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            onClick={() => handleDuplicate(template)}
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                                            title="复制"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            onClick={() => handleDelete(template.id)}
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            className={cn(
                                                                "rounded-lg p-2 transition-colors",
                                                                deleteConfirm === template.id
                                                                    ? "bg-red-100 text-red-600 dark:bg-red-900/20"
                                                                    : "text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20"
                                                            )}
                                                            title={deleteConfirm === template.id ? "再次点击确认删除" : "删除"}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {/* 分页 */}
                        {totalPages > 1 && (
                            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        显示 <span className="font-medium">{(currentPage - 1) * limit + 1}</span> 到{' '}
                                        <span className="font-medium">
                                            {Math.min(currentPage * limit, total)}
                                        </span>{' '}
                                        条，共 <span className="font-medium">{total}</span> 条
                                    </p>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 模态框 */}
            <ExtractorTemplateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadTemplates}
                template={selectedTemplate}
            />

            {/* 测试模态框 */}
            {testTemplate && (
                <ExtractorTemplateTestModal
                    isOpen={isTestModalOpen}
                    onClose={() => setIsTestModalOpen(false)}
                    template={testTemplate}
                    onSave={handleSaveTemplate}
                />
            )}
        </div>
    )
}
