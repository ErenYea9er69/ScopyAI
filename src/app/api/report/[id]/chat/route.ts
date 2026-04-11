/**
 * POST /api/report/[id]/chat
 *
 * Streams a conversational response from LongCat, with the full report
 * injected as system context. The user can ask follow-up questions
 * about their market intelligence report.
 *
 * Body: { message: string, history?: { role: string, content: string }[] }
 */

import { NextRequest } from 'next/server';
import { getRandomClient, MODELS, trackTokenUsage } from '@/lib/ai/client';
import { reportStore } from '@/lib/store';

function buildSystemPrompt(report: any): string {
  return `You are the ScopyAI Report Analyst — a senior market intelligence advisor.

The user has generated a full 8-layer market intelligence report for:
NICHE: ${report.niche}
PERSONA: ${report.persona}
COMPOSITE SCORE: ${report.debate?.compositeScore ?? 'N/A'}/100
FINAL VERDICT: ${report.debate?.finalVerdict ?? 'N/A'}

=== FULL REPORT DATA ===
${JSON.stringify(report.layers)}

=== TRI-AGENT DEBATE ===
Builder: ${report.debate?.builder?.score ?? 'N/A'}/100 — ${report.debate?.builder?.reasoning ?? ''}
Cynic: ${report.debate?.cynic?.score ?? 'N/A'}/100 — ${report.debate?.cynic?.reasoning ?? ''}
Operator: ${report.debate?.operator?.score ?? 'N/A'}/100 — ${report.debate?.operator?.reasoning ?? ''}

=== SOURCES (${report.sources?.length ?? 0} citations) ===
${report.sources?.slice(0, 20).map((s: any, i: number) => `${i + 1}. ${s.title} (${s.url}) [${s.confidence}]`).join('\n') ?? 'No sources'}

INSTRUCTIONS:
- Answer based ONLY on the report data above. Do not hallucinate new market data.
- If a question goes beyond the report's data, say so explicitly.
- Provide specific, actionable advice backed by the report's findings.
- Reference specific layers, scores, and sources when answering.
- Be concise but insightful. Avoid generic advice.
- Format responses with bullet points and bold text for readability.`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = reportStore.get(id);

  if (!report) {
    return new Response(JSON.stringify({ error: 'Report not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { message, history = [] } = body;

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build messages array with history
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: buildSystemPrompt(report) },
    ...history.slice(-10).map((h: any) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const stream = await getRandomClient().chat.completions.create({
      model: MODELS.REASONING,
      messages,
      temperature: 0.5,
      stream: true,
    });

    // Create a ReadableStream from the OpenAI stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }

            // Track token usage from the final chunk
            if (chunk.usage) {
              trackTokenUsage(chunk.usage.total_tokens);
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[Chat API] Stream error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Chat API] Failed:', error);
    return new Response(JSON.stringify({ error: 'Chat generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
