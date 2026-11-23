import {chapters,people,messages,choices,photos,records,puzzles,endings} from './story.js';
import {key,initial,restore,has,settle,discover,accessible,choiceAvailable,attempt,reply,answerCall,finish} from './engine.js';

const $ = id => document.getElementById(id);
const view = $('view');
const apps = {
 messages:['Сообщения','mint','M4 5h16v11H9l-5 4z'],
 phone:['Телефон','green','M6 3l4 4-2 3a11 11 0 0 0 6 6l3-2 4 4-3 3C10 20 4 14 3 6z'],
 photos:['Фото','sand','M3 5h18v14H3z M3 17l6-6 4 4 3-3 5 5 M16 9h1'],
 notes:['Заметки','yellow','M5 3h14v18H5z M8 8h8m-8 4h8m-8 4h5'],
 files:['Файлы','blue','M3 6h7l2 2h9v11H3z'],
 maps:['Карты','sage','M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16m6-14v16'],
 web:['Браузер','ice','M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z M15 9l-2 4-4 2 2-4z'],
 invest:['Дело Лизы','rust','M7 5H4v16h16V5h-3 M8 3h8v4H8z M8 12h8m-8 4h6']
};
const icon = name => `<span class="app-icon ${apps[name][1]}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${apps[name][2]}" /></svg></span>`;
const h = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const b = (action,label,cls='') => `<button class="${cls}" data-action="${action}">${h(label)}</button>`;
let s = initial();
let storageError = false;
try {
  s = restore(localStorage.getItem(key));
} catch { storageError = true; }
let hint = '', error = '', search = s.ui?.search || '', seq = s.ui?.seq || [], toastTimer, ringTimer, activeSound, lastCall;
const times = ['22:07','22:09','22:11','22:13','22:15'];
const visibleMessage = m => m.chapter<=s.chapter && (m.person!=='l' || s.solved.profile);
const unread = person => messages.filter(m=>visibleMessage(m) && (!person || m.person===person) && !s.read[m.id]).length;
const audio = (name,loop=false) => {
  if (s.muted) return;
  activeSound?.pause();
  activeSound = new Audio('./assets/'+name+'.wav');
  activeSound.loop = loop;
  activeSound.volume = .64;
  activeSound.play().catch(()=>{});
};
function notify(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>$('toast').hidden=true,3900);
}
function save() {
  s.ui = {search,seq};
  try { localStorage.setItem(key,JSON.stringify(s)); }
  catch { if (!storageError) notify('Хранилище недоступно. Прогресс сохранится до закрытия вкладки.'); storageError=true; }
}
function transact(fn) {
  const before = new Set(Object.keys(s.fired));
  fn();
  settle(s);
  if (s.screen==='messages' && s.detail) {
    for (const m of messages) if (m.person===s.detail && visibleMessage(m)) s.read[m.id]=true;
  }
  save();
  render();
  const fresh = s.queue.filter(n=>!before.has(n.id) && n.type==='message').at(-1);
  if (fresh) { notify(fresh.body); if (!s.call && !s.queue.some(n=>n.type==='call')) audio(fresh.id==='vault'?'interference':'notification'); }
}
function openScreen(screen,detail='') {
  hint = error = ''; seq = [];
  if (screen!=='web') search='';
  if (screen!=='phone') s.call='';
  s.screen=screen; s.detail=detail;
  view.scrollTop=0;
}
function header(kicker,title,sub='') {
  return `<div class="app-head">${b(s.detail?'back':'home',s.detail?'‹ Назад':'‹ Рабочий стол','back')}<p class="eyebrow">${h(kicker)}</p><h1>${h(title)}</h1>${sub?`<p class="sub">${h(sub)}</p>`:''}</div>`;
}
const body = html => `<div class="body">${html}</div>`;
function listRow(action,title,sub='',visual='') {
  return `<button class="row" data-action="${action}">${visual}<span><strong>${h(title)}</strong>${sub?`<small>${h(sub)}</small>`:''}</span><i aria-hidden="true">›</i></button>`;
}
function locker() {
  return `<section class="lock"><div class="lock-top"><p class="eyebrow">NOX OS <span></span> 16+</p><div class="lock-date">Четверг, 19 ноября</div><div class="clock">${times[s.chapter-1]}</div></div>
  <div class="lock-bottom"><div class="lock-message"><span class="mini mint">✦</span><div><strong>${s.history.length?'Телефон Лизы':'Сообщения · Мама'}</strong><p>${s.history.length?chapters[s.chapter-1]:'Кто читает? У меня две галочки.'}</p></div><small>сейчас</small></div>
  <div class="lock-story"><p class="eyebrow">ИНТЕРАКТИВНЫЙ ТРИЛЛЕР</p><h1>Чужой<br>телефон<span>.</span></h1><p>Под табло пустой остановки загорается экран. Он всё ещё ждёт её.</p>
  ${b('unlock',s.history.length?'Разблокировать':'Поднять телефон','primary unlock')}</div>
  <div class="lock-footer">${b('sound',s.muted?'Включить эффекты':'Эффекты включены','quiet')}<span>Сохранение на устройстве</span></div></div></section>`;
}
function home() {
  const count = unread();
  return `<section class="spring"><div class="home-top"><p class="eyebrow">NOX OS <span></span> ТЕЛЕФОН ЛИЗЫ</p>${b('lock','Заблокировать','quiet')}</div>
  <button class="chapter-card" data-action="app:invest"><span class="eyebrow">ГЛАВА ${s.chapter} ИЗ 5</span><strong>${chapters[s.chapter-1]}</strong><small>${Object.keys(s.solved).length} / 12 версий подтверждено</small><span class="segments">${chapters.map((_,i)=>`<i class="${i<s.chapter?'on':''}"></i>`).join('')}</span></button>
  <div class="app-grid">${Object.entries(apps).map(([id,[label]])=>`<button data-action="app:${id}" class="app-tile">${icon(id)}${id==='messages'&&count?`<sup>${count}</sup>`:''}<span>${label}</span></button>`).join('')}</div>
  <div class="home-bottom">${b('sound',s.muted?'Эффекты выключены':'Эффекты включены','quiet')}${b('reset','Новая игра','quiet')}</div></section>`;
}
function chat() {
  const person=s.detail;
  if (!person) return header('NOX / СВЯЗЬ','Сообщения')+body(Object.entries(people).filter(([id])=>messages.some(m=>m.person===id && visibleMessage(m))).map(([id,name])=>{
    const preview = s.replies.filter(m=>m.person===id).at(-1) || messages.filter(m=>m.person===id && visibleMessage(m)).at(-1);
    return listRow('detail:'+id,name,(unread(id)?unread(id)+' новых · ':'')+preview.text,`<span class="avatar">${h(name[0])}</span>`);
  }).join(''));
  const lines = messages.filter(m=>m.person===person && visibleMessage(m));
  const bubbles = [];
  for (let chapter=1;chapter<=s.chapter;chapter++) {
    const group = lines.filter(m=>m.chapter===chapter);
    if (!group.length) continue;
    bubbles.push(`<div class="date-divider">${chapters[chapter-1]}</div>`);
    for (const m of group) bubbles.push(`<p class="bubble">${h(m.text.startsWith('Нижний пост закрывается') && s.decisions.trust?'Сообщение отозвано':m.text)}</p>`);
    for (const m of s.replies.filter(m=>m.person===person && m.chapter===chapter)) bubbles.push(`<p class="bubble ${m.out?'out':''}">${h(m.text)}</p>`);
  }
  return header('СООБЩЕНИЯ',people[person])+body(bubbles.join('')+Object.entries(choices).filter(([id,c])=>c.person===person && choiceAvailable(s,id)).map(([id,c])=>`<div class="panel"><p class="eyebrow">ВАШ ОТВЕТ</p>${c.list.map(row=>b('reply:'+id+':'+row[0],row[1],'option')).join('')}</div>`).join(''));
}
function gallery() {
  if (!s.detail) return header('НОСИТЕЛЬ / 19 НОЯБРЯ','Фото','Откройте кадр и изучите его метаданные.')+body(`<div class="gallery">${photos.map((p,i)=>p[0]<=s.chapter?`<button data-action="detail:p${i}"><img src="./assets/p${i}.webp" alt="${h(p[1])}" loading="lazy"><span>${h(p[1])}</span></button>`:'').join('')}</div>`);
  const i=Number(s.detail.slice(1)),p=photos[i];
  if (!p || p[0]>s.chapter) return galleryFallback();
  return header('ФОТО / ОРИГИНАЛ',p[1])+body(`<button class="photo-open" data-action="zoom"><img class="photo" src="./assets/p${i}.webp" alt="${h(p[1])}"></button><div class="panel"><p class="eyebrow">МЕТАДАННЫЕ</p><p>${h(p[2])}</p>${has(s,'p'+i)?`<p>${h(p[3])}</p><small class="found">Источник в деле</small>`:b('photo-inspect','Изучить кадр и EXIF','primary')}</div><div class="split">${i>0?b('detail:p'+(i-1),'‹ Предыдущий','quiet'):''}${photos[i+1]?.[0]<=s.chapter?b('detail:p'+(i+1),'Следующий ›','quiet'):''}</div>`);
}
const galleryFallback=()=>header('ФОТО','Кадр недоступен');
const availableRecords = app => records.filter(r=>r[1]<=s.chapter && (r[2]===app || app==='files' && r[2]==='sealed' && s.solved.vault));
const form = (action,placeholder,numeric=false) => `<form data-form="${action}"><input name="answer" aria-label="${h(placeholder)}" placeholder="${h(placeholder)}" autocomplete="off" ${numeric?'inputmode="numeric"':''} required><button class="primary">Проверить</button></form>`;
function recordView(r) {
  return header('ЛОКАЛЬНЫЙ ИСТОЧНИК',r[3])+body(`<article class="panel document"><p>${h(r[4])}</p>${r[0]==='rec'?'<audio controls preload="metadata"><source src="./assets/cassette.mp3" type="audio/mpeg"><source src="./assets/cassette.wav" type="audio/wav"></audio>':''}<small class="found">Источник в деле</small></article>`);
}
function browser() {
  return header('ЛОКАЛЬНЫЙ ИНДЕКС','Браузер','Сохранённые страницы городского архива.')+body(
    `<form data-form="search"><input name="answer" type="search" aria-label="Поиск по архиву" placeholder="Поиск по архиву" value="${h(search)}" required><button class="primary">Найти</button></form>`+
    (search?(availableRecords('web').filter(r=>r[5].split('|').some(term=>search.toLowerCase().includes(term))).map(r=>listRow('detail:'+r[0],r[3],'Сохранённая страница')).join('')||'<p class="sub">Совпадений нет. Проверьте индекс или ключевое слово.</p>'):'')+puzzleRows('web'));
}
function puzzleRows(app) {
  return puzzles.filter(p=>p[2]===app && p[1]<=s.chapter).map(p=>listRow('puzzle:'+p[0],p[3],s.solved[p[0]]?'Подтверждено':accessible(s,p)?'Открыто для проверки':'Нужны источники')).join('');
}
function puzzleView(p) {
  const [id,,,title,prompt,needs,answer,clue,extra]=p;
  const sequence=Array.isArray(answer);
  const options=sequence?[...new Set([...answer,...(extra||[])])].sort((a,b)=>a.localeCompare(b,'ru')):extra?[answer,...extra].sort((a,b)=>a.localeCompare(b,'ru')):[];
  const sources = [...needs,...(id==='vault'?['order','p14','manual']:[])];
  const labels = Object.fromEntries([...records.map(r=>[r[0],r[3]]),...photos.map((p,i)=>['p'+i,p[1]]),...puzzles.map(p=>[p[0],p[3]]),['call3','Вызов неизвестного'],['call5','Последний звонок']]);
  return header('ПРОВЕРКА ВЕРСИИ',title)+body(`<div class="panel"><p>${h(prompt)}</p>
   ${sources.length?`<ul class="sources">${sources.map(n=>`<li class="${has(s,n)?'found':''}">${has(s,n)?'✓':'○'} ${h(labels[n]||n)}</li>`).join('')}</ul>`:''}
   ${s.solved[id]?'<p class="found">Версия подтверждена.</p>':accessible(s,p)?
     sequence?`<div class="sequence" aria-live="polite">${seq.length?h(seq.join(' → ')):'Выберите первый элемент'}</div>${options.map((o,i)=>b('seq:'+i,o,'option')).join('')}<div class="split">${b('clear','Сбросить','quiet')}${b('verify','Проверить порядок','primary')}</div>`:
     options.length?options.map((o,i)=>b('pick:'+i,o,'option')).join(''):form('answer','Введите ответ',id==='profile'):
     '<p class="sub">Изучите отмеченные источники.</p>'}
   ${error?`<p class="error" role="alert">${h(error)}</p>`:''}${b('hint','Подсказка','quiet')}${hint?`<p class="hint">${h(clue)}</p>`:''}</div>`);
}
function maps() {
  return header('ОФЛАЙН / БЕРЕГ','Карты','Полевой план Лизы. Названия узлов совпадают с оригиналами в галерее.')+body(`<div class="map"><svg viewBox="0 0 330 245" role="img" aria-label="Вышка к западу от красного моста. Лестница к востоку. Северный пост выше станции.">
  <path class="river" d="M177 -20Q118 75 155 125T138 265"/><path class="road" d="M40 80L107 110H188l54 27 38-62m-38 62-43 67m43-67 46 54"/>
  <path class="marked" d="M40 80L107 110h81l54 27" opacity="${s.solved.route?1:0}"/>
  <path class="marked" d="M242 137l-43 67-31-36 20-58" opacity="${s.solved.escape?1:0}"/>
  <g><circle cx="40" cy="80" r="6"/><circle cx="145" cy="110" r="6"/><circle cx="242" cy="137" r="6"/><circle cx="280" cy="75" r="6"/><circle cx="199" cy="204" r="6"/><circle cx="288" cy="191" r="6"/></g>
  <g><text x="22" y="63">В · Вышка</text><text x="106" y="92">К · Красный мост</text><text x="193" y="123">Л · Вент. лестница</text><text x="212" y="56">С · Северный пост</text><text x="127" y="230">Б · Нижняя галерея</text><text x="237" y="172">Водозабор</text></g></svg></div>`+puzzleRows('maps'));
}
const callWords = {
 '3':'«Добавочный 206. Вы нашли чужую вещь. Северные ворота открыты. Я вижу, что вы читали переписку. Не заставляйте меня звонить ещё раз».',
 '5':'«Я у синей двери. Вода… Ты слышишь? Мама всегда спрашивала, где она спит. Под красным мостом. Скажи, куда мне идти. У меня ещё есть жёлтый свет».'
};
function phone() {
  if (s.call) return header('СОЕДИНЕНИЕ УСТАНОВЛЕНО',s.call==='3'?'Неизвестный':'Лиза')+body(`<div class="panel"><p>${h(callWords[s.call])}</p><audio controls preload="none" src="./assets/call${s.call}.mp3"></audio>${b('hangup','Завершить вызов','danger')}</div>`);
  return header('NOX / СВЯЗЬ','Телефон')+body(
    ['5','3'].filter(id=>has(s,'call'+id)).map(id=>`<div class="panel"><p class="eyebrow">${s.decisions['call'+id]==='decline'?'ГОЛОСОВАЯ ПОЧТА':'ЗАПИСЬ ЗВОНКА'}</p><h2>${id==='3'?'Неизвестный · 206':'Лиза'}</h2><p>${h(callWords[id])}</p><audio controls preload="none" src="./assets/call${id}.mp3"></audio></div>`).join('')+
    (availableRecords('phone').map(r=>listRow('detail:'+r[0],r[3],'Исходящие и пропущенные')).join('')||'<p class="sub">Журнал временно недоступен. Копия восстанавливается.</p>')+puzzleRows('phone'));
}
function investigation() {
  const leads = [
    'Владелицу зовут Лиза. Проверьте билет в галерее и личные записи, затем выясните, почему у вышки есть архивный индекс.',
    'Антон видел Лизу в автобусе, а мама слышала лестницу. Сверьте оригиналы, журнал вызовов и сведения о рейсе.',
    'У звонка есть добавочный номер. Проверьте кадровый бюллетень и радиобланк, прежде чем отвечать неизвестному.',
    'Ночная смена восстановлена. Сверьте шкалы пульта и правила доступа, затем изучите записи и путь к берегу.',
    'Голос знает про жёлтый свет. Проверьте ответ семейной фразой и решите, кому доверить запись.'
  ];
  const tasks = puzzles.filter(p=>p[1]===s.chapter && !s.solved[p[0]]);
  return header('ГЛАВА '+s.chapter+' / 5',chapters[s.chapter-1],'Лиза Волкова, 18 лет · пропала 19 ноября')+body(
    `<div class="panel"><p>${leads[s.chapter-1]}</p><p class="eyebrow">ТЕКУЩИЕ ВЕРСИИ</p>${tasks.map(p=>listRow('jump:'+p[0],p[3],apps[p[2]][0])).join('') || '<p>Все версии главы проверены.</p>'}
    ${choiceAvailable(s,'trust')?listRow('thread:u','Ответить неизвестному','Решение повлияет на поиски'):''}
    ${s.solved.voice && !s.ending?b('final','Передать запись и выбрать выход','primary'):''}</div>`+
    `<details class="panel"><summary>Восстановленная хронология</summary>${s.solved.timeline?'<ol><li>17.11 · 16:40 — архивная табличка</li><li>18.11 · 22:16 — скрытый звонок</li><li>19.11 · 21:06 — вышка</li><li>19.11 · 21:22 — красный мост</li><li>19.11 · 21:39 — Лиза звонит маме</li><li>19.11 · 21:58 — уведомление депо</li></ol>':'<p class="sub">Хронология появится после проверки маршрута и алиби.</p>'}${s.solved.forgery?'<p>23:17 (ночь аварии) — автоматика остановила насос. Журнал был подменён.</p>':''}</details>
    <details class="panel"><summary>Найденные улики · ${Object.keys(s.evidence).length}</summary><ul>${Object.values(s.evidence).map(e=>`<li>${h(e)}</li>`).join('')}</ul></details>
    <details class="panel"><summary>История действий</summary><ol>${s.history.map(e=>`<li>${h(e.body)}</li>`).join('')}</ol></details>`);
}
function finale() {
  return header('ГЛАВА 5 / 5','Последний звонок')+body(`<form class="final panel" data-form="final"><p>${s.decisions.trust==='leak'?'Ильин получил маршрут. Нижний пост предупреждён.':'Ильин ждёт у северных ворот.'}</p>
    <label>Куда отправить запись<select name="recipient"><option value="vera">Вере и редакциям</option><option value="local">Оставить в телефоне</option></select></label>
    <label>Куда направить Лизу<select name="exit"><option value="bridge">Боковой коллектор к мосту</option><option value="north">Северные ворота</option></select></label>
    ${s.relationship.a>0?'<label class="check"><input type="checkbox" name="divert"> Попросить Антона включить погрузчик</label>':'<small>Антон не подтвердил, что поможет.</small>'}
    <button class="primary">Передать по линии</button></form>`);
}
function render() {
  $('status-time').textContent=times[s.chapter-1];
  $('island').classList.toggle('live',s.queue.length>0);
  $('home').hidden=['lock','home','ending'].includes(s.screen);
  $('phone').dataset.screen=s.screen;
  const p=s.detail.startsWith('!')?puzzles.find(p=>p[0]===s.detail.slice(1)):null;
  const record=availableRecords(s.screen).find(r=>r[0]===s.detail);
  if (p) view.innerHTML=puzzleView(p);
  else if (record) view.innerHTML=recordView(record);
  else {
    switch (s.screen) {
      case 'lock': view.innerHTML=locker(); break;
      case 'home': view.innerHTML=home(); break;
      case 'messages': view.innerHTML=chat(); break;
      case 'photos': view.innerHTML=gallery(); break;
      case 'web': view.innerHTML=browser(); break;
      case 'maps': view.innerHTML=maps(); break;
      case 'phone': view.innerHTML=phone(); break;
      case 'invest': view.innerHTML=investigation()+body(puzzleRows('invest')); break;
      case 'final': view.innerHTML=finale(); break;
      case 'notifications': view.innerHTML=header('NOX OS','Уведомления')+body(s.queue.filter(n=>n.type==='message').map(n=>listRow('dismiss:'+n.id,n.body,'Коснитесь, чтобы снять')).join('')||'<p class="sub">Новых уведомлений нет.</p>'); break;
      case 'ending': {
        const e=endings[s.ending];
        const note=has(s,'ringMark')?'<p>Вера узнаёт знак на стекле. Сменщики нижнего поста рисовали его, когда хотели передать сообщение через окно.</p>':'';
        view.innerHTML=`<section class="ending"><p class="eyebrow">ЧУЖОЙ ТЕЛЕФОН / ЭПИЛОГ</p><h1>${h(e[0])}</h1><p>${h(e[1])}</p>${note}${b('app:invest','Открыть дело','option')}${b('reset','Новая игра','primary')}</section>`; break;
      }
      default: view.innerHTML=header('ЛОКАЛЬНЫЕ ДАННЫЕ',apps[s.screen][0])+body(availableRecords(s.screen).map(r=>listRow('detail:'+r[0],r[3],has(s,r[0])?'Изучено':'Открыть')).join('')+puzzleRows(s.screen));
    }
  }
  renderCall();
}
function renderCall() {
  const incoming = s.queue.find(n=>n.type==='call');
  const overlay=$('incoming');
  overlay.hidden=!incoming;
  if (!incoming) { lastCall=''; clearTimeout(ringTimer); return; }
  const name=incoming.id==='chapter3'?'Неизвестный':'Лиза';
  overlay.innerHTML=`<div class="call-card" role="dialog" aria-label="Входящий вызов"><p class="eyebrow">ВХОДЯЩИЙ ВЫЗОВ</p><strong>${name}</strong><div class="split">${b('call:'+incoming.id+':decline','Отклонить','danger')}${b('call:'+incoming.id+':answer','Ответить','primary')}</div></div>`;
  if (lastCall!==incoming.id) {
    lastCall=incoming.id;
    audio('ring');
    navigator.vibrate?.([140,90,140]);
    clearTimeout(ringTimer);
    ringTimer=setTimeout(()=>{if(lastCall===incoming.id) audio('ring');},3800);
  }
}
function currentOptions() {
  const p=puzzles.find(p=>p[0]===s.detail.slice(1));
  return [...new Set([...(Array.isArray(p[6])?p[6]:[p[6]]),...(p[8]||[])])].sort((a,b)=>a.localeCompare(b,'ru'));
}
function verify(value) {
  const id=s.detail.slice(1);
  error=attempt(s,id,value);
  if (!error) {
    if (id==='voice') openScreen('final');
    else openScreen(s.screen);
  }
}
$('phone').addEventListener('click',e=>{
  const button=e.target.closest('button');
  if (!button) return;
  const action=button.dataset.action || button.id;
  if (!action) return;
  const [kind,id,arg]=action.split(':');
  const keepScroll=['hint','seq','clear'].includes(kind);
  const scroll=view.scrollTop;
  transact(()=>{
    switch(kind){
      case 'unlock': audio('notification'); openScreen('home'); break;
      case 'home': openScreen(s.ending?'ending':'home'); break;
      case 'lock': openScreen('lock'); break;
      case 'island': openScreen('notifications'); break;
      case 'sound': s.muted=!s.muted; if(s.muted) activeSound?.pause();else audio('notification'); break;
      case 'reset': if(confirm('Начать новую игру? Текущее расследование будет удалено.')){activeSound?.pause();s=initial(); openScreen('lock');} break;
      case 'app': openScreen(id); break;
      case 'back': openScreen(s.screen); break;
      case 'detail': {
        const record=availableRecords(s.screen).find(r=>r[0]===id);
        if(record) discover(s,id,record[3]);
        openScreen(s.screen,id); break;
      }
      case 'thread': openScreen('messages',id); break;
      case 'jump': openScreen(puzzles.find(p=>p[0]===id)[2],'!'+id); break;
      case 'puzzle': openScreen(s.screen,'!'+id); break;
      case 'photo-inspect': discover(s,s.detail,photos[Number(s.detail.slice(1))][1]); break;
      case 'zoom': {
        const dialog=document.createElement('dialog');
        dialog.innerHTML=`<img src="./assets/${h(s.detail)}.webp" alt="Увеличенный снимок">${s.detail==='p10'?'<button class="option" data-exposure>Восстановить тени</button><p data-reflection hidden></p>':''}<button class="primary" data-close>Закрыть</button>`;
        dialog.querySelector('[data-exposure]')?.addEventListener('click',event=>{
          event.currentTarget.hidden=true;
          const picture=dialog.querySelector('img');
          picture.src='./assets/trace.webp';
          picture.alt='На стекле процарапан круг с двумя отметками';
          const text=dialog.querySelector('[data-reflection]');
          text.textContent='Круг с двумя отметками, как на штампе нижнего поста.';
          text.hidden=false;
          transact(()=>discover(s,'ringMark','Знак нижнего поста на стекле'));
        });
        dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
        dialog.addEventListener('close',()=>dialog.remove());
        document.body.append(dialog); dialog.showModal(); break;
      }
      case 'hint': hint=hint?'':'visible'; break;
      case 'reply': reply(s,id,arg); break;
      case 'call': activeSound?.pause(); openScreen('phone'); answerCall(s,id,arg); break;
      case 'hangup': s.call=''; break;
      case 'dismiss': s.queue=s.queue.filter(n=>n.id!==id); break;
      case 'seq': {
        const limit=puzzles.find(p=>p[0]===s.detail.slice(1))[6].length;
        if(seq.length<limit) seq.push(currentOptions()[Number(id)]);
        else error='Сбросьте порядок, чтобы собрать новую версию.';
        break;
      }
      case 'clear': seq=[]; error=''; break;
      case 'verify': verify(seq); break;
      case 'pick': verify(currentOptions()[Number(id)]); break;
      case 'final': openScreen('final'); break;
    }
  });
  if (keepScroll) view.scrollTop=scroll;
  if (kind==='call' && arg==='answer' && !s.muted) view.querySelector('audio')?.play().catch(()=>{});
});
view.addEventListener('submit',e=>{
  const kind=e.target.dataset.form;
  if(!kind) return;
  e.preventDefault();
  const data=new FormData(e.target);
  transact(()=>{
    if(kind==='search') search=String(data.get('answer')).trim();
    if(kind==='answer') verify(data.get('answer'));
    if(kind==='final') finish(s,data.get('recipient'),data.get('exit'),data.has('divert'));
  });
});
let touchStart;
view.addEventListener('touchstart',e=>{touchStart=e.changedTouches[0].clientY;},{passive:true});
view.addEventListener('touchend',e=>{
  if(s.screen==='lock' && touchStart-e.changedTouches[0].clientY>65) transact(()=>{audio('notification');openScreen('home');});
},{passive:true});
render();
if (storageError) notify('Сохранение недоступно или повреждено.');
