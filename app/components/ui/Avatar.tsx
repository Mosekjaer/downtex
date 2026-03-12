import { useState } from "react";

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 40,
} as const;

const textSizeMap = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
} as const;

export type AvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const px = sizeMap[size];
  const initial = name.charAt(0).toUpperCase();
  const showImage = src && !imgError;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 ${className}`}
      style={{ width: px, height: px }}
      aria-label={name}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className={`font-medium leading-none text-zinc-600 select-none ${textSizeMap[size]}`}
        >
          {initial}
        </span>
      )}
    </span>
  );
}

export { Avatar };
