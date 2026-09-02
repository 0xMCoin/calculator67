"use client";

// Extração de texto do PDF direto no navegador — nenhum arquivo é enviado a servidor.
import type { TextItem } from "pdfjs-dist/types/src/display/api";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function carregarPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return lib;
    });
  }
  return pdfjsPromise;
}

export async function extrairTextoDoPdf(arquivo: File): Promise<string> {
  const pdfjs = await carregarPdfjs();
  const buffer = await arquivo.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const paginas: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const conteudo = await pagina.getTextContent();
    let linha = "";
    const linhas: string[] = [];
    for (const item of conteudo.items as TextItem[]) {
      if (!("str" in item)) continue;
      linha += item.str;
      if (item.hasEOL) {
        linhas.push(linha);
        linha = "";
      } else {
        linha += " ";
      }
    }
    if (linha.trim()) linhas.push(linha);
    paginas.push(linhas.join("\n"));
  }
  await doc.destroy();
  return paginas.join("\n");
}
