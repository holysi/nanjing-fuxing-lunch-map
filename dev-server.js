const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };

http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) {
    response.writeHead(403); response.end(); return;
  }
  fs.readFile(target, (error, content) => {
    if (error) { response.writeHead(404); response.end("Not found"); return; }
    response.writeHead(200, { "Content-Type": `${types[path.extname(target)] || "application/octet-stream"}; charset=utf-8` });
    response.end(content);
  });
}).listen(8000, "127.0.0.1", () => console.log("Preview: http://127.0.0.1:8000"));
