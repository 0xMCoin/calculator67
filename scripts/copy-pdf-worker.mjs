// Copia o worker do pdf.js para /public para que ele seja servido pelo próprio app.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const raiz = dirname(require.resolve("pdfjs-dist/package.json"));
const origem = join(raiz, "build", "pdf.worker.min.mjs");
const destino = join(process.cwd(), "public", "pdf.worker.min.mjs");

mkdirSync(dirname(destino), { recursive: true });
copyFileSync(origem, destino);
console.log(`pdf.worker.min.mjs copiado para ${destino}`);
