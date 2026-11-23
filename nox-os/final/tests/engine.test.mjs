import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,attempt,answerCall,settle,reply,finish,discover} from '../engine.js';
import {puzzles,photos,messages} from '../story.js';

test('content and required inputs',()=>{
  assert.equal(photos.length,25);
  assert.ok(messages.length>=100);
  assert.equal(puzzles.length,12);
  const s=initial();
  assert.equal(s.screen,'lock');
  assert.match(attempt(s,'profile','1927'),/источники/);
  discover(s,'pinNote','Билет');
  discover(s,'p1','Билет');
  assert.match(attempt(s,'profile','0000'),/не подтверждается/);
  assert.equal(attempt(s,'profile','1927'),'');
});
test('every combination of story decisions, calls, vault paths and final choices',()=>{
  const results = new Set();
  for(const greeting of ['stop','quiet',null]) for(const anton of ['help','blame',null]) for(const trust of ['withhold','leak'])
  for(const call3 of ['answer','decline']) for(const call5 of ['answer','decline']) for(const vault of ['1946','канал б'])
  for(const recipient of ['vera','local']) for(const exit of ['bridge','north']) for(const diversion of [true,false]){
    let s=initial();
    const solve = p=>{
      for(const id of p[5]) if(!/^call[35]$/.test(id)) discover(s,id,id);
      if(p[0]==='vault') for(const id of vault==='1946'?['p14','order']:['manual']) discover(s,id,id);
      assert.equal(attempt(s,p[0],p[0]==='vault'?vault:p[6]),'');
      settle(s);
    };
    reply(s,'greeting',greeting);
    for(let chapter=1;chapter<=5;chapter++){
      assert.equal(s.chapter,chapter);
      if(chapter===2) reply(s,'anton',anton);
      if(chapter===3) answerCall(s,'chapter3',call3);
      if(chapter===5) answerCall(s,'chapter5',call5);
      for(const p of puzzles.filter(p=>p[1]===chapter)) solve(p);
      if(chapter===3){reply(s,'trust',trust);settle(s);}
      s=JSON.parse(JSON.stringify(s));
    }
    const safe = exit==='bridge' && (trust==='withhold' || anton==='help' && diversion);
    finish(s,recipient,exit,diversion);
    assert.equal(s.ending,safe?(recipient==='vera'?'light':'quiet'):(recipient==='vera'?'signal':'lost'));
    assert.equal(s.screen,'ending');
    assert.equal(Object.keys(s.solved).length,12);
    const history=JSON.stringify(s.history);
    settle(s); finish(s,'local','north',false);
    assert.equal(JSON.stringify(s.history),history);
    results.add(s.ending);
  }
  assert.equal(results.size,4);
});
