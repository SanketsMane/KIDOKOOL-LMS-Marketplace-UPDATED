
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyB2C_3Lz8oDWskMTMH7coKJ5AsyeEAfkZs";

async function main() {
  console.log("--- Listing Models ---");
  try {
    // We cannot list models directly with the high-level SDK easily in a simple script without authenticated client setup sometimes, 
    // but the error message suggested it. 
    // Actually, the SDK *does* have a getGenerativeModel, but listing might be on the GoogleGenerativeAI instance?
    // Checking docs... actually, let's try a direct fetch if the SDK doesn't expose it easily, 
    // but the SDK *should*.
    
    // Let's try falling back to a known stable model 'gemini-1.0-pro' first in the debug script to see if that works as a quick check.
    // But listing is better.
    
    // The SDK doesn't always expose listModels directly in the main class in older versions, but let's try to just fetch the list via REST if SDK fails.
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
        console.log("Available Models:");
        data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
        console.error("Failed to list models:", data);
    }

  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

main();
