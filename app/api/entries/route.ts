import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createEntrySchema } from "@/lib/entry-schema";
import { authOptions } from "@/lib/auth";
import { containsProfanity, looksLikeSpam } from "@/lib/content-guard";
import { logError, logInfo } from "@/lib/logger";

type RateLimitState = {
  count: number;
  windowStart: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitStore = new Map<string, RateLimitState>();

const getClientKey = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstForwarded = forwardedFor.split(",")[0]?.trim();
    if (firstForwarded) {
      return firstForwarded;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown-client";
};

const isRateLimited = (clientKey: string): boolean => {
  const now = Date.now();
  const current = rateLimitStore.get(clientKey);
  if (!current) {
    rateLimitStore.set(clientKey, { count: 1, windowStart: now });
    return false;
  }

  if (now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(clientKey, { count: 1, windowStart: now });
    return false;
  }

  current.count += 1;
  rateLimitStore.set(clientKey, current);
  return current.count > RATE_LIMIT_MAX_REQUESTS;
};

const parsePayload = (body: unknown) => {
  const result = createEntrySchema.safeParse(body);
  if (!result.success) {
    return null;
  }

  return {
    text: result.data.text,
    timestamp: result.data.timestamp,
    latitude: result.data.latitude,
    longitude: result.data.longitude,
  };
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const entries = await prisma.entry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        rawText: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    logError("entries.list_failed", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "We couldn't load entries right now." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) {
    logInfo("entries.rate_limited", { clientKey });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait and try again." },
      { status: 429 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    logInfo("entries.invalid_json", { clientKey, userId: session.user.id });
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const payload = parsePayload(body);
  if (!payload) {
    logInfo("entries.invalid_payload", { clientKey, userId: session.user.id });
    return NextResponse.json(
      { error: "Invalid payload: expected text, timestamp, latitude, longitude." },
      { status: 400 },
    );
  }

  if (containsProfanity(payload.text)) {
    return NextResponse.json(
      { error: "Entry contains blocked language. Please rephrase and try again." },
      { status: 422 },
    );
  }

  if (looksLikeSpam(payload.text)) {
    return NextResponse.json(
      { error: "Entry looks like spam. Please edit and try again." },
      { status: 422 },
    );
  }

  const createdAt = new Date(payload.timestamp);
  try {
    const entry = await prisma.entry.create({
      data: {
        rawText: payload.text,
        createdAt,
        latitude: payload.latitude,
        longitude: payload.longitude,
        userId: session.user.id,
      },
      select: {
        id: true,
        rawText: true,
        createdAt: true,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    logError("entries.create_failed", {
      userId: session.user.id,
      clientKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "We couldn't save this entry right now." },
      { status: 500 },
    );
  }
}
