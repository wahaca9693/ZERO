"use client";

import { BRAND_LOGO_URL, BRAND_NAME } from "@/lib/branding";
import { useTheme } from "./ThemeProvider";

/* Dynamic admin-managed image URLs intentionally use a plain img element. */
/* eslint-disable @next/next/no-img-element */

type BrandMarkProps = {
  className?: string;
  imageClassName?: string;
  nameClassName?: string;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-2xl",
} as const;

export default function BrandMark({
  className = "",
  imageClassName = "",
  nameClassName = "",
  showName = true,
  size = "md",
}: BrandMarkProps) {
  const { settings } = useTheme();
  const name = settings.siteName?.trim() || BRAND_NAME;
  // Official Trendcom logo is fixed so every shared brand mark stays consistent.
  const mediaUrl = BRAND_LOGO_URL;
  const mediaClassName = `${sizeClasses[size]} shrink-0 object-cover ${imageClassName}`;

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <img
        key="official-brand-logo"
        src={mediaUrl}
        alt={name}
        className={mediaClassName}
        loading="eager"
      />
      {showName && <span className={`min-w-0 truncate ${nameClassName}`}>{name}</span>}
    </div>
  );
}
