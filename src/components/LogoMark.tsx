import Image from "next/image";

type LogoMarkProps = {
  size?: "small" | "large";
  className?: string;
};

const sizeClasses = {
  small: "h-10 w-10",
  large: "aspect-square w-full max-w-[200px] sm:max-w-[220px]"
};

export function LogoMark({ size = "small", className = "" }: LogoMarkProps) {
  return (
    <span className={`${sizeClasses[size]} block shrink-0 ${className}`} aria-hidden="true">
      <Image
        src="/images/logo.png"
        alt=""
        width={220}
        height={220}
        priority={size === "large"}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
