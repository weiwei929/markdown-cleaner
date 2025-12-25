const { GoogleGenerativeAI } = require('@google/generative-ai');

class AI {
    constructor() {
        this.genAI = null;
        this.model = null;
    }

    initialize() {
        if (!process.env.GEMINI_API_KEY) {
            console.warn('⚠️ GEMINI_API_KEY is not set. AI features will be disabled.');
            return;
        }
        try {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            console.log('✅ Gemini AI initialized (gemini-1.5-flash)');
        } catch (error) {
            console.error('❌ Failed to initialize Gemini AI:', error);
        }
    }

    async suggest(content, rules = {}) {
        if (!this.model) {
            this.initialize();
            if (!this.model) {
                throw new Error('AI service is not configured (Missing API Key)');
            }
        }

        try {
            const prompt = this.constructPrompt(content, rules);
            console.log('🤖 Sending request to Gemini API...');
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            console.log('✅ Received response from Gemini API');
            return this.parseResponse(text);
        } catch (error) {
            console.error('❌ AI Suggestion Error:', error.message);
            
            // Return a friendly error response instead of crashing
            return {
                summary: `AI 分析失败：${error.message}`,
                issues: []
            };
        }
    }

  constructPrompt(content, rules) {
      const userPrompt = rules.prompt || 'Please analyze this text and provide improvement suggestions.';
      
      return `
  You are an expert Markdown editor and proofreader.
  Your task is to analyze the following text based on the user's requirements and provide structured suggestions.
  
  **CRITICAL SYSTEM RULES:**
  1. **Language**: The document is Chinese. You MUST provide all results and suggestions in **Simplified Chinese** (简体中文).
  2. **Scope**: Focus ONLY on proofreading and editing quality: typos, grammar, wording, punctuation, spacing, terminology consistency, and Markdown formatting. Do NOT add moral judgment or content review.
  3. **Be Thorough**: You MUST find and report ALL issues, even minor ones. Do NOT say "no issues found" unless the text is truly perfect.
  4. **Traditional Chinese Detection**: If you find ANY traditional Chinese characters (繁體字), you MUST report them as issues with type "traditional-chinese" and suggest the simplified equivalent.
  
  User Requirements:
  "${userPrompt}"

Target Text:
"""
${content}
"""

**Analysis Instructions:**
- Carefully examine EVERY character, word, and punctuation mark
- Look for traditional Chinese characters (e.g., 電→电, 當→当, 鬆→松, 機→机, 觀→观, 純→纯)
- Check punctuation consistency (Chinese vs English punctuation)
- Identify spacing issues (especially around numbers and punctuation)
- Report ALL findings, no matter how minor

  Please provide your response in strict JSON format with the following structure:
  {
      "summary": "Brief summary of the analysis (in Simplified Chinese). If issues were found, mention how many and what types.",
      "issues": [
          {
              "type": "grammar" | "style" | "typo" | "consistency" | "punctuation" | "spacing" | "traditional-chinese" | "other",
              "severity": "high" | "medium" | "low",
              "description": "Description of the issue (in Simplified Chinese)",
              "suggestion": "Suggested fix",
              "originalText": "The text segment causing the issue",
              "context": "Surrounding text for context"
          }
      ]
  }
  
  **IMPORTANT**: The "issues" array should contain ALL problems found. If you find traditional Chinese characters, spacing issues, or punctuation problems, they MUST be included in the array. Do NOT return an empty array unless the text is truly flawless.
  
  Ensure the JSON is valid and contains no other text outside the JSON block.
  `;
  }

    parseResponse(text) {
        try {
            // Clean up potential markdown code blocks
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            // 记录错误但不抛出，返回友好的默认结构
            const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
            console.error('Failed to parse AI response. Preview:', preview);
            return {
                summary: 'AI 响应格式错误，无法解析为 JSON。这可能是因为 AI 返回了非 JSON 格式的内容。',
                issues: []
            };
        }
    }
}

module.exports = new AI();
