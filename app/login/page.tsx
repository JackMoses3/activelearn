import { signIn } from "@/auth";
import Link from "next/link";

export default function LoginPage() {
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
          You&apos;ll be redirected to GitHub. Once authenticated, you&apos;ll see your courses and concept maps.
        </p>

        {/* GitHub button */}
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/courses" });
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
