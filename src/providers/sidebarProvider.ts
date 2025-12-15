import * as vscode from 'vscode';
import { AIService } from '../aiService';

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly aiService: AIService
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "sendMessage": {
                    if (!data.value) {
                        return;
                    }
                    try {
                        // Get active editor content
                        const editor = vscode.window.activeTextEditor;
                        const codeContext = editor ? editor.document.getText() : "";

                        webviewView.webview.postMessage({ type: 'addMessage', value: data.value, isUser: true });

                        const response = await this.aiService.chat(data.value, codeContext);

                        webviewView.webview.postMessage({ type: 'addMessage', value: response, isUser: false });
                    } catch (error: any) {
                        vscode.window.showErrorMessage(error.message);
                        webviewView.webview.postMessage({ type: 'addMessage', value: "Error: " + error.message, isUser: false });
                    }
                    break;
                }
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "src", "media", "reset.css"));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "src", "media", "vscode.css"));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "src", "media", "sidebar.css"));

        // Use a simple HTML template directly or load from file. 
        // Loading from file is cleaner but since we need to inject URIs, reading the file and replacing strings is common.
        // However, for simplicity and single-file creation, I will embed the HTML structure here or read it from disk if I write it to disk.
        // The prompt asked for `src/media/sidebar.html`, so I will assume I can read it.
        // But to make `resolveWebviewView` work immediately without extra file reading logic (fs),
        // I will write the HTML file to disk as requested, but also `fs.readFileSync` it here? 
        // Or just hardcode the HTML string here? The user explicitly asked for `src/media/sidebar.html` file to be generated.
        // So I must generate that file.
        // For the extension to use it, I need to read it.

        // To avoid 'fs' import issues or complexity, I'll assume the HTML file is static and I'll just load it.
        // Actually, simpler: I'll put the HTML content in the `sidebar.html` file, but `_getHtmlForWebview` must READ that file.
        // Wait, standard VS Code webviews often build the HTML string dynamically to insert CSP and URIs.
        // If I write a static `sidebar.html`, I can't easily inject the URIs for CSS unless I use a placeholder.

        // Plan: Write `sidebar.html` with placeholders like `{{styles}}`.
        // Then read it here.

        // Wait, I can't easily use `fs` in the browser environment if this was web, but this is Node.
        // So `fs` is fine.

        const fs = require('fs');
        const path = require('path');
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, "src", "media", "sidebar.html").fsPath;
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        htmlContent = htmlContent
            .replace("{{styleMainUri}}", styleMainUri.toString())
            .replace("{{cspSource}}", webview.cspSource);

        return htmlContent;
    }
}
