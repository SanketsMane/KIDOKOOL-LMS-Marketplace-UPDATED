
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const prisma = new PrismaClient();
const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyB2C_3Lz8oDWskMTMH7coKJ5AsyeEAfkZs";

async function main() {
  console.log("--- Starting Debug ---");

  // 1. Check Prisma Models
  console.log("1. Checking Database...");
  try {
    if (!prisma.aiConversation) {
      console.error("❌ Link Error: prisma.aiConversation is undefined. Did you run `npx prisma generate`?");
    } else {
        const count = await prisma.aiConversation.count();
        console.log("✅ Database Connected. Conversation Count:", count);
    }
  } catch (e) {
    console.error("❌ Database Error:", e.message);
  }

  // 2. Check Gemini API
  console.log("\n2. Checking Gemini API...");
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log("Using API Key:", API_KEY.substring(0, 10) + "...");
    
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    const text = response.text();
    console.log("✅ Gemini Response:", text);
  } catch (e) {
    console.error("❌ Gemini API Error:", e.message);
    if(e.message.includes("404")) {
        console.log("Try using 'gemini-1.5-flash' instead of 'gemini-pro'");
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
