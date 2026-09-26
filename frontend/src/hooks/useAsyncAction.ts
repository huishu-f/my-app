"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface MutationCallbacks<TData> {
  onSuccess?: (data: TData) => void;

  onError?: (err: Error) => void;

  onSettled?: () => void;
}

const RETRY_BASE_DELAY = 1_000;

const MAX_RETRIES = 3;

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError") return false;

  const status = (err as { status?: number }).status;
  if (typeof status === "number") {
    return status === 408 || status === 429 || status === 0;
  }

  const msg = err.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("408") ||
    msg.includes("429")
  );
}

interface AsyncAction<TVars, TData> {
  mutate: (vars: TVars, callbacks?: MutationCallbacks<TData>) => Promise<TData | undefined>;

  isPending: boolean;
}

export function useAsyncAction<TVars, TData>(
  action: (vars: TVars) => Promise<TData>,
  defaults?: MutationCallbacks<TData>,
  retry = false,
): AsyncAction<TVars, TData> {
  const [isPending, setIsPending] = useState(false);

  const mutatingRef = useRef(false);

  const defaultsRef = useRef(defaults);
  useEffect(() => {
    defaultsRef.current = defaults;
  });

  const mutate = useCallback(
    async (vars: TVars, callbacks?: MutationCallbacks<TData>) => {
      if (mutatingRef.current) return undefined;
      mutatingRef.current = true;
      setIsPending(true);

      try {
        let attempt = 0;
        while (true) {
          try {
            const data = await action(vars);

            (callbacks?.onSuccess ?? defaultsRef.current?.onSuccess)?.(data);
            return data;
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));

            if (!retry || !isRetryableError(error) || attempt >= MAX_RETRIES) {
              (callbacks?.onError ?? defaultsRef.current?.onError)?.(error);
              return undefined;
            }

            const delay = RETRY_BASE_DELAY * 2 ** attempt;
            await new Promise<void>((resolve) => setTimeout(resolve, delay));
            attempt++;
          }
        }
      } finally {
        mutatingRef.current = false;
        setIsPending(false);
        (callbacks?.onSettled ?? defaultsRef.current?.onSettled)?.();
      }
    },
    [action, retry],
  );

  return { mutate, isPending };
}
