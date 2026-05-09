"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizes = {
  sm: { icon: 28, text: "text-sm",  gap: "gap-2"   },
  md: { icon: 34, text: "text-base", gap: "gap-2.5" },
  lg: { icon: 44, text: "text-xl",  gap: "gap-3"   },
};

export function AppIcon({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background square with gradient */}
      <rect
        width="36"
        height="36"
        rx="9"
        fill="url(#logo-bg)"
      />

      {/* Quill feather body */}
      <path
        d="M25 7C25 7 28 10 27 16C26 20 22 23 18 25L14 27L13 26C16 21 17 18 18 15C15 17 12 20 11 25L10 26L9 25C9 25 8 19 12 14C15 10 20 8 25 7Z"
        fill="url(#logo-quill)"
        opacity="0.95"
      />

      {/* Quill tip */}
      <path
        d="M13 26L11 29L14 27Z"
        fill="#34d399"
        opacity="0.9"
      />

      {/* Ink line */}
      <path
        d="M11 29C11 29 13 27 16 28"
        stroke="#34d399"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Shine */}
      <ellipse cx="21" cy="11" rx="2.5" ry="1.2"
        fill="white" opacity="0.18" transform="rotate(-35 21 11)" />

      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0e1a2b" />
          <stop offset="100%" stopColor="#0f2318" />
        </linearGradient>
        <linearGradient id="logo-quill" x1="9" y1="7" x2="27" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="55%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function AppLogo({ size = "md", showText = true }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex items-center ${s.gap} select-none`}>
      <AppIcon size={s.icon} />
      {showText && (
        <span
          className={`gradient-text font-bold tracking-tight ${s.text}`}
          style={{ letterSpacing: "-0.01em" }}
        >
          Authentic Voice
        </span>
      )}
    </div>
  );
}
