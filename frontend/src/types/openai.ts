// OpenAI Configuration Types

export type AIChannelType = 'openai' | 'gemini' | 'claude'

export interface OpenAIConfig {
    id: number
    name: string
    channel_type: AIChannelType
    base_url: string
    api_key: string
    model: string
    headers?: Record<string, string>
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface OpenAIConfigRequest {
    name: string
    channel_type: AIChannelType
    base_url: string
    api_key: string
    model: string
    headers?: Record<string, string>
    is_active: boolean
}

// AI Prompt Template Types

export interface AIPromptTemplate {
    id: number
    scenario: string
    name: string
    description?: string
    system_prompt: string
    user_prompt?: string
    variables?: Record<string, string>
    max_tokens: number
    temperature: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface AIPromptTemplateRequest {
    scenario: string
    name: string
    description?: string
    system_prompt: string
    user_prompt?: string
    variables?: Record<string, string>
    max_tokens: number
    temperature: number
    is_active: boolean
}

// AI Generation Types

export interface GenerateEmailTemplateRequest {
    user_input: string
    scenario?: string
    template_name: string
    description?: string
}

export interface GenerateEmailTemplateResponse {
    id: number
    name: string
    description?: string
    user_input: string
    generated_content: string
    extractor_config: ExtractorConfig[]
    model: string
    tokens_used: number
    created_at: string
}

// Import ExtractorConfig from existing types
export interface ExtractorConfig {
    field: string
    type: string
    match?: string
    extract: string
}

// Call OpenAI API Types

export interface CallOpenAIRequest {
    config_id: number
    template_id?: number
    system_prompt?: string
    user_message: string
    variables?: Record<string, string>
    max_tokens?: number
    temperature?: number
    response_format?: 'text' | 'json'
}

export interface CallOpenAIResponse {
    content: string
    model: string
    tokens_used: number
    temperature: number
    response_type: string
}
