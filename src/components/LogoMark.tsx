type LogoMarkProps = {
  size?: "small" | "large";
  className?: string;
};

const sizeClasses = {
  small: "h-10 w-10 rounded-md",
  large: "h-28 w-28 rounded-lg"
};

export function LogoMark({ size = "small", className = "" }: LogoMarkProps) {
  return (
    <span
      className={`${sizeClasses[size]} grid place-items-center bg-ink text-white shadow-soft ${className}`}
      aria-hidden="true"
    >
      <svg className="h-[82%] w-[82%]" viewBox="0 0 96 96" fill="none" role="img">
        <path
          d="M15 67C32 81 61 80 75 58C82 47 82 35 77 25"
          stroke="#ccfbf1"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="75" cy="22" r="8" fill="#f8faf7" />
        <ellipse
          cx="39"
          cy="39"
          rx="18"
          ry="25"
          transform="rotate(-34 39 39)"
          fill="#14b8a6"
          stroke="#f8faf7"
          strokeWidth="5"
        />
        <path d="M52 57L75 80" stroke="#f8faf7" strokeWidth="10" strokeLinecap="round" />
        <path d="M57 62L79 84" stroke="#0f766e" strokeWidth="4" strokeLinecap="round" />
        <path d="M31 28C37 23 47 24 53 31" stroke="#ccfbf1" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
