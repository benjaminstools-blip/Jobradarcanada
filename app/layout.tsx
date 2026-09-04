import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Job Canada",
  description: "Find, score, and track Canadian job applications with AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (Scribe, Grammarly, password
    // managers) stamp attributes onto <html> before React hydrates. It suppresses
    // one level only, so a real mismatch deeper in the tree still surfaces.
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="grain min-h-full bg-paper text-ink">
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--paper-raised)',
              color: 'var(--ink)',
              border: '1px solid var(--rule-strong)',
              borderRadius: '2px',
              fontFamily: 'Archivo, system-ui, sans-serif',
              fontSize: '0.875rem',
            },
          }}
        />
      </body>
    </html>
  );
}
