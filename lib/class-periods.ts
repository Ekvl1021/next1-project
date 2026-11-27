import periods from '../shared/class-periods.json';
import type { CourseSession } from './types';
export const CLASS_PERIODS = periods;
export const WEEKDAYS = ['Даваа','Мягмар','Лхагва','Пүрэв','Баасан','Бямба','Ням'];
export function periodFor(session: Pick<CourseSession,'start'|'end'>) {
  return periods.find(period=>period.start===session.start && period.end===session.end);
}
export function sessionLabel(session: CourseSession) {
  const period=periodFor(session);
  return `${WEEKDAYS[session.day]} · ${period?`${period.number}-р пар · `:''}${session.start}–${session.end}`;
}
