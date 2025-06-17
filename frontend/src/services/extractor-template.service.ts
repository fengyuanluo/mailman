import { apiClient } from '@/lib/api-client'
import type {
    ExtractorTemplate,
    ExtractorTemplateRequest,
    PaginatedExtractorTemplatesResponse
} from '@/types'

export interface TestTemplateRequest {
    email_id?: number
    custom_email?: {
        from: string
        to: string
        cc?: string
        subject: string
        body: string
        html_body?: string
    }
    extractors: Array<{
        field: string
        type: string
        config: string
    }>
}

export interface TestResult {
    field: string
    type: string
    result: string | null
    error?: string
}

export const extractorTemplateService = {
    // 获取取件模板列表（分页）
    async getTemplates(page: number = 1, limit: number = 10): Promise<PaginatedExtractorTemplatesResponse> {
        const response = await apiClient.get<PaginatedExtractorTemplatesResponse>(
            `/extractor-templates/paginated?page=${page}&limit=${limit}`
        )
        return response
    },

    // 获取单个取件模板
    async getTemplate(id: number): Promise<ExtractorTemplate> {
        const response = await apiClient.get<ExtractorTemplate>(`/extractor-templates/${id}`)
        return response
    },

    // 创建取件模板
    async createTemplate(data: ExtractorTemplateRequest): Promise<ExtractorTemplate> {
        const response = await apiClient.post<ExtractorTemplate>('/extractor-templates', data)
        return response
    },

    // 更新取件模板
    async updateTemplate(id: number, data: ExtractorTemplateRequest): Promise<ExtractorTemplate> {
        const response = await apiClient.put<ExtractorTemplate>(`/extractor-templates/${id}`, data)
        return response
    },

    // 删除取件模板
    async deleteTemplate(id: number): Promise<void> {
        await apiClient.delete(`/extractor-templates/${id}`)
    },

    // 测试模板
    async testTemplate(id: number, data: TestTemplateRequest): Promise<TestResult[]> {
        const response = await apiClient.post<TestResult[]>(`/extractor-templates/${id}/test`, data)
        return response
    }
}
