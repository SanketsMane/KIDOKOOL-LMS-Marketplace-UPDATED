import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth"; // Assuming this is your auth path
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

// Initialize Gemini
// Note: In production, use process.env.GEMINI_API_KEY
// User provided key: AIzaSyB2C...
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyB2C_3Lz8oDWskMTMH7coKJ5AsyeEAfkZs");

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    
    // Optional: Allow guests? For now, strictly require auth as per "history" requirement
    if (!session?.user) {
      console.error("Gemini Chat: Unauthorized access");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, conversationId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    console.log("Gemini Chat: Processing message for user", session.user.id);

    // 1. Get or Create Conversation
    let conversation;
    if (conversationId) {
      conversation = await (prisma as any).aiConversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } } // Get history
      });

      // Verify ownership
      if (conversation && conversation.userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized access to conversation" }, { status: 403 });
      }
    }

    if (!conversation) {
      conversation = await (prisma as any).aiConversation.create({
        data: {
          userId: session.user.id,
          title: message.substring(0, 30) + "..."
        },
        include: { messages: true }
      });
    }

    // 2. Prepare History for Gemini
    // Gemini expects role: 'user' | 'model'
    // Our DB stores 'user' | 'model' (matched)
    const history = conversation.messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 3. Start Chat
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    // 4. Send Message to AI
    console.log("Gemini Chat: Sending to AI...");
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();
    console.log("Gemini Chat: Received response");

    // 5. Save Messages to DB
    await prisma.$transaction([
      // User Message
      (prisma as any).aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: message
        }
      }),
      // AI Response
      (prisma as any).aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'model',
          content: text
        }
      })
    ]);

    return NextResponse.json({ 
      response: text,
      conversationId: conversation.id 
    });

  } catch (error: any) {
    console.error("Gemini Chat Internal Error:", error);
    return NextResponse.json({ 
      error: "Failed to process request",
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json([], { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const conversationId = searchParams.get("conversationId");

    if (conversationId) {
        // Get specific conversation messages
         const conversation = await (prisma as any).aiConversation.findUnique({
            where: { id: conversationId },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
         });
         
         if (conversation && conversation.userId !== session.user.id) {
             return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
         }

         return NextResponse.json(conversation);
    } else {
        // List conversations
        const conversations = await (prisma as any).aiConversation.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: 'desc' },
            take: 10
        });
        return NextResponse.json(conversations);
    }
  } catch(error) {
     return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
