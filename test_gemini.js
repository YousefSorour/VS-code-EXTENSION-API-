const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function run() {
    try {
        // For text-only input, use the gemini-pro model
        console.log("Testing Model Availability...");
        // const model = genAI.getGenerativeModel({ model: "gemini-pro"});
        // const result = await model.generateContent("Hello!");
        // const response = await result.response;
        // const text = response.text();
        // console.log(text);

        // Listing models
        console.log("Listing Available Models:");
        // Note: older SDK versions might not have listModels on the client directly in the same way, 
        // but looking at recent docs it is supported via the model manager or similar.
        // Actually, usually it's a separate API call. 
        // If listModels isn't easy to access in the helper, let's just try to hit the model.

        const modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];

        for (const modelName of modelsToTry) {
            console.log(`Trying ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Test");
                console.log(`SUCCESS: ${modelName} works.`);
                return;
            } catch (e) {
                console.log(`FAILED: ${modelName} - ${e.message}`);
            }
        }
    } catch (error) {
        console.error("Global Error:", error);
    }
}

run();
