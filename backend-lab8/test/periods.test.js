const {test}=require('node:test');
const assert=require('node:assert/strict');
const {periods,periodFor,sessionsFor,validateSessions,overlap,scheduleLabel}=require('../services/schedule');
test('five class periods are distinct and render the same times in labels',()=>{
 assert.equal(periods.length,5);
 assert.deepEqual(periods.map(p=>p.number),[1,2,3,4,5]);
 assert.deepEqual(periods[0],{number:1,start:'08:40',end:'10:10'});
 for(const p of periods){
  const session={day:0,start:p.start,end:p.end,room:'A-101',kind:'Лекц'};
  assert.equal(periodFor(session).number,p.number);
  assert.match(scheduleLabel([session]),new RegExp(`${p.number}-р пар`));
  for(const q of periods.filter(q=>q.number!==p.number))assert.equal(overlap(session,{day:0,...q}),false);
 }
});
test('legacy period strings resolve the correct day and time',()=>{
 for(const text of ['Мягмар 2-р пар','Мягмар 2-пар','Мягмар 2 пар']) {
  const sessions=sessionsFor({schedule:text,room:'A'});
  assert.equal(sessions.length,1);
  assert.equal(sessions[0].day,1);
  assert.equal(sessions[0].start,periods[1].start);
  assert.equal(sessions[0].end,periods[1].end);
 }
 const third=sessionsFor({schedule:'Пүрэв 3-р пар',room:'A'});
 assert.equal(third[0].day,3);assert.equal(periodFor(third[0]).number,3);
});
test('one course can have all five periods or the same period on different days',()=>{
 const sessions=periods.map(p=>({day:0,start:p.start,end:p.end,room:'A',kind:'Лекц'}));
 assert.equal(validateSessions(sessions),null);
 assert.equal(validateSessions([sessions[0],{...sessions[0],day:1}]),null);
 assert.ok(validateSessions([sessions[0],{...sessions[0]}]));
});
