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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const vscode = __importStar(require("vscode"));
const openai_1 = __importDefault(require("openai"));
class OpenAIService {
    constructor(secretStorage) {
        this.secretStorage = secretStorage;
    }
    async getApiKey() {
        return await this.secretStorage.get("openai_api_key");
    }
    async initOpenAI() {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            throw new Error("OpenAI API Key is not set. Please run 'PyAssist: Set API Key' command.");
        }
        if (!this.openai || this.openai.apiKey !== apiKey) {
            this.openai = new openai_1.default({ apiKey });
        }
        return this.openai;
    }
    async analyzeCode(code) {
        const openai = await this.initOpenAI();
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a Python code analyzer. Analyze the following code for logical errors, syntax issues, and potential runtime risks. Return a JSON array of errors with the format: [{ \"line\": number, \"message\": \"string\", \"severity\": \"eval(Error|Warning)\" }]. The line number should be 1-based. Do not include any markdown formatting, only the raw JSON." },
                { role: "user", content: code }
            ],
            response_format: { type: "json_object" }
        });
        const content = response.choices[0].message.content;
        if (!content)
            return [];
        try {
            const result = JSON.parse(content);
            const errors = result.errors || result; // Handle both top-level array or object with errors key
            if (!Array.isArray(errors))
                return [];
            return errors.map((err) => {
                const line = (err.line || 1) - 1; // Convert to 0-based
                const range = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 100)); // Highlight full line
                const severity = err.severity === "Error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
                return new vscode.Diagnostic(range, err.message, severity);
            });
        }
        catch (e) {
            console.error("Failed to parse OpenAI response", e);
            return [];
        }
    }
    async improveCode(code) {
        const openai = await this.initOpenAI();
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a Python expert. Optimize the following code for time complexity, readability, and PEP8 standards. Return ONLY the improved Python code, without markdown formatting or code blocks." },
                { role: "user", content: code }
            ]
        });
        return response.choices[0].message.content || code;
    }
    async generateCode(comment) {
        const openai = await this.initOpenAI();
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a Python code generator. Generate Python code based on the following comment/request. Return ONLY the code, without explanation." },
                { role: "user", content: comment }
            ]
        });
        return response.choices[0].message.content || "";
    }
    async chat(message, codeContext) {
        const openai = await this.initOpenAI();
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful assistant for a Python developer. You answer questions about the code." },
                { role: "system", content: `Current Code Context:\n${codeContext}` },
                { role: "user", content: message }
            ]
        });
        return response.choices[0].message.content || "I couldn't generate a response.";
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=openaiService.js.map