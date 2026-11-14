import http from 'node:http';
import { readFile } from 'node:fs/promises';
export async function startFixture() {
  const html = await readFile(new URL('../fixtures/contact.html',import.meta.url));
  const server = http.createServer((req,res)=>{
    res.setHeader('Content-Type','text/html; charset=utf-8');
    if(req.url==='/missing') {res.writeHead(404);res.end('<h1>Page missing</h1>');}
    else if(req.url==='/healthy-shipping') res.end('<h1>Shipping information</h1>');
    else if(req.url==='/healthy') res.end(html.toString().replace('href="/missing"','href="/healthy-shipping"'));
    else if(req.url==='/broken') res.end(html);
    else {res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {base:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
