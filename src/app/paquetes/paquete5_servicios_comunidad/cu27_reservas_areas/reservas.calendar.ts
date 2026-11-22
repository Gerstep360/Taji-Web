/** Utilidades puras del calendario administrativo (T096). Sin dependencias de Angular. */

export interface CalendarItem<T = unknown> {
  key: string;
  start: Date;
  end: Date;
  data: T;
}

export interface PositionedItem<T = unknown> extends CalendarItem<T> {
  /** Minutos desde el inicio visible del día. */
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toTimeKey(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Lunes de la semana de ``date`` (semana ISO, lunes a domingo). */
export function startOfWeek(date: Date): Date {
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

/** Convierte fecha local (AAAA-MM-DD) + hora (HH:MM) a ISO con zona. */
export function localDateTimeToIso(dateKey: string, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = fromDateKey(dateKey);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Recorta los elementos al día ``day`` y los ubica en carriles para que los
 * eventos que se cruzan (distintas áreas a la misma hora) no se tapen.
 */
export function layoutDay<T>(
  items: CalendarItem<T>[],
  day: Date,
  visibleStartMinutes: number,
  visibleEndMinutes: number,
): PositionedItem<T>[] {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const from = new Date(dayStart.getTime() + visibleStartMinutes * 60000);
  const to = new Date(dayStart.getTime() + visibleEndMinutes * 60000);

  const clipped = items
    .filter(item => item.start < to && item.end > from)
    .map(item => {
      const start = item.start > from ? item.start : from;
      const end = item.end < to ? item.end : to;
      return { ...item, start: item.start, end: item.end, clipStart: start, clipEnd: end };
    })
    .sort((a, b) => a.clipStart.getTime() - b.clipStart.getTime() || b.clipEnd.getTime() - a.clipEnd.getTime());

  const result: PositionedItem<T>[] = [];
  let cluster: (typeof clipped[number] & { lane: number })[] = [];
  let clusterEnd = 0;
  let laneEnds: number[] = [];

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    for (const item of cluster) {
      result.push({
        key: item.key,
        start: item.start,
        end: item.end,
        data: item.data,
        top: minutesBetween(from, item.clipStart),
        height: Math.max(minutesBetween(item.clipStart, item.clipEnd), 15),
        lane: item.lane,
        lanes,
      });
    }
    cluster = [];
    laneEnds = [];
    clusterEnd = 0;
  };

  for (const item of clipped) {
    const startMs = item.clipStart.getTime();
    const endMs = item.clipEnd.getTime();
    if (cluster.length && startMs >= clusterEnd) flush();
    let lane = laneEnds.findIndex(laneEnd => laneEnd <= startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endMs);
    } else {
      laneEnds[lane] = endMs;
    }
    cluster.push({ ...item, lane });
    clusterEnd = Math.max(clusterEnd, endMs);
  }
  if (cluster.length) flush();
  return result;
}
