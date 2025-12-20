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
        // Updated based on user's available model list
        const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-flash-latest", "gemini-pro-latest", "gemini-2.5-flash"];
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = result.response;
                return response.text();
            }
            catch (error) {
                console.warn(`Model ${modelName} failed:`, error);
            }
        }
        // If all failed, try to list available models to help verify the key/access
        const apiKey = await this.getApiKey();
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
        const maskedKey = apiKey ? `Ends with: ...${apiKey.trim().slice(-4)}` : "Key is undefined";
        throw new Error(`All Gemini models failed. API Response: [${availableModels}]. Key Debug: ${maskedKey}`);
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
        text = text.replace(/```json|```/g, "").trim();
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
        Return ONLY the improved Python code, without markdown formatting or code blocks.
        
        Code:
        ${code}
        `;
        const text = await this.generateText(prompt);
        return text.replace(/```python|```/g, "").trim();
    }
    async generateCode(comment) {
        const prompt = `
        You are a Python code generator. Generate Python code based on the following comment/request. 
        Return ONLY the code, without explanation or markdown blocks.
        
        Request:
        ${comment}
        `;
        const text = await this.generateText(prompt);
        return text.replace(/```python|```/g, "").trim();
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