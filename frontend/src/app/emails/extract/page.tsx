'use client'

import { useState } from 'react'
import { Download, Code, FileCode, FileText, Plus, Trash2 } from 'lucide-react'
import { emailService } from '@/services/email.service'

interface ExtractorConfig {
    id: string
    type: 'regex' | 'js' | 'gotemplate'
    field: 'ALL' | 'from' | 'to' | 'cc' | 'subject' | 'body' | 'html_body' | 'headers'
    config: string
}

export default function EmailExtractPage() {
    const [extractors, setExtractors] = useState<ExtractorConfig[]>([
        {
            id: '1',
            type: 'regex',
            field: 'body',
            config: ''
        }
    ])
    const [searchParams, setSearchParams] = useState({
        accountId: '',
        keyword: '',
        startDate: '',
        endDate: '',
        mailbox: 'INBOX'
    })
    const [extracting, setExtracting] = useState(false)
    const [results, setResults] = useState<any[]>([])

    const addExtractor = () => {
        setExtractors([
            ...extractors,
            {
                id: Date.now().toString(),
                type: 'regex',
                field: 'body',
                config: ''
            }
        ])
    }

    const removeExtractor = (id: string) => {
        setExtractors(extractors.filter(e => e.id !== id))
    }

    const updateExtractor = (id: string, updates: Partial<ExtractorConfig>) => {
        setExtractors(extractors.map(e =>
            e.id === id ? { ...e, ...updates } : e
        ))
    }

    const handleExtract = async () => {
        setExtracting(true)
        try {
            // 调用提取API
            // const response = await emailService.extractEmails({
            //     ...searchParams,
            //     extractors: extractors.map(({ id, ...rest }) => rest)
            // })
            // setResults(response.results)
        } catch (error) {
            console.error('Extraction failed:', error)
        } finally {
            setExtracting(false)
        }
    }

    const getFieldIcon = (type: string) => {
        switch (type) {
            case 'regex':
                return <Code className="h-4 w-4" />
            case 'js':
                return <FileCode className="h-4 w-4" />
            case 'gotemplate':
                return <FileText className="h-4 w-4" />
            default:
                return <Code className="h-4 w-4" />
        }
    }

    return (
        <div className="flex h-full">
            {/* 配置区 */}
            <div className="w-1/2 border-r border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
                    邮件内容提取
                </h2>

                {/* 搜索条件 */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="mb-4 text-sm font-medium text-gray-900 dark:text-white">
                        搜索条件
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                                账户ID
                            </label>
                            <input
                                type="text"
                                value={searchParams.accountId}
                                onChange={(e) => setSearchParams({ ...searchParams, accountId: e.target.value })}
                                placeholder="选择账户（可选）"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                                    开始日期
                                </label>
                                <input
                                    type="date"
                                    value={searchParams.startDate}
                                    onChange={(e) => setSearchParams({ ...searchParams, startDate: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                                    结束日期
                                </label>
                                <input
                                    type="date"
                                    value={searchParams.endDate}
                                    onChange={(e) => setSearchParams({ ...searchParams, endDate: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 提取器配置 */}
                <div className="mb-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            提取器配置
                        </h3>
                        <button
                            onClick={addExtractor}
                            className="flex items-center space-x-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                        >
                            <Plus className="h-4 w-4" />
                            <span>添加提取器</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {extractors.map((extractor) => (
                            <div
                                key={extractor.id}
                                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {getFieldIcon(extractor.type)}
                                        <select
                                            value={extractor.type}
                                            onChange={(e) => updateExtractor(extractor.id, { type: e.target.value as any })}
                                            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                        >
                                            <option value="regex">正则表达式</option>
                                            <option value="js">JavaScript</option>
                                            <option value="gotemplate">Go模板</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => removeExtractor(extractor.id)}
                                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="mb-3">
                                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                                        提取字段
                                    </label>
                                    <select
                                        value={extractor.field}
                                        onChange={(e) => updateExtractor(extractor.id, { field: e.target.value as any })}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    >
                                        <option value="ALL">所有字段</option>
                                        <option value="from">发件人</option>
                                        <option value="to">收件人</option>
                                        <option value="cc">抄送</option>
                                        <option value="subject">主题</option>
                                        <option value="body">正文</option>
                                        <option value="html_body">HTML正文</option>
                                        <option value="headers">邮件头</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                                        {extractor.type === 'regex' ? '正则表达式' :
                                            extractor.type === 'js' ? 'JavaScript代码' :
                                                'Go模板'}
                                    </label>
                                    <textarea
                                        value={extractor.config}
                                        onChange={(e) => updateExtractor(extractor.id, { config: e.target.value })}
                                        placeholder={
                                            extractor.type === 'regex' ? '例如: \\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b' :
                                                extractor.type === 'js' ? '// 返回提取的内容数组\nreturn content.match(/pattern/g);' :
                                                    '{{ .Subject }} - {{ .From }}'
                                        }
                                        rows={4}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 执行按钮 */}
                <button
                    onClick={handleExtract}
                    disabled={extracting || extractors.length === 0}
                    className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:bg-gray-400"
                >
                    {extracting ? '提取中...' : '开始提取'}
                </button>
            </div>

            {/* 结果展示区 */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
                {results.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <Download className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                            <p className="text-gray-500 dark:text-gray-400">
                                配置提取器并点击"开始提取"查看结果
                            </p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                提取结果
                            </h3>
                            <button className="flex items-center space-x-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                                <Download className="h-4 w-4" />
                                <span>导出结果</span>
                            </button>
                        </div>
                        {/* 结果展示 */}
                        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <pre className="text-sm text-gray-700 dark:text-gray-300">
                                {JSON.stringify(results, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}