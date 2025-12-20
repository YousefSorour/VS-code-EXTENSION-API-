import * as vscode from 'vscode';
import { AIService } from './aiService';
import { SidebarProvider } from './providers/sidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('PyAssist-AI is now active!');

    const secretStorage = context.secrets;
    const aiService = new AIService(secretStorage);

    // Register Sidebar Provider
    const sidebarProvider = new SidebarProvider(context.extensionUri, aiService);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("pyassist-sidebar", sidebarProvider)
    );

    // Diagnostics Collection
    const diagnosticCollection = vscode.languages.createDiagnosticCollection("pyassist");
    context.subscriptions.push(diagnosticCollection);

    // Command: Set API Key
    context.subscriptions.push(
        vscode.commands.registerCommand('pyassist.setApiKey', async () => {
            const key = await vscode.window.showInputBox({
                prompt: 'Enter your Google Gemini API Key',
                password: true,
                ignoreFocusOut: true
            });
            if (key) {
                await secretStorage.store("gemini_api_key", key);
                vscode.window.showInformationMessage("API Key saved securely.");
            }
        })
    );

    // Command: Scan for Errors
    context.subscriptions.push(
        vscode.commands.registerCommand('pyassist.scanForErrors', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'python') {
                vscode.window.showWarningMessage("Please open a Python file to scan.");
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "PyAssist: Scanning for errors...",
                cancellable: false
            }, async () => {
                try {
                    const { diagnostics, rawErrors } = await aiService.analyzeCode(editor.document.getText());
                    diagnosticCollection.set(editor.document.uri, diagnostics);

                    if (diagnostics.length === 0) {
                        vscode.window.showInformationMessage("No errors found!");
                    } else {
                        vscode.window.showWarningMessage(`Found ${diagnostics.length} issues.`);

                        // Open JSON Report
                        const reportContent = JSON.stringify({ errors: rawErrors }, null, 2);
                        const doc = await vscode.workspace.openTextDocument({ content: reportContent, language: 'json' });
                        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
                    }
                } catch (error: any) {
                    vscode.window.showErrorMessage(error.message);
                }
            });
        })
    );

    // Command: Improve Code (Refactoring)
    context.subscriptions.push(
        vscode.commands.registerCommand('pyassist.improveCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const selection = editor.selection;
            const text = editor.document.getText(selection);
            if (!text) {
                vscode.window.showWarningMessage("No code selected.");
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "PyAssist: Improving code...",
                cancellable: false
            }, async () => {
                try {
                    const improvedCode = await aiService.improveCode(text);

                    // Show Diff View
                    const originalDoc = await vscode.workspace.openTextDocument({ content: text, language: 'python' });
                    const improvedDoc = await vscode.workspace.openTextDocument({ content: improvedCode, language: 'python' });

                    vscode.commands.executeCommand('vscode.diff', originalDoc.uri, improvedDoc.uri, 'PyAssist Suggestion');
                } catch (error: any) {
                    vscode.window.showErrorMessage(error.message);
                }
            });
        })
    );

    // Command: Generate Code from Comment
    context.subscriptions.push(
        vscode.commands.registerCommand('pyassist.generateCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const selection = editor.selection;
            // If selection is empty, take the current line
            const range = selection.isEmpty ? editor.document.lineAt(selection.active.line).range : selection;
            const comment = editor.document.getText(range);

            if (!comment.trim()) {
                vscode.window.showWarningMessage("Please select a comment or place cursor on a comment line.");
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "PyAssist: Generating code...",
                cancellable: false
            }, async () => {
                try {
                    const generatedCode = await aiService.generateCode(comment);
                    editor.edit(editBuilder => {
                        // Insert after the selection/line
                        editBuilder.insert(range.end, "\n" + generatedCode);
                    });
                } catch (error: any) {
                    vscode.window.showErrorMessage(error.message);
                }
            });
        })
    );

    // Auto-scan on save
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (document.languageId === 'python') {
                try {
                    // Re-using the logic from scanForErrors 
                    const { diagnostics } = await aiService.analyzeCode(document.getText());
                    diagnosticCollection.set(document.uri, diagnostics);
                } catch (e) {
                    console.error(e);
                }
            }
        })
    );
}

export function deactivate() { }
