/**
 * API Utility Module
 * Handles all server communication
 */
export class API {
    static async post(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Request failed');
            }

            return result.data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    static async processText(content, options) {
        return this.post('/api/process-text', { content, options });
    }

    static async analyzeContent(content) {
        return this.post('/api/analyze', { content });
    }

    static async getExpertSuggestions(content, rules) {
        return this.post('/api/ai/suggest', { content, rules });
    }
}
