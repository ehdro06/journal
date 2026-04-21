"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

type ProviderMap = Awaited<ReturnType<typeof getProviders>>;

export default function SignInPage() {
  const [providers, setProviders] = useState<ProviderMap>(null);

  useEffect(() => {
    const loadProviders = async () => {
      const available = await getProviders();
      setProviders(available);
    };
    void loadProviders();
  }, []);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-xl flex-col items-center justify-center gap-3 px-4">
      <h1 className="text-xl font-semibold text-zinc-900">Sign in to Journal</h1>
      <p className="text-center text-sm text-zinc-500">
        Use Google or email magic link to keep entries private.
      </p>
      {providers ? (
        Object.values(providers).map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => void signIn(provider.id, { callbackUrl: "/" })}
            className="w-full max-w-sm rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white"
          >
            Continue with {provider.name}
          </button>
        ))
      ) : (
        <p className="text-sm text-zinc-500">Loading sign-in methods...</p>
      )}
    </main>
  );
}
