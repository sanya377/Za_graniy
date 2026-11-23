import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../',import.meta.url);
const mime = { html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',webp:'image/webp',wav:'audio/wav',mp3:'audio/mpeg' };
createServer(async (req,res)=>{
  const path = new URL(req.url,'http://localhost').pathname;
  if (!/^\/(?:[\w-]+\/)*[\w.-]*$/.test(path) || path.includes('..')) { res.writeHead(400).end(); return; }
  try {
    const file = new URL(path.slice(1)||'index.html',root);
    const data = await readFile(fileURLToPath(file));
    const headers = {'Content-Type':mime[file.pathname.split('.').at(-1)]||'application/octet-stream','Accept-Ranges':'bytes'};
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(range[2]?Number(range[2]):data.length-1,data.length-1);
      if (start>end) {
        res.writeHead(416,{'Content-Range':'bytes */'+data.length}).end();
        return;
      }
      res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1}).end(data.subarray(start,end+1));
      return;
    }
    res.writeHead(200,{...headers,'Content-Length':data.length}).end(data);
  } catch {
    res.writeHead(404).end();
  }
}).listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('NOX OS ready'));
