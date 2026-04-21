"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MAX_ENTRY_LENGTH, createEntrySchema } from "@/lib/entry-schema";
import { signIn, signOut, useSession } from "next-auth/react";

type Entry = {
  id: string;
  rawText: string;
  createdAt: string;
  status?: "pending";
};

type EntriesResponse = {
  entries: Entry[];
};

type LocationResult = {
  latitude: number | null;
  longitude: number | null;
};

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  day: "numeric",
  timeZoneName: "short",
});

const getCurrentLocation = (): Promise<LocationResult> => {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve({ latitude: null, longitude: null });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        console.error(
          JSON.stringify({
            level: "error",
            event: "geolocation.lookup_failed",
            timestamp: new Date().toISOString(),
          }),
        );
        resolve({
          latitude: null,
          longitude: null,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8_000,
        maximumAge: 60_000,
      },
    );
  });
};

export default function JournalClient() {
  const { data: session, status } = useSession();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const loadEntries = async () => {
      setIsLoadingEntries(true);
      try {
        const response = await fetch("/api/entries", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load entries.");
        }

        const data = (await response.json()) as EntriesResponse;
        setEntries(data.entries ?? []);
      } catch (error) {
        console.error(
          JSON.stringify({
            level: "error",
            event: "entries.load_failed",
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          }),
        );
        setError("Could not load past entries.");
      } finally {
        setIsLoadingEntries(false);
      }
    };

    void loadEntries();
  }, [status]);

  const hasText = useMemo(() => draft.trim().length > 0, [draft]);
  const timezoneLabel = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedText = draft.trim();
    if (!trimmedText || isSubmitting) {
      return;
    }

    const timestamp = new Date().toISOString();
    const localValidation = createEntrySchema.safeParse({
      text: trimmedText,
      timestamp,
      latitude: null,
      longitude: null,
    });
    if (!localValidation.success) {
      setError(`Entry must be between 1 and ${MAX_ENTRY_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setDraft("");
    const location = await getCurrentLocation();
    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimisticEntry: Entry = {
      id: optimisticId,
      rawText: trimmedText,
      createdAt: timestamp,
      status: "pending",
    };
    setEntries((previous) => [optimisticEntry, ...previous]);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmedText,
          timestamp,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save entry.");
      }

      const created = (await response.json()) as Entry;
      setEntries((previous) =>
        previous.map((entry) => (entry.id === optimisticId ? created : entry)),
      );
    } catch (error) {
      setEntries((previous) =>
        previous.filter((entry) => entry.id !== optimisticId),
      );
      setDraft(trimmedText);
      console.error(
        JSON.stringify({
          level: "error",
          event: "entries.submit_failed",
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      setError("We couldn't save this entry. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-xl flex-col items-center justify-center gap-3 bg-white px-4 text-zinc-900">
        <h1 className="text-xl font-semibold">Journal</h1>
        <p className="text-center text-sm text-zinc-500">
          Sign in to create private entries tied to your account.
        </p>
        <button
          type="button"
          onClick={() => void signIn(undefined, { callbackUrl: "/" })}
          className="w-full max-w-sm rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="mx-auto flex h-dvh w-full max-w-xl items-center justify-center bg-white text-sm text-zinc-500">
        Loading session...
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-xl flex-col bg-white text-zinc-900">
      <header className="border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-semibold">Journal</h1>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
          >
            Sign out
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Capture thoughts in seconds. Times shown in {timezoneLabel}.
        </p>
        <p className="text-xs text-zinc-500">{session?.user?.email}</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {isLoadingEntries ? (
          <p className="text-sm text-zinc-500">Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Your first entry starts below.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="max-w-[90%] self-end rounded-2xl rounded-br-md bg-zinc-100 px-3 py-2"
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {entry.rawText}
                </p>
                <p className="mt-1 text-right text-[11px] text-zinc-500">
                  {timestampFormatter.format(new Date(entry.createdAt))}
                  {entry.status === "pending" ? " · sending" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-xl border-t border-zinc-200 bg-white/95 px-3 py-3 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a journal entry..."
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900 transition focus:ring-1"
            rows={1}
            maxLength={MAX_ENTRY_LENGTH}
          />
          <button
            type="submit"
            disabled={!hasText || isSubmitting}
            className="h-11 rounded-2xl bg-zinc-900 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </form>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
