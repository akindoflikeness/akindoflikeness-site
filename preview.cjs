// Development server only; Cloudflare serves the deployed site and Functions.
const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname;
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end()}
 if(url.pathname==='/api/bypo-readme'){
  const readme=path.resolve(root,'../bypomono/README.md');
  if(!fs.existsSync(readme)){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  return res.end(JSON.stringify({content:fs.readFileSync(readme).toString('base64'),html_url:'https://github.com/wraithsys/bypomono/blob/main/README.md',download_url:'https://raw.githubusercontent.com/wraithsys/bypomono/main/README.md'}));
 }
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname))}catch{res.writeHead(400);return res.end()}
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end()}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');else if(!path.extname(file))file+='.html';
 if(!fs.existsSync(file)){res.writeHead(404,{'Content-Type':'text/html'});return res.end(fs.readFileSync(path.join(root,'404.html')))}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
}).listen(4174,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4174'));
