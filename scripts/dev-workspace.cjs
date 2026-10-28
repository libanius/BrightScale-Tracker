const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = process.cwd();
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};
http
  .createServer((req, res) => {
    let name;
    try {
      name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (name.endsWith("/")) name += "index.html";
    const f = path.resolve(root, "." + name);
    if (
      !f.startsWith(root + path.sep) ||
      name.split("/").some((x) => x.startsWith("."))
    ) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(f, (e, data) => {
      if (e) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        types[path.extname(f)] || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(data);
    });
  })
  .listen(
    Number(
      process.env.PORT ||
        process.argv[process.argv.indexOf("--port") + 1] ||
        3000,
    ),
    "0.0.0.0",
  );
