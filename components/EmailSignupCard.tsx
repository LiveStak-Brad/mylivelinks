import { useState, useRef, useEffect } from "react";
import { Smartphone, CheckCircle2 } from "lucide-react";

export interface EmailSignupCardProps {
  headline?: string;
  subtext?: string;
  successText?: string;
  placement?: "card" | "banner";
  onSubmit?: (email: string) => Promise<{ ok: boolean; message?: string }>; 
}

const DEFAULT_HEADLINE = "Mobile app coming soon";
const DEFAULT_SUBTEXT = "Drop your email and we’ll notify you when it's live.";
const DEFAULT_SUCCESSTEXT = "You’re on the list! We’ll email you when mobile is ready.";
const LOCALSTORAGE_KEY = "mll_mobile_notify_signed_up";

function validateEmail(email: string) {
  const r = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return r.test(email);
}

export function EmailSignupCard({
  headline = DEFAULT_HEADLINE,
  subtext = DEFAULT_SUBTEXT,
  successText = DEFAULT_SUCCESSTEXT,
  placement = "card",
  onSubmit,
}: EmailSignupCardProps) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(LOCALSTORAGE_KEY);
    if (done) setHidden(true);
  }, []);

  useEffect(() => {
    if (success) localStorage.setItem(LOCALSTORAGE_KEY, "1");
  }, [success]);

  if (hidden) return null;

  const showError = touched && email && !validateEmail(email);

  const realOnSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched(true);
    setError("");
    if (!validateEmail(email)) return;
    setLoading(true);
    try {
      if (onSubmit) {
        const resp = await onSubmit(email);
        if (!resp.ok) {
          setError(resp.message || "Something went wrong");
          setLoading(false);
          return;
        }
      } else {
        // Default handler: call Next API route
        const resp = await fetch("/api/waitlist/mobile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await resp.json();
        if (!data.ok) {
          setError(data.message || "Something went wrong");
          setLoading(false);
          return;
        }
      }
      setSuccess(true);
      setEmail("");
    } catch (e) {
      setError("Something went wrong. Please try again later.");
    }
    setLoading(false);
  };

  return (
    <div
      className={`w-full max-w-2xl mx-auto ${
        placement === "banner"
          ? "rounded-xl border border-neutral-200 bg-white/90 py-4 px-3 shadow-sm"
          : "rounded-2xl border border-neutral-100 bg-gradient-to-br from-white/70 to-neutral-50 py-7 px-9 shadow"
      } flex flex-col items-center mb-3`}
      style={{ backdropFilter: "blur(4px)" }}
      data-premium-card
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="bg-primary/10 rounded-full p-2 flex items-center justify-center" aria-hidden>
          <Smartphone className="w-6 h-6 text-primary-600" strokeWidth={2.2} />
        </div>
        <h2 className="text-base font-extrabold text-neutral-900 tracking-tight leading-tight">{headline}</h2>
      </div>
      <p className="text-neutral-500 text-sm mb-3 text-center font-medium">{subtext}</p>
      {success ? (
        <div
          className="w-full text-center animate-fadein flex flex-col items-center gap-2"
          aria-live="polite"
          tabIndex={-1}
        >
          <CheckCircle2 className="text-green-600 w-8 h-8 mx-auto animate-in fade-in zoom-in mt-2" aria-hidden />
          <span className="inline-block text-green-800 text-base font-semibold px-2">{successText}</span>
        </div>
      ) : (
        <form
          className="w-full flex flex-col gap-1.5"
          onSubmit={realOnSubmit}
          autoComplete="off"
        >
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <div className="flex gap-0.5 mt-1">
            <input
              id="email"
              ref={inputRef}
              name="email"
              type="email"
              className="flex-1 rounded-full border border-neutral-200 bg-neutral-100 px-4 py-2 text-[15px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-400 font-semibold placeholder-neutral-400 transition-colors shadow-md focus:border-primary"
              placeholder="you@email.com"
              required
              value={email}
              disabled={loading}
              onChange={e => {
                setEmail(e.target.value);
                setTouched(true);
                setError("");
              }}
              onBlur={() => setTouched(true)}
              aria-invalid={showError ? "true" : undefined}
              aria-describedby="email-helper-premium"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-[#FF5AAE] via-[#9B5EFF] to-[#0AEFFF] hover:from-[#FF77BB] hover:via-[#B787FF] hover:to-[#0AEFFF] text-white px-5 py-2 text-base font-bold shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FF5AAE]/40 disabled:from-[#FBC1E6] disabled:via-[#D4CAFF] disabled:to-[#B9FFFF] disabled:text-white/80 disabled:cursor-not-allowed transition-all min-w-[110px] border-0"
              disabled={!validateEmail(email) || loading}
            >
              {loading ? "Sending..." : "Notify me"}
            </button>
          </div>
          <div id="email-helper-premium" className="text-xs min-h-[18px] font-semibold text-rose-500 pt-1 text-left">
            {showError ? "Enter a valid email address" : error}
          </div>
        </form>
      )}
      <div className="mt-1 pt-2 text-[11px] text-neutral-400 text-center font-medium leading-snug border-t border-neutral-100 w-full">
        No spam. Unsubscribe anytime.
      </div>
    </div>
  );
}
