import type { LucideIcon } from "lucide-react";
import {
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  CloudyIcon,
  SunIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 날씨 코드에 맞는 Lucide 아이콘을 반환한다.
 */
export const getWeatherIcon = (code: number): LucideIcon => {
  if (code === 0) return SunIcon;
  if (code === 1 || code === 2) return CloudSunIcon;
  if (code === 3) return CloudyIcon;
  if (code === 45 || code === 48) return CloudFogIcon;
  if (code >= 51 && code <= 67) return CloudRainIcon;
  if (code >= 71 && code <= 77) return CloudSnowIcon;
  if (code >= 80 && code <= 82) return CloudRainIcon;
  if (code >= 85 && code <= 86) return CloudSnowIcon;
  if (code >= 95 && code <= 99) return CloudLightningIcon;
  return CloudIcon;
};

type WeatherGlyphProps = {
  code: number;
  className?: string;
  iconClassName?: string;
};

/**
 * 날씨 코드를 원형 배경 아이콘으로 표시한다.
 */
export const WeatherGlyph = ({
  code,
  className,
  iconClassName,
}: WeatherGlyphProps) => {
  const Icon = getWeatherIcon(code);
  const tone =
    code === 0
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : code >= 95
        ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
        : code >= 71 || (code >= 85 && code <= 86)
          ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
          : code >= 51
            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
            : "bg-brand-ai/15 text-brand-ai";

  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
        tone,
        className
      )}
      aria-hidden
    >
      <Icon className={cn("size-4", iconClassName)} />
    </span>
  );
};
