"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const vscode = __importStar(require("vscode"));
const generative_ai_1 = require("@google/generative-ai");
class AIService {
    constructor(secretStorage) {
        this.secretStorage = secretStorage;
    }
    async getApiKey() {
        return await this.secretStorage.get("gemini_api_key");
    }
    async initAI() {
        let apiKey = await this.getApiKey();
        if (!apiKey || !apiKey.trim()) {
            throw new Error("Gemini API Key is not set. Please run 'PyAssist: Set API Key' command.");
        }
        // Always create a new instance to ensure we use the latest key
        return new generative_ai_1.GoogleGenerativeAI(apiKey.trim());
    }
    async generateText(prompt) {
        const genAI = await this.initAI();
        // Updated based on user's available model list and rate limit errors
        const modelsToTry = [
            "gemini-2.5-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-2.0-flash-lite-001",
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash-lite-preview-02-05",
            "gemini-2.0-flash-lite",
            "gemini-flash-latest",
            "gemini-pro-latest",
            "gemini-2.0-flash-exp",
            "gemini-2.5-pro"
        ];
        let lastError = null;
        let errorLog = [];
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = result.response;
                return response.text();
            }
            catch (error) {
                console.warn(`Model ${modelName} failed:`, error);
                lastError = error;
                errorLog.push(`${modelName}: ${error.message}`);
            }
        }
        // Check if we hit rate limits (429)
        const isRateLimit = errorLog.some(e => e.includes("429") || e.includes("Too Many Requests"));
        const apiKey = await this.getApiKey();
        const maskedKey = apiKey ? `Ends with: ...${apiKey.trim().slice(-4)}` : "Key is undefined";
        if (isRateLimit) {
            throw new Error(`Quota Exceeded (429). Please wait a moment or check your API billing. Key: ${maskedKey}`);
        }
        // Fallback for other errors
        let availableModels = "Could not fetch models";
        try {
            // @ts-ignore
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            if (data.models) {
                availableModels = data.models.map((m) => m.name.replace('models/', '')).join(', ');
            }
            else if (data.error) {
                availableModels = `API Error: ${data.error.message}`;
            }
        }
        catch (err) {
            availableModels = `Fetch Error: ${err.message}`;
        }
        const detailedErrors = errorLog.join(" | ");
        throw new Error(`All Gemini models failed. \nKey: ${maskedKey} \nErrors: [${detailedErrors}] \nAvailable Models: [${availableModels}]`);
    }
    cleanResponse(text) {
        // Remove markdown code blocks if present
        const match = text.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
        if (match) {
            return match[1].trim();
        }
        // Fallback: just strip common markdown markers if regex didn't catch a block
        return text.replace(/```python|```/g, "").trim();
    }
    async analyzeCode(code) {
        const prompt = `
        You are a Python code analyzer. Analyze the following code for logical errors, syntax issues, and potential runtime risks. 
        Return a JSON array of errors with the format: { "errors": [{ "line": number, "message": "string", "severity": "Error|Warning" }] }. 
        The line number should be 1-based. 
        IMPORTANT: Return ONLY valid JSON.
        
        Code:
        ${code}
        `;
        let text = await this.generateText(prompt);
        if (!text)
            return { diagnostics: [], rawErrors: [] };
        // Clean up markdown if present
        text = this.cleanResponse(text);
        try {
            const parsed = JSON.parse(text);
            const errors = parsed.errors || parsed; // Handle both structure if model varies
            if (!Array.isArray(errors))
                return { diagnostics: [], rawErrors: [] };
            const diagnostics = errors.map((err) => {
                const line = (err.line || 1) - 1; // Convert to 0-based
                const range = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 100)); // Highlight full line
                const severity = err.severity === "Error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
                return new vscode.Diagnostic(range, err.message, severity);
            });
            return { diagnostics, rawErrors: errors };
        }
        catch (e) {
            console.error("Failed to parse Gemini response", e);
            throw new Error("Failed to parse AI response. Please try again.");
        }
    }
    async improveCode(code) {
        const prompt = `
        You are a Python expert. Optimize the following code for time complexity, readability, and PEP8 standards. 
        IMPORTANT: Return ONLY the raw Python code. Do NOT start with "Here is the code" or typical conversational filler. 
        Do NOT use markdown code blocks if possible, but if you do, ensure they are standard.
        
        Code:
        ${code}
        `;
        const text = await this.generateText(prompt);
        return this.cleanResponse(text);
    }
    async generateCode(comment) {
        const prompt = `
        You are a Python code generator. Generate Python code based on the following comment/request. 
        IMPORTANT: Return ONLY the raw Python code. Do NOT provide explanations, introductory text, or concluding remarks.
        Just the code.
        
        Request:
        ${comment}
        `;
        const text = await this.generateText(prompt);
        return this.cleanResponse(text);
    }
    async chat(message, codeContext) {
        const prompt = `
        System: You are a helpful assistant for a Python developer. You answer questions about the code.
        Current Code Context:
        ${codeContext}
        
        User: ${message}
        `;
        return await this.generateText(prompt);
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiService.js.map