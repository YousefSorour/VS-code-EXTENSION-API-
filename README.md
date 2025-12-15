# PyAssist-AI Walkthrough

**PyAssist-AI** is a VS Code extension that acts as your Python AI companion. It uses Google's **Gemini API** to analyze code, suggest improvements, generate code, and chat.

## Features

### 1. Error Detection 🐞
Automatically scans your Python code for logical errors and likely bugs that standard linters might miss.
- **Command**: `PyAssist: Scan for Errors`
- **Output**: Diagnostics (red/yellow squiggles) directly in the editor.

### 2. Code Improvement ✨
Suggests cleaner, more "Pythonic" versions of your code.
- **Command**: `PyAssist: Improve Code`
- **Action**: Select code -> Run Command.
- **Output**: Opens a Diff View showing the suggested changes.

### 3. Code Generation 🚀
Generates Python code from comments or natural language descriptions.
- **Command**: `PyAssist: Generate Code from Comment`
- **Action**: Place cursor on a comment -> Run Command.
- **Output**: Inserts the generated code below.

### 4. AI Chatbot 🤖
A built-in sidebar chat for asking questions about your code or Python in general.
- **Access**: Click the robot icon in the Activity Bar.
- **Context Aware**: The chatbot knows the content of your currently active file.

## Setup & Usage

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Compile**:
    ```bash
    npm run compile
    ```
3.  **Run**:
    - Press `F5` to open the **Extension Development Host**.
4.  **Configure API Key**:
    - In the new window, run `PyAssist: Set API Key`.
    - Enter your **Google Gemini API Key** (get one from [Google AI Studio](https://aistudio.google.com/)).

## Verified Migration
- [x] Migrated from OpenAI to Google Gemini (`@google/generative-ai`).
- [x] Fixed "Model Not Found" errors by using `gemini-2.0-flash`.
- [x] Fixed "Quota Exceeded" errors by switching to `gemini-flash-latest`.

## Demo
Open [demo.py](file:///c:/Users/Yousef%20Sorour/OneDrive/Desktop/VS-code-EXTENSION-API-/demo.py) in the Extension Host to safely test all features!
