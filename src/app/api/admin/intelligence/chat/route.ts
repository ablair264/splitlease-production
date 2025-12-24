import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  intelligenceChatSessions,
  intelligenceChatMessages,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { streamChatWithIntelligence, generateMarketSummary } from '@/lib/intelligence/analyzer';

export const maxDuration = 60;

/**
 * POST /api/admin/intelligence/chat
 * Streaming chat endpoint for market intelligence
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, generateSummary } = body;

    // If requesting a summary, generate it directly
    if (generateSummary) {
      const summary = await generateMarketSummary();
      return new Response(
        JSON.stringify({ type: 'summary', content: summary }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get or create session
    let session;
    if (sessionId) {
      const sessions = await db
        .select()
        .from(intelligenceChatSessions)
        .where(eq(intelligenceChatSessions.id, sessionId))
        .limit(1);
      session = sessions[0];
    }

    if (!session) {
      const [newSession] = await db
        .insert(intelligenceChatSessions)
        .values({
          isActive: true,
        })
        .returning();
      session = newSession;
    }

    // Get conversation history
    const history = await db
      .select()
      .from(intelligenceChatMessages)
      .where(eq(intelligenceChatMessages.sessionId, session.id))
      .orderBy(intelligenceChatMessages.createdAt);

    const conversationHistory = history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Store user message
    await db.insert(intelligenceChatMessages).values({
      sessionId: session.id,
      role: 'user',
      content: message,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send session ID first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'session', sessionId: session.id })}\n\n`)
          );

          // Stream the response
          const responseStream = await streamChatWithIntelligence(message, conversationHistory);

          for await (const chunk of responseStream) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
            );
          }

          // Store assistant message
          await db.insert(intelligenceChatMessages).values({
            sessionId: session.id,
            role: 'assistant',
            content: fullResponse,
          });

          // Send done signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: 'Failed to generate response' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET /api/admin/intelligence/chat
 * Get chat history for a session
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      // Return recent sessions
      const sessions = await db
        .select()
        .from(intelligenceChatSessions)
        .where(eq(intelligenceChatSessions.isActive, true))
        .orderBy(desc(intelligenceChatSessions.updatedAt))
        .limit(10);

      return new Response(JSON.stringify({ sessions }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get session and messages
    const messages = await db
      .select()
      .from(intelligenceChatMessages)
      .where(eq(intelligenceChatMessages.sessionId, sessionId))
      .orderBy(intelligenceChatMessages.createdAt);

    return new Response(
      JSON.stringify({
        sessionId,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get chat history' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
