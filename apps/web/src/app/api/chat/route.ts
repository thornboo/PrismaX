import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { chatService } from "@/lib/services";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY_NOT_SET" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: unknown;
        conversationId?: unknown;
        content?: unknown;
        text?: unknown;
        model?: unknown;
        messages?: unknown;
      }
    | null;

  const conversationId =
    asNonEmptyString(body?.conversationId) ?? asNonEmptyString(body?.id);
  const contentFromBody = asNonEmptyString(body?.content);
  const textFromBody = asNonEmptyString(body?.text);

  const messages = Array.isArray(body?.messages) ? (body?.messages as Array<any>) : null;
  const contentFromMessages = (() => {
    if (!messages || messages.length === 0) return null;
    const last = messages[messages.length - 1] as any;

    const direct = asNonEmptyString(last?.content);
    if (direct) return direct;

    const parts = Array.isArray(last?.parts) ? (last.parts as Array<any>) : null;
    if (!parts || parts.length === 0) return null;

    const text = parts
      .filter((p) => p && p.type === "text")
      .map((p) => asNonEmptyString(p.text) ?? "")
      .join("")
      .trim();

    return text.length > 0 ? text : null;
  })();

  const content = contentFromBody ?? textFromBody ?? contentFromMessages;

  const modelId =
    asNonEmptyString(body?.model) ??
    process.env.OPENAI_MODEL ??
    "gpt-4o-mini";

  if (!conversationId || !content) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  try {
    const { stream } = await chatService.sendMessage({
      userId: session.user.id,
      conversationId,
      content,
      modelId,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const token of stream) {
            if (request.signal.aborted) break;
            controller.enqueue(encoder.encode(token));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "发送失败";
          controller.enqueue(encoder.encode(`（${message}）`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SERVER_ERROR";
    if (message === "Conversation not found") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
