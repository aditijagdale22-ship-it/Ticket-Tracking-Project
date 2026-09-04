import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const viteBin = require.resolve("vite/bin/vite.js");
const port = process.env.PORT ?? "4173";

const child = spawn(
  process.execPath,
  [viteBin, "preview", "--host", "0.0.0.0", "--port", String(port)],
  { stdio: "inherit", env: process.env },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
