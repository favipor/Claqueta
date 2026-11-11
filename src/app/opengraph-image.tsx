import { ImageResponse } from "next/og";

// Imagen que sale al compartir la web (portada y páginas sin imagen propia)
export const alt = "Claqueta · Lleva el seguimiento de lo que ves";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #042f2e 0%, #0f766e 55%, #14b8a6 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: 42,
            background: "rgba(255,255,255,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 36,
          }}
        >
          <svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
            <path d="m4 11-1.2-3.9a1 1 0 0 1 .7-1.2l14.6-3.9a1 1 0 0 1 1.2.7L20 6.5" />
            <path d="m7.6 9.9 3.4-5.6M13 8.6l3.4-5.6" />
          </svg>
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>Claqueta</div>
        <div style={{ fontSize: 38, opacity: 0.9, marginTop: 12 }}>Lleva el seguimiento de lo que ves</div>
      </div>
    ),
    size
  );
}
