"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDaysIcon, MapPinIcon } from "lucide-react";
import { ko } from "react-day-picker/locale";

import { WeatherGlyph } from "@/components/todo/WeatherGlyph";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  fetchLocalWeatherBundle,
  type WeatherBundle,
} from "@/lib/weather/open-meteo";

type HeaderClockWeatherProps = {
  /** 일정이 있는 날짜(로컬 자정 Date) */
  scheduledDates?: Date[];
  /** 모바일용 압축 레이아웃 */
  compact?: boolean;
};

/**
 * 헤더용 날씨·날짜·시간을 가로 배치한다.
 */
export const HeaderClockWeather = ({
  scheduledDates = [],
  compact = false,
}: HeaderClockWeatherProps) => {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherBundle | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadWeather = async () => {
      try {
        const result = await fetchLocalWeatherBundle();
        if (!cancelled) {
          setWeather(result);
          setWeatherError(result == null);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[HeaderClockWeather]", error);
        }
        if (!cancelled) {
          setWeather(null);
          setWeatherError(true);
        }
      }
    };

    void loadWeather();
    const refresh = window.setInterval(
      () => {
        void loadWeather();
      },
      30 * 60 * 1000
    );

    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, []);

  const scheduledMatchers = useMemo(
    () =>
      scheduledDates.map(
        (date) =>
          new Date(date.getFullYear(), date.getMonth(), date.getDate())
      ),
    [scheduledDates]
  );

  const dateLabel = now
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: compact ? "numeric" : "long",
        day: "numeric",
        weekday: "short",
      }).format(now)
    : "날짜…";

  const timeLabel = now
    ? new Intl.DateTimeFormat(
        "ko-KR",
        compact
          ? {
              timeZone: "Asia/Seoul",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }
          : {
              timeZone: "Asia/Seoul",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }
      ).format(now)
    : compact
      ? "--:--"
      : "--:--:--";

  const nextHour = weather?.laterHours[0] ?? null;

  return (
    <div
      className={
        compact
          ? "flex h-9 w-full min-w-0 items-center gap-1.5"
          : "flex h-10 min-w-0 items-center justify-center gap-1.5"
      }
    >
      <Popover open={weatherOpen} onOpenChange={setWeatherOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={
                compact
                  ? "flex h-9 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 px-2 py-0 transition-colors hover:bg-muted/50"
                  : "flex h-10 w-[13.75rem] shrink-0 items-center justify-center gap-1 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 px-3 py-0 transition-colors hover:bg-muted/50 sm:w-[14.5rem]"
              }
              aria-label="주간 날씨 보기"
            />
          }
        >
          {weatherError || !weather ? (
            <>
              <WeatherGlyph code={3} className={compact ? "size-5" : "size-6"} />
              <span className="truncate text-xs text-muted-foreground">
                {weatherError ? "날씨 없음" : "불러오는 중…"}
              </span>
            </>
          ) : (
            <>
              <WeatherGlyph
                code={weather.current.weatherCode}
                className={compact ? "size-5 shrink-0" : "size-6 shrink-0"}
              />
              <span className="flex min-w-0 items-center justify-center gap-1 text-xs font-medium">
                {!compact ? (
                  <>
                    <MapPinIcon className="size-3 shrink-0" aria-hidden />
                    <span className="max-w-[3.75rem] truncate sm:max-w-[4.5rem]">
                      {weather.location}
                    </span>
                  </>
                ) : null}
                <span className="shrink-0 tabular-nums">
                  {weather.current.temperature}°
                </span>
                {nextHour ? (
                  <>
                    <span className="text-muted-foreground" aria-hidden>
                      -
                    </span>
                    <WeatherGlyph
                      code={nextHour.weatherCode}
                      className="size-5 shrink-0"
                      iconClassName="size-3"
                    />
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {nextHour.temperature}°
                    </span>
                  </>
                ) : null}
              </span>
            </>
          )}
        </PopoverTrigger>
        <PopoverContent align="center" className="w-[min(100vw-2rem,22rem)] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <MapPinIcon className="size-3.5 text-brand-ai" aria-hidden />
            {weather?.location ?? "위치"} · 일주일 날씨
          </div>
          {weather?.weekly?.length ? (
            <ul className="space-y-1.5">
              {weather.weekly.map((day) => (
                <li
                  key={day.date}
                  className="flex items-center gap-2 rounded-xl bg-muted/40 px-2 py-1.5"
                >
                  <WeatherGlyph
                    code={day.weatherCode}
                    className="size-7"
                    iconClassName="size-3.5"
                  />
                  <span className="w-8 shrink-0 text-xs font-medium">
                    {day.weekday}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {day.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs font-medium">
                    {day.tempMin}°/{day.tempMax}°
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              주간 날씨를 불러오지 못했어요.
            </p>
          )}
        </PopoverContent>
      </Popover>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={
                compact
                  ? "h-9 min-w-0 flex-1 justify-center gap-1 overflow-hidden rounded-2xl px-2"
                  : "h-10 w-[15.25rem] shrink-0 justify-center gap-1.5 overflow-hidden rounded-2xl px-3 sm:w-[16rem]"
              }
              aria-label="일정 달력 열기"
            />
          }
        >
          <CalendarDaysIcon className="size-3.5 shrink-0 text-brand-ai" />
          <span className="flex min-w-0 items-center justify-center gap-1 truncate text-xs font-medium">
            <span className="truncate">{dateLabel}</span>
            <span className="text-muted-foreground" aria-hidden>
              -
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {timeLabel}
            </span>
          </span>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto p-2">
          <Calendar
            mode="single"
            locale={ko}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selected={now ?? undefined}
            modifiers={{ scheduled: scheduledMatchers }}
            modifiersClassNames={{
              scheduled:
                "bg-brand-ai/20 text-foreground font-semibold ring-1 ring-brand-ai/40",
            }}
          />
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            강조된 날짜는 할 일 일정이 있는 날이에요.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
};
