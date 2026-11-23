import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const require = createRequire(import.meta.url);
const {webkit,chromium,devices} = require(process.env.NOX_PLAYWRIGHT || 'playwright');
const base = process.env.NOX_URL || `http://127.0.0.1:${process.env.PORT||4173}/`;
const engine = process.env.NOX_BROWSER || 'webkit';
const scenarios = [
  ['stop','help','withhold','answer','answer','1946','vera','bridge',false,'Свет под мостом'],
  ['quiet','blame','withhold','decline','decline','канал б','local','bridge',false,'Домой до рассвета'],
  ['stop','blame','leak','decline','answer','1946','vera','bridge',false,'Эфир без ответа'],
  ['quiet','help','leak','answer','decline','канал б','local','north',true,'Линия занята'],
  ['quiet','help','leak','answer','answer','1946','vera','bridge',true,'Свет под мостом']
];
const server = process.env.NOX_URL ? null : spawn(process.execPath,[new URL('./server.mjs',import.meta.url).pathname],{stdio:['ignore','pipe','inherit']});
let browser;
try {
  if(server) await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('Test server exited');})]);
  browser = engine==='chromium' ? await chromium.launch({executablePath:process.env.NOX_CHROMIUM || undefined}) : await webkit.launch();
  for (const [greeting,anton,trust,call3,call5,vault,recipient,exit,divert,ending] of scenarios) {
    const device = devices['iPhone 13'];
    const context = await browser.newContext({...device,reducedMotion:'reduce'});
    const page=await context.newPage();
    page.setDefaultTimeout(4000);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400) errors.push(r.status()+' '+r.url());});
    const btn = action=>page.locator(`[data-action="${action}"]`).first();
    const click = action=>btn(action).click();
    const app = async id=>{if(await page.locator('#home').isVisible()) await page.locator('#home').click();await click('app:'+id);};
    const form = async (kind,value)=>{
      const scope=page.locator(`[data-form="${kind}"]`);
      await scope.locator('input[name="answer"]').fill(value);
      await scope.locator('button').click();
    };
    const clue = async (id,detail)=>{await app(id);await click('detail:'+detail);};
    const photo = async (...ids)=>{
      for(const id of ids){await clue('photos','p'+id);await click('photo-inspect');}
    };
    const web = async (query,id)=>{await app('web');await form('search',query);await click('detail:'+id);};
    const puzzle = async (id,name)=>{await app(id);await click('puzzle:'+name);};
    const solve = async (id,name,value)=>{await puzzle(id,name);await form('answer',value);};
    const sequence = async (id,name,choices)=>{
      await puzzle(id,name);
      for(const choice of choices) await page.getByRole('button',{name:choice,exact:true}).click();
      await click('verify');
    };
    const state = ()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nox-os-final-v1')));
    const chapter = async n=>assert.equal((await state()).chapter,n);
    await page.goto(base);
    await page.getByRole('heading',{name:/Чужой/}).waitFor();
    if(process.env.NOX_SCREENSHOTS && greeting==='stop' && trust==='withhold') await page.screenshot({path:process.env.NOX_SCREENSHOTS+'/nox-lock.png'});
    await click('unlock');
    await chapter(1);
    for(const id of ['messages','phone','photos','notes','files','maps','web','invest']){
      await click('app:'+id);
      assert.equal(await page.locator('#phone').getAttribute('data-screen'),id);
      await page.locator('#home').click();
    }
    await clue('messages','m'); await click('reply:greeting:'+greeting);
    await page.locator('.bubble.out').waitFor();
    await clue('notes','pinNote');
    await photo(1,2);
    await puzzle('notes','profile');
    await form('answer','0000');
    await page.getByRole('alert').waitFor();
    await click('hint'); await page.locator('.hint').waitFor();
    await form('answer','1927');
    await app('web'); await form('search','пустой запрос');
    assert.match(await page.locator('.body').innerText(),/Совпадений нет/);
    await web('берег-04','archive');
    await page.reload();
    await page.getByRole('heading',{name:'Городской архив · БЕРЕГ-04'}).waitFor();
    assert.equal((await state()).decisions.greeting,greeting);
    assert.ok(Object.keys((await state()).read).length);
    await solve('web','bulletin','берег-04'); await chapter(2);
    await clue('photos','p10'); await click('zoom');
    await page.getByRole('button',{name:'Восстановить тени'}).click();
    await page.getByRole('img',{name:'На стекле процарапан круг с двумя отметками'}).waitFor();
    await page.getByRole('button',{name:'Закрыть'}).click();
    assert.ok((await state()).evidence.ringMark);
    await clue('messages','a'); await click('reply:anton:'+anton);
    await photo(5,6,8,12);
    await web('рейс 12','bus');
    await clue('phone','callLog'); await clue('phone','earlyCall');
    await sequence('maps','route',['Вышка','Красный мост','Вентиляционная лестница']);
    await puzzle('invest','alibi');
    await page.getByRole('button',{name:'Фото снято в 18:26, а последний рейс отменили',exact:true}).click();
    await sequence('invest','timeline',['Лиза снимает табличку','Первый звонок со скрытого номера','Оригинал с вышки','Кадр на мосту','Звонок маме','Уведомление депо']);
    await chapter(3);
    await page.reload();
    await page.getByRole('dialog',{name:'Входящий вызов'}).waitFor();
    await click('call:chapter3:'+call3);
    if(call3==='answer') await click('hangup');
    await web('кадровый бюллетень','staff');
    await solve('phone','caller','Ильин');
    await clue('notes','radio'); await solve('notes','signature','сом');
    await clue('messages','u'); await click('reply:trust:'+trust);
    await chapter(4);
    await page.getByText('Сообщение отозвано',{exact:true}).waitFor();
    if(vault==='1946'){await clue('notes','order');await photo(14);}
    else await web('схема','manual');
    await solve('files','vault',vault);
    await clue('files','rec');
    await page.waitForFunction(()=>document.querySelector('audio')?.readyState>=1,null,{timeout:15000}).catch(async error=>{
      const status=await page.locator('audio').evaluate(el=>({src:el.currentSrc,network:el.networkState,mediaError:el.error?.message}));
      throw new Error(JSON.stringify(status),{cause:error});
    });
    await sequence('files','sector',['Длинный','Короткий','Короткий']);
    await clue('files','paper'); await clue('files','machine');
    await solve('invest','forgery','23:17');
    await clue('files','protocol'); await photo(17,22);
    await sequence('maps','escape',['Синяя дверь','Боковой коллектор','Красный мост']);
    await chapter(5);
    await click('call:chapter5:'+call5);
    if(call5==='answer') await click('hangup');
    await app('photos');
    assert.equal(await page.locator('.gallery button').count(),25);
    await page.locator('.gallery img').evaluateAll(imgs=>{for(const img of imgs) img.loading='eager';});
    await page.waitForFunction(()=>[...document.querySelectorAll('.gallery img')].every(img=>img.complete && img.naturalWidth>0));
    await clue('notes','phrase'); await solve('phone','voice','Под красным мостом');
    await page.locator('select[name="recipient"]').selectOption(recipient);
    await page.locator('select[name="exit"]').selectOption(exit);
    if(divert) await page.locator('input[name="divert"]').check();
    await page.getByRole('button',{name:'Передать по линии'}).click();
    await page.getByRole('heading',{name:ending,exact:true}).waitFor();
    await page.reload();
    await page.getByRole('heading',{name:ending,exact:true}).waitFor();
    assert.equal(Object.keys((await state()).solved).length,12);
    assert.deepEqual(errors,[]);
    page.once('dialog',dialog=>dialog.accept());
    await click('reset');
    await page.getByRole('button',{name:'Поднять телефон'}).waitFor();
    await chapter(1);
    assert.deepEqual((await state()).solved,{});
    await page.evaluate(()=>localStorage.setItem('nox-os-final-v1','{"version":1,"screen":"broken"}'));
    await page.reload();
    await page.getByRole('status').getByText('Сохранение недоступно или повреждено.').waitFor();
    assert.deepEqual(errors,[]);
    console.log(`${engine}: ${ending} · ${trust}/${anton}/${call3}/${call5}/${vault}`);
    await context.close();
  }
} finally {
  await browser?.close();
  server?.kill();
}
