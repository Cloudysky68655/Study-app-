// Line icons matching the reference's thin-stroke, rounded style
// (bottom nav, action buttons, player controls). Kept minimal and
// hand-drawn as SVG rather than pulling in an icon package, since
// the existing project has none installed.

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9v10a1 1 0 0 0 1 1H10a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3.5a1 1 0 0 0 1-1V9" />
    </svg>
  );
}

export function IconMoon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function IconLeaf(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.2 8.2c3-1.6 6.6-1.6 7.6-.6s1 4.6-.6 7.6c-3 1.6-6.6 1.6-7.6.6s-1-4.6.6-7.6Z" />
    </svg>
  );
}

export function IconMusicNote(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <path d="M9 18V5.8L19 4v11.2" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="15.2" r="2.5" />
    </svg>
  );
}

export function IconUser(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  );
}

export function IconArrowLeft(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconHeart({ filled, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" {...base} fill={filled ? "currentColor" : "none"} {...props}>
      <path d="M12 20.2s-7.6-4.6-10-9.3C.4 7.6 2.2 4 5.8 3.6c2-.2 3.8.8 6.2 3.3 2.4-2.5 4.2-3.5 6.2-3.3 3.6.4 5.4 4 3.8 7.3-2.4 4.7-10 9.3-10 9.3Z" />
    </svg>
  );
}

export function IconDownload(props) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" {...base} {...props}>
      <path d="M12 3v13" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function IconClose(props) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconPlay({ filled = true, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth="1.8" {...props}>
      <path d="M7 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  );
}

export function IconPause(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" {...props}>
      <rect x="6" y="4.5" width="4.2" height="15" rx="1.4" />
      <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" />
    </svg>
  );
}

export function IconSkip15({ direction = "back", ...props }) {
  const flip = direction === "forward" ? "scaleX(-1)" : undefined;
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" {...base} style={{ transform: flip }} {...props}>
      <path d="M4 8a9 9 0 1 1-1.5 6.5" />
      <path d="M2 5v4h4" />
      <text x="12" y="15.5" fontSize="7" fontFamily="Nunito, sans-serif" fontWeight="800" stroke="none" fill="currentColor" textAnchor="middle" style={{ transform: flip }}>15</text>
    </svg>
  );
}

export function IconFacebook(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export function IconGoogle(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.4H12v4.5h6.5c-.3 1.5-1.2 2.8-2.5 3.6v3h4A11.6 11.6 0 0 0 23.5 12.3Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-4-3.1c-1.1.7-2.4 1.2-3.9 1.2-3 0-5.5-2-6.4-4.8h-4.1v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.6 14.4a7.2 7.2 0 0 1 0-4.6V6.6H1.5a12 12 0 0 0 0 10.8Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.5 6.6l4.1 3.2c.9-2.8 3.4-4.9 6.4-5Z" />
    </svg>
  );
}

export function IconEye({ open = true, ...props }) {
  return open ? (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M3 12s3.6-7 9-7c1.6 0 3 .4 4.2 1M21 12s-1 1.9-2.8 3.6M9.5 9.7a2.8 2.8 0 0 0 4 4" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} stroke="#4caf7d" {...props}>
      <path d="M4 12.5l5 5L20 6" />
    </svg>
  );
}

export function IconChevronDown(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconHeadphones(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </svg>
  );
}

export function IconLock(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" {...base} {...props}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
