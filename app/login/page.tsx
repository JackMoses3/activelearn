import { signIn } from "@/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mcp_state?: string }>;
}) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div
        className="bg-surface-container-lowest rounded-xl p-12 flex flex-col items-center gap-0 w-96"
        style={{ boxShadow: "0 4px 32px rgba(27,28,23,0.06)" }}
      >
        {/* Logo */}
        <span
          className="text-[22px] font-bold text-primary mb-1"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          ActiveLearn
        </span>

        {/* Eyebrow */}
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.15em] text-secondary mb-6"
          style={{ fontFamily: "'Geist Mono', monospace" }}
        >
          MCP-Connected Learning
        </span>

        {/* Headline */}
        <h1
          className="text-[26px] font-bold tracking-tight text-primary text-center leading-tight mb-2"
          style={{ fontFamily: "'Fraunces', serif", letterSpacing: "-0.02em" }}
        >
          Sign in to your<br />learning graph
        </h1>

        {/* Sub */}
        <p className="text-[13px] text-on-surface-variant text-center leading-relaxed mb-8">
          Sign in with your Google or GitHub account to access your courses and concept maps.
        </p>

        {/* Google button (primary) */}
        <form
          action={async () => {
            "use server";
            const params = await searchParams;
            const callbackUrl = params.mcp_state
              ? `/api/auth/mcp-callback?mcp_state=${params.mcp_state}`
              : "/courses";
            await signIn("google", { redirectTo: callbackUrl });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full bg-surface-container-lowest text-primary py-3 px-5 rounded-md font-semibold text-[13px] hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2.5"
            style={{ boxShadow: "0 1px 3px rgba(27,28,23,0.12)" }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-outline-variant/15" />
          <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest" style={{ fontFamily: "'Geist Mono', monospace" }}>or</span>
          <div className="flex-1 h-px bg-outline-variant/15" />
        </div>

        {/* GitHub button (secondary) */}
        <form
          action={async () => {
            "use server";
            const params = await searchParams;
            const callbackUrl = params.mcp_state
              ? `/api/auth/mcp-callback?mcp_state=${params.mcp_state}`
              : "/courses";
            await signIn("github", { redirectTo: callbackUrl });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full bg-primary text-on-primary py-3 px-5 rounded-md font-semibold text-[13px] hover:opacity-90 transition-opacity flex items-center justify-center gap-2.5"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current shrink-0" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Continue with GitHub
          </button>
        </form>

        {/* Back link */}
        <p className="mt-5 text-[10px] text-on-surface-variant/60 text-center" style={{ fontFamily: "'Geist Mono', monospace" }}>
          ←{" "}
          <Link href="/" className="text-secondary underline hover:opacity-80 transition-opacity">
            Back to activelearn.com
          </Link>
        </p>
      </div>
    </div>
  );
}
