import { addScheduleException, removeScheduleException, type ExceptionInput } from '@/api/staff';

import type { DayChoice } from './sheets';
import type { DayInfo } from './utils';

export type ActionResult = { ok: true; affected: number } | { ok: false; message: string };

/**
 * Зміна одного дня з панелі: прибрати наявний одноденний виняток і, якщо
 * обрано не «за типовим», додати новий. Повертає, скільки записів зачеплено.
 */
export async function applyDayChoice(
  groomerId: string,
  day: DayInfo,
  choice: DayChoice,
  hours: { from: string; to: string }
): Promise<ActionResult> {
  let affected = 0;

  if (day.exception) {
    const removed = await removeScheduleException(groomerId, day.exception.id);
    if (!removed.ok) return { ok: false, message: removed.message };
    affected = removed.data.affectedOrders;
  }

  if (choice !== 'weekly') {
    const input: ExceptionInput = {
      type: choice,
      dateFrom: day.date,
      dateTo: day.date,
      ...(choice === 'custom_hours' ? hours : {}),
    };
    const added = await addScheduleException(groomerId, input);
    if (!added.ok) return { ok: false, message: added.message };
    affected = added.data.affectedOrders;
  }

  return { ok: true, affected };
}
