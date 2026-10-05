'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log strutturato JSON dell'errore client (predisposto per Sentry captureException)
    console.error(
      JSON.stringify({
        level: 'ERROR',
        context: 'NextJsGlobalErrorBoundary',
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }),
    );
  }, [error]);

  return (
    <html lang="it">
      <body className="bg-zinc-950 text-zinc-100 flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <div className="mb-4 text-4xl">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-rose-400">Si è verificato un errore critico</h2>
          <p className="mb-6 text-sm text-zinc-400">
            L&apos;applicazione ha intercettato un&apos;eccezione imprevista. L&apos;evento è stato registrato per l&apos;analisi di telemetria.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
