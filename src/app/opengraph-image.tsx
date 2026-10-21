import { ImageResponse } from "next/og";

export const alt = "Estuda-AI: flashcards com IA e repetição espaçada";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#faf8f3",
          color: "#1a1f2b",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg viewBox="0 0 32 32" width="72" height="72">
            <rect width="32" height="32" rx="7" fill="#233f6c" />
            <path d="M6 10.5c3.3-1.4 6.6-1.4 10 .6v13c-3.4-2-6.7-2-10-.6z" fill="#fff" />
            <path d="M26 10.5c-3.3-1.4-6.6-1.4-10 .6v13c3.4-2 6.7-2 10-.6z" fill="#fff" opacity=".82" />
            <path d="M19.5 6.5h4v9l-2-1.5-2 1.5z" fill="#b08a3e" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Estuda-AI</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>
            Estude qualquer matéria com o método que a ciência recomenda.
          </div>
          <div style={{ fontSize: 30, color: "#4b5563" }}>
            A IA cria os flashcards. A repetição espaçada diz quando revisar.
          </div>
        </div>
        <div style={{ display: "flex", height: 8, width: 160, background: "#b08a3e" }} />
      </div>
    ),
    size,
  );
}
