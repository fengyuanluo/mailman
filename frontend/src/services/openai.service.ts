import { apiClient } from '@/lib/api-client'
import type {
    OpenAIConfig,
    OpenAIConfigRequest,
    AIPromptTemplate,
    AIPromptTemplateRequest,
    GenerateEmailTemplateRequest,
    GenerateEmailTemplateResponse,
    CallOpenAIRequest,
    CallOpenAIResponse
} from '@/types/openai'

export const openAIService = {
    // OpenAI Configuration methods
    async getOpenAIConfigs(): Promise<OpenAIConfig[]> {
        const response = await apiClient.get('/openai/configs')
        return response
    },

    async getOpenAIConfig(id: number): Promise<OpenAIConfig> {
        const response = await apiClient.get(`/openai/configs/${id}`)
        return response
    },

    async createOpenAIConfig(config: OpenAIConfigRequest): Promise<OpenAIConfig> {
        const response = await apiClient.post('/openai/configs', config)
        return response
    },

    async updateOpenAIConfig(id: number, config: OpenAIConfigRequest): Promise<OpenAIConfig> {
        const response = await apiClient.put(`/openai/configs/${id}`, config)
        return response
    },

    async deleteOpenAIConfig(id: number): Promise<void> {
        await apiClient.delete(`/openai/configs/${id}`)
    },

    // AI Prompt Template methods
    async getPromptTemplates(): Promise<AIPromptTemplate[]> {
        const response = await apiClient.get('/openai/prompt-templates')
        return response
    },

    async getPromptTemplate(id: number): Promise<AIPromptTemplate> {
        const response = await apiClient.get(`/openai/prompt-templates/${id}`)
        return response
    },

    async createPromptTemplate(template: AIPromptTemplateRequest): Promise<AIPromptTemplate> {
        const response = await apiClient.post('/openai/prompt-templates', template)
        return response
    },

    async updatePromptTemplate(id: number, template: AIPromptTemplateRequest): Promise<AIPromptTemplate> {
        const response = await apiClient.put(`/openai/prompt-templates/${id}`, template)
        return response
    },

    async deletePromptTemplate(id: number): Promise<void> {
        await apiClient.delete(`/openai/prompt-templates/${id}`)
    },

    // AI Generation methods
    async generateEmailTemplate(request: GenerateEmailTemplateRequest): Promise<GenerateEmailTemplateResponse> {
        const response = await apiClient.post('/openai/generate-template', request)
        return response
    },

    async initializeDefaultTemplates(): Promise<{ message: string }> {
        const response = await apiClient.post('/openai/initialize-templates')
        return response
    },

    // Call OpenAI API method
    async callOpenAI(request: CallOpenAIRequest): Promise<CallOpenAIResponse> {
        const response = await apiClient.post('/openai/call', request)
        return response
    },

    // Test OpenAI configuration
    async testOpenAIConfig(config: OpenAIConfigRequest): Promise<{
        success: boolean
        message: string
        response?: string
        response_time_ms: number
        channel_type: string
        model: string
        tokens_used?: number
    }> {
        const response = await apiClient.post('/openai/test-config', config)
        return response
    }
}
