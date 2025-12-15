import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIService {
    private genAI: GoogleGenerativeAI | undefined;

    constructor(private secretStorage: vscode.SecretStorage) { }

    private async getApiKey(): Promise<string | undefined> {
        return await this.secretStorage.get("gemini_api_key");
    }

    private async initAI(): Promise<GoogleGenerativeAI> {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            throw new Error("Gemini API Key is not set. Please run 'PyAssist: Set API Key' command.");
        }
        if (!this.genAI) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
        return this.genAI;
    }

    public async analyzeCode(code: string): Promise<vscode.Diagnostic[]> {
        const genAI = await this.initAI();
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest"
        });

        const prompt = `
        You are a Python code analyzer. Analyze the following code for logical errors, syntax issues, and potential runtime risks. 
        Return a JSON array of errors with the format: { "errors": [{ "line": number, "message": "string", "severity": "Error|Warning" }] }. 
        The line number should be 1-based. 
        
        Code:
        ${code}
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        if (!text) return [];

        try {
            const parsed = JSON.parse(text);
            const errors = parsed.errors || parsed; // Handle both structure if model varies

            if (!Array.isArray(errors)) return [];

            return errors.map((err: any) => {
                const line = (err.line || 1) - 1; // Convert to 0-based
                const range = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 100)); // Highlight full line
                const severity = err.severity === "Error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
                return new vscode.Diagnostic(range, err.message, severity);
            });
        } catch (e) {
            console.error("Failed to parse Gemini response", e);
            return [];
        }
    }

    public async improveCode(code: string): Promise<string> {
        const genAI = await this.initAI();
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
        You are a Python expert. Optimize the following code for time complexity, readability, and PEP8 standards. 
        Return ONLY the improved Python code, without markdown formatting or code blocks.
        
        Code:
        ${code}
        `;

        const result = await model.generateContent(prompt);
        return result.response.text().replace(/```python|```/g, "").trim();
    }

    public async generateCode(comment: string): Promise<string> {
        const genAI = await this.initAI();
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
        You are a Python code generator. Generate Python code based on the following comment/request. 
        Return ONLY the code, without explanation or markdown blocks.
        
        Request:
        ${comment}
        `;

        const result = await model.generateContent(prompt);
        return result.response.text().replace(/```python|```/g, "").trim();
    }

    public async chat(message: string, codeContext: string): Promise<string> {
        const genAI = await this.initAI();
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
        System: You are a helpful assistant for a Python developer. You answer questions about the code.
        Current Code Context:
        ${codeContext}
        
        User: ${message}
        `;

        const result = await model.generateContent(prompt);
        return result.response.text();
    }
}
