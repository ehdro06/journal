import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreateEntryPayload = {
  text: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
};

const isValidCoordinate = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const parsePayload = (body: unknown): CreateEntryPayload | null => {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const candidate = body as Partial<CreateEntryPayload>;

  if (typeof candidate.text !== "string" || candidate.text.trim().length === 0) {
    return null;
  }

  if (typeof candidate.timestamp !== "string") {
    return null;
  }

  const parsedDate = new Date(candidate.timestamp);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const latitudeIsValid =
    candidate.latitude === null || isValidCoordinate(candidate.latitude);
  const longitudeIsValid =
    candidate.longitude === null || isValidCoordinate(candidate.longitude);

  if (!latitudeIsValid || !longitudeIsValid) {
    return null;
  }

  return {
    text: candidate.text.trim(),
    timestamp: candidate.timestamp,
    latitude: candidate.latitude ?? null,
    longitude: candidate.longitude ?? null,
  };
};

export async function GET() {
  const entries = await prisma.entry.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      rawText: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const payload = parsePayload(body);
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const createdAt = new Date(payload.timestamp);

  const entry = await prisma.entry.create({
    data: {
      rawText: payload.text,
      createdAt,
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
    select: {
      id: true,
      rawText: true,
      createdAt: true,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
