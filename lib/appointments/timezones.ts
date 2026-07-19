// Fusos exibidos na agenda (seção 2 do plano: "Calendário com fusos
// BR/SYD/BNE"). Tudo em UTC no banco; conversão só aqui, na interface.

export const AGENDA_TIMEZONES = [
  { tz: "America/Sao_Paulo", label: "BR" },
  { tz: "Australia/Sydney", label: "Sydney" },
  { tz: "Australia/Brisbane", label: "Brisbane" },
] as const;

/** Diferença (ms) entre o relógio de parede do fuso e o UTC, no instante dado. */
function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/**
 * Interpreta "YYYY-MM-DDTHH:mm" (input datetime-local) como horário de parede
 * do fuso dado e devolve o instante UTC correspondente. Duas passadas para
 * resolver bordas de horário de verão.
 */
export function zonedTimeToUtc(local: string, timeZone: string): Date {
  const naive = new Date(`${local}:00Z`).getTime();
  const guess = naive - tzOffsetMs(new Date(naive), timeZone);
  return new Date(naive - tzOffsetMs(new Date(guess), timeZone));
}

export function formatInTimeZone(
  iso: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false },
): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, ...options }).format(
    new Date(iso),
  );
}

/** "BR 21:00 · Sydney 10:00 · Brisbane 09:00" */
export function formatTimesInAllZones(iso: string): string {
  return AGENDA_TIMEZONES.map(
    (z) => `${z.label} ${formatInTimeZone(iso, z.tz)}`,
  ).join(" · ");
}

/** Data por extenso no fuso de Sydney (referência operacional da KMP). */
export function formatDateSydney(iso: string): string {
  return formatInTimeZone(iso, "Australia/Sydney", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** true se o instante já passou (comparação em UTC, sem fuso). */
export function isPastIso(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/** Chave YYYY-MM-DD no fuso de Sydney, para agrupar compromissos por dia. */
export function dayKeySydney(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
