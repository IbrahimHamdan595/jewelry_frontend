"use client";
/**
 * Last resort: only reached when the ROOT LAYOUT itself throws. It replaces
 * that layout, so it must render its own <html> and <body>, and nothing from
 * globals.css / Tailwind / LanguageProvider is available — hence inline styles
 * and both languages side by side. Production only; dev shows Next's overlay.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0D0C0A",
          color: "#FAF6EF",
          fontFamily: "Jost, Inter, Cairo, sans-serif",
          textAlign: "center",
          padding: 32,
        }}
      >
        <div role="alert" style={{ maxWidth: 480 }}>
          <div style={{ color: "#C9A84C", letterSpacing: "0.3em", fontSize: 12, marginBottom: 16 }}>FAWAZ EL NAMEL</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 28, letterSpacing: "0.1em", margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p dir="rtl" style={{ fontSize: 16, margin: "0 0 16px", opacity: 0.9 }}>حدث خطأ ما</p>
          <p style={{ fontSize: 14, opacity: 0.7, margin: "0 0 24px" }}>
            The app could not start this screen. Items in the cart are kept for this tab.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={reset} style={buttonStyle}>
              Try again · حاول مجددًا
            </button>
            <a href="/" style={{ ...buttonStyle, textDecoration: "none" }}>
              Go to sign in · تسجيل الدخول
            </a>
          </div>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: 10, opacity: 0.5, marginTop: 24 }}>Reference: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}

const buttonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#FAF6EF",
  borderRadius: 4,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
};
