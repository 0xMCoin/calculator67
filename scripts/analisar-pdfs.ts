// Roda os PDFs reais pelo mesmo caminho do app: pdf.js -> extrairDadosDoTexto.
import { extrairDadosDoTexto } from "../src/lib/boleto.ts";

const arquivos = process.argv.slice(2);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

for (const caminho of arquivos) {
  const { readFileSync } = await import("node:fs");
  const bytes = new Uint8Array(readFileSync(caminho));
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  let texto = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const conteudo = await (await doc.getPage(p)).getTextContent();
    for (const item of conteudo.items as { str: string; hasEOL?: boolean }[]) {
      texto += item.str + (item.hasEOL ? "\n" : " ");
    }
  }
  console.log("\n".padEnd(80, "="));
  console.log(caminho, `| ${doc.numPages} página(s) | ${texto.length} caracteres de texto`);
  console.log("=".repeat(80));
  console.log("--- TEXTO ---");
  console.log(texto.trim());
  console.log("--- DADOS LIDOS PELO APP ---");
  console.log(extrairDadosDoTexto(texto));
}
