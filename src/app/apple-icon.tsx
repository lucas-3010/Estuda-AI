import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#233f6c" }}>
        <svg viewBox="0 0 32 32" width="180" height="180">
          <path d="M6 10.5c3.3-1.4 6.6-1.4 10 .6v13c-3.4-2-6.7-2-10-.6z" fill="#fff" />
          <path d="M26 10.5c-3.3-1.4-6.6-1.4-10 .6v13c3.4-2 6.7-2 10-.6z" fill="#fff" opacity=".82" />
          <path d="M19.5 6.5h4v9l-2-1.5-2 1.5z" fill="#b08a3e" />
        </svg>
      </div>
    ),
    size,
  );
}
