"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  rawText: string;
  createdAt: string;
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
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntries = async () => {
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
      } catch {
        setError("Could not load past entries.");
      } finally {
        setIsLoadingEntries(false);
      }
    };

    void loadEntries();
  }, []);

  const hasText = useMemo(() => draft.trim().length > 0, [draft]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedText = draft.trim();
    if (!trimmedText || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const timestamp = new Date().toISOString();
    const location = await getCurrentLocation();

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
      setEntries((previous) => [created, ...previous]);
      setDraft("");
    } catch {
      setError("We couldn't save this entry. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-xl flex-col bg-white text-zinc-900">
      <header className="border-b border-zinc-200 px-4 py-3">
        <h1 className="text-base font-semibold">Journal</h1>
        <p className="text-xs text-zinc-500">Capture thoughts in seconds.</p>
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
