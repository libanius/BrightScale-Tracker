const esbuild = require("esbuild");
const fs = require("node:fs");
(async () => {
  fs.mkdirSync("workspace/build", { recursive: true });
  await esbuild.build({
    entryPoints: ["workspace/app.jsx"],
    bundle: true,
    minify: true,
    outfile: "workspace/build/app.js",
    format: "iife",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  fs.copyFileSync(
    "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
    "workspace/build/pdf.worker.min.mjs",
  );
})();
