"use client";

export default function Ticker() {
  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#ff8fa3", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "10px 15px", width: "100%",
      }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ display: "flex", width: "200%", animation: "tickerScroll 8s linear infinite" }}>
            {[1, 2].map(k => (
              <span key={k} style={{
                flex: "0 0 50%", textAlign: "center", color: "#fff",
                fontFamily: "'Segoe UI', sans-serif", fontSize: 14, fontWeight: 600,
                letterSpacing: 1, whiteSpace: "nowrap",
              }}>
                Enjoy FREE shipping on orders above 900 EGP
              </span>
            ))}
          </div>
        </div>
      </div>
      <style jsx global>{`
        body { padding-top: 40px; }
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @media (max-width: 768px) { body { padding-top: 36px; } }
      `}</style>
    </>
  );
}
