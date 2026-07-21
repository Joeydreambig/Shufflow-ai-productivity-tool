import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const project = resolve(import.meta.dirname, "..");
const output = join(project, ".output");
const dist = join(project, "dist");
const server = join(dist, "server");
const publicDir = join(output, "public");

await rm(dist, { recursive: true, force: true });
await mkdir(server, { recursive: true });
await cp(join(output, "server"), server, { recursive: true });

const assets = {};
for (const file of await walk(publicDir)) {
  const pathname = `/${relative(publicDir, file).split(sep).join("/")}`;
  assets[pathname] = [contentType(file), (await readFile(file)).toString("base64")];
}

await writeFile(
  join(server, "site-assets.mjs"),
  `export const assets = ${JSON.stringify(assets)};\n`,
);
await writeFile(
  join(server, "index.js"),
  `import worker from "./index.mjs";
import { assets } from "./site-assets.mjs";

export default {
  ...worker,
  async fetch(request, env, context) {
    const pathname = new URL(request.url).pathname;
    const asset = assets[pathname];
    if (asset) {
      const bytes = Uint8Array.from(atob(asset[1]), (character) => character.charCodeAt(0));
      return new Response(bytes, {
        headers: {
          "content-type": asset[0],
          "cache-control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=300",
        },
      });
    }
    return worker.fetch(request, env, context);
  },
};
`,
);

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

function contentType(file) {
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".ico": "image/x-icon",
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    }[extname(file).toLowerCase()] ?? "application/octet-stream"
  );
}
