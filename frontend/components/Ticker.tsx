"use client";

export default function Ticker() {
  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#fff", borderBottom: "1px solid #eee",
        display: "flex", alignItems: "center",
        justifyContent: "center", height: 40, width: "100%",
      }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ display: "flex", width: "200%", animation: "tickerScroll 8s linear infinite" }}>
            {[1, 2].map(k => (
              <span key={k} style={{
                flex: "0 0 50%", textAlign: "center", color: "#1a1a2e",
                fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400,
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
      `}</style>
    </>
  );
}
