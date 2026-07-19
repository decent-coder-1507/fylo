import { globalAiService } from "./src/modules/ai/ai.service";

async function main() {
    console.log("🚀 Starting AI Infrastructure Integration Test...");
    console.log(`Active Provider: ${globalAiService.getProviderName()}`);

    try {
        console.log("\n1. Testing Text Generation (Flash model)...");
        const textResult = await globalAiService.generateText("flash", {
            prompt: "Tell me a 1-sentence joke about databases.",
            temperature: 0.7,
        });
        console.log("✅ Text Generation Success:");
        console.log(`Joke: ${textResult.text}`);
        console.log(`Usage: ${JSON.stringify(textResult.usage)}`);
    } catch (err: any) {
        console.error("❌ Text Generation Failed:", err.message);
    }

    try {
        console.log("\n2. Testing Structured Output (Flash model)...");
        const schema = {
            type: "OBJECT",
            properties: {
                setup: { type: "STRING" },
                punchline: { type: "STRING" },
            },
            required: ["setup", "punchline"],
        };

        const structResult = await globalAiService.generateStructured<{ setup: string; punchline: string }>("flash", {
            prompt: "Tell me a setup and punchline joke about developers.",
            responseSchema: schema,
        });
        console.log("✅ Structured Output Success:");
        console.log(`Joke: ${JSON.stringify(structResult.data, null, 2)}`);
        console.log(`Usage: ${JSON.stringify(structResult.usage)}`);
    } catch (err: any) {
        console.error("❌ Structured Output Failed:", err.message);
    }

    try {
        console.log("\n3. Testing Embeddings...");
        const embedResult = await globalAiService.embed({
            text: "TeleStore AI Infrastructure layer.",
        });
        console.log("✅ Embeddings Success:");
        console.log(`Dimensions: ${embedResult.values.length}`);
        console.log(`First 5 values: [${embedResult.values.slice(0, 5).join(", ")}]`);
    } catch (err: any) {
        console.error("❌ Embeddings Failed:", err.message);
    }
}

main().catch(console.error);
