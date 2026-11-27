const days = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
const periods = require('../../shared/class-periods.json');
const english = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const time = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
function sessionsFor(course) {
  if (course.sessions?.length) return course.sessions.map(session => ({ ...session, room: session.room || course.room }));
  const value = course.schedule || '';
  const times = value.match(/\d{1,2}:\d{2}/g) || [];
  const periodNumber = value.match(/([1-5])\s*(?:-?р)?\s*-?\s*пар/i)?.[1];
  const period = periods.find(p=>p.number===Number(periodNumber));
  if (!times.length && !period) return [];
  const start = times[0]?.padStart(5, '0') || period.start;
  const minutes = Number(start.slice(0,2))*60+Number(start.slice(3))+90;
  const end = times[1]?.padStart(5,'0') || (!times.length && period?.end) || `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  return days.flatMap((name, day) => value.toLowerCase().includes(name.toLowerCase()) || value.toLowerCase().includes(english[day]) ? [{ day, start, end, room: course.room, kind: 'Лекц' }] : []);
}
const overlap = (a,b) => a.day === b.day && a.start < b.end && a.end > b.start;
function validateSessions(sessions) {
  if (!Array.isArray(sessions) || sessions.length > 14) return 'Хуваарийн бүтэц буруу байна.';
  for (const session of sessions) {
    if (!session || !Number.isInteger(session.day) || session.day<0 || session.day>6 || !time(session.start) || !time(session.end) || session.end <= session.start || typeof session.room !== 'string' || !session.room.trim() || session.room.length>100 || !['Лекц','Лаборатори','Семинар'].includes(session.kind)) return 'Өдөр, эхлэх/дуусах цаг, өрөө, төрлийг зөв оруулна уу.';
  }
  if(sessions.some((a,i)=>sessions.slice(i+1).some(b=>overlap(a,b)))) return 'Нэг хичээлийн цагууд хоорондоо давхцаж байна.';
  return null;
}
const periodFor = session => periods.find(p=>p.start===session.start && p.end===session.end);
const scheduleLabel = sessions => sessions.map(s=>`${days[s.day]} ${periodFor(s)?`${periodFor(s).number}-р пар `:''}${s.start}–${s.end}`).join(' · ');
module.exports = { periods, periodFor, days, sessionsFor, overlap, validateSessions, scheduleLabel };
