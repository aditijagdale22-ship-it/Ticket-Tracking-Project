import type { Connect, Plugin } from "vite";
import { handleJsonApi } from "./api";

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function attach(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    const url = req.url?.split("?")[0] ?? "";
    if (url !== "/api" && url !== "/api/health") {
      next();
      return;
    }
    const result = await handleJsonApi(req.method ?? "GET", url, await readBody(req));
    res.statusCode = result.status;
    res.setHeader("Content-Type", "application/json");
    res.end(result.body);
  });
}

export function sheetsApiPlugin(): Plugin {
  return {
    name: "sheets-api",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}
