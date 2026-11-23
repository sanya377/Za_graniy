import { choices, puzzles } from './story.js';

export const key = 'nox-os-final-v1';
export const initial = () => ({
  version:1, chapter:1, screen:'lock', detail:'', evidence:{}, solved:{},
  read:{}, decisions:{}, queue:[], fired:{}, history:[], replies:[],
  relationship:{m:0,a:0,v:0,u:0}, call:'', ending:'', muted:false
});
export function restore(raw) {
  if (!raw) return initial();
  const saved = JSON.parse(raw);
  const base = initial();
  if (!saved || saved.version!==1 || !Number.isInteger(saved.chapter) ||
      saved.chapter<1 || saved.chapter>5 ||
      !['lock','home','messages','photos','notes','web','maps','phone','files','invest','final','notifications','ending'].includes(saved.screen)) {
    throw new Error('Неизвестный формат сохранения');
  }
  for (const [name,value] of Object.entries(base)) {
    const current = saved[name];
    if (typeof current!==typeof value || current===null || Array.isArray(current)!==Array.isArray(value)) {
      throw new Error('Повреждено поле сохранения: '+name);
    }
  }
  return saved;
}
const normalize = value => String(value).toLowerCase().replace(/ё/g,'е').trim().replace(/\s+/g,' ');
export const has = (s,id) => Boolean(s.evidence[id] || s.solved[id]);
export const requires = (s,ids) => ids.every(id=>has(s,id));
export function accessible(s,puzzle) {
  return s.chapter >= puzzle[1] && requires(s,puzzle[5]);
}
export function choiceAvailable(s,id) {
  const choice = choices[id];
  return s.chapter >= choice.chapter && requires(s,choice.needs || []) && !s.decisions[id] && !s.ending;
}
function event(s,id,type,body) {
  if (s.fired[id]) return;
  s.fired[id] = true;
  s.queue.push({id,type,body});
  s.history.push({chapter:s.chapter,body});
}
export function settle(s) {
  if (s.ending) return;
  const gates = [
    ['profile','bulletin'], ['route','alibi','timeline'], ['caller','signature'], ['vault','sector','forgery','escape']
  ];
  if (s.chapter < 5 && requires(s,gates[s.chapter-1]) &&
      (s.chapter!==3 || s.decisions.trust)) {
    s.chapter++;
    const notifications = {
      2:'Телефон восстановил резервную копию за 72 часа.',
      3:'Неизвестный запросил соединение. Добавочный 206.',
      4:'Из личного чата восстановлена папка ночной смены.',
      5:'На линии абонент с SIM Лизы.'
    };
    event(s,'chapter'+s.chapter,s.chapter===3 || s.chapter===5 ? 'call':'message',notifications[s.chapter]);
  }
  if (s.solved.route) event(s,'route','message','Лиза · личный чат: «Оригиналы помечены звёздочкой».');
  if (s.solved.profile) event(s,'profile','message','Открыт личный чат Лизы.');
  if (s.evidence.p2) event(s,'tower','message','Неизвестный: «Снимок вышки тоже верните».');
  if (s.solved.signature) event(s,'vera','message','Вера подтвердила подпись. Резервный канал готов.');
  if (s.solved.vault) event(s,'vault','message','В архиве восстановлены два журнала и кассета.');
}
export function discover(s,id,label) {
  if (s.evidence[id] || s.ending) return;
  s.evidence[id] = label;
  s.history.push({chapter:s.chapter,body:'Источник изучен · '+label});
}
export function attempt(s,id,value) {
  const p = puzzles.find(item=>item[0]===id);
  if (s.solved[id]) return '';
  if (!p || !accessible(s,p) || s.ending) return 'Сначала соберите источники.';
  const answer = p[6];
  let success = Array.isArray(answer) ? JSON.stringify(answer)===JSON.stringify(value) : normalize(answer)===normalize(value);
  if (id==='vault') {
    success = (success && requires(s,['order','p14'])) ||
      (['б','канал б'].includes(normalize(value)) && has(s,'manual'));
  }
  if (id==='bulletin' && normalize(value)==='берег 04') success = true;
  if (!success) return 'Версия не подтверждается. Проверьте источники или откройте подсказку.';
  s.solved[id] = p[3];
  s.history.push({chapter:s.chapter,body:'Версия подтверждена · '+p[3]});
  return '';
}
export function reply(s,id,value) {
  if (!choices[id] || !choiceAvailable(s,id)) return;
  const choice = choices[id];
  const line = choice.list.find(item=>item[0]===value);
  if (!line) return;
  s.decisions[id] = value;
  s.relationship[choice.person] += ['stop','help','withhold'].includes(value) ? 1 : -1;
  s.replies.push({person:choice.person,text:line[1],chapter:s.chapter,out:true},{person:choice.person,text:line[2],chapter:s.chapter});
  if (id==='trust') s.evidence.deleted = 'Сообщение диспетчера отозвано после вашего ответа';
  event(s,'reply-'+id,'message',line[2]);
}
export function answerCall(s,id,mode) {
  const index = s.queue.findIndex(item=>item.id===id && item.type==='call');
  if (index<0) return;
  s.queue.splice(index,1);
  const call = id==='chapter3'?'3':'5';
  s.decisions['call'+call] = mode;
  discover(s,'call'+call,call==='3'?'Входящий вызов · добавочный 206':'Последний звонок · ответ Лизы');
  s.call = mode==='answer'?call:'';
}
export function finish(s,recipient,exit,divert) {
  if (!s.solved.voice || s.ending || !['vera','local'].includes(recipient) || !['bridge','north'].includes(exit)) return;
  const diversion = Boolean(divert && s.relationship.a>0);
  s.decisions.final = {recipient,exit,diversion};
  const safe = exit==='bridge' && (s.decisions.trust!=='leak' || diversion);
  s.ending = safe ? (recipient==='vera'?'light':'quiet') : (recipient==='vera'?'signal':'lost');
  s.history.push({chapter:5,body:'Связь завершена'});
  s.screen = 'ending';
  s.detail = '';
}
