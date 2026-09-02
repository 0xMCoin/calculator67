// Gera um PDF parecido com um DAS e confere a leitura ponta a ponta com o pdf.js.
import { writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extrairDadosDoTexto, formatarLinhaDigitavel } from "../src/lib/boleto.ts";

function dv10(bloco: string) {
  let soma = 0;
  let peso = 2;
  for (let i = bloco.length - 1; i >= 0; i--) {
    let n = Number(bloco[i]) * peso;
    if (n > 9) n -= 9;
    soma += n;
    peso = peso === 2 ? 1 : 2;
  }
  return (10 - (soma % 10)) % 10;
}

// Guia de arrecadação de órgão governamental (segmento 5), R$ 1.234,56.
const barra = `856${0}${"123456".padStart(11, "0")}${"7".repeat(29)}`;
const linhaDigitavel = [0, 1, 2, 3]
  .map((i) => barra.slice(i * 11, i * 11 + 11) + dv10(barra.slice(i * 11, i * 11 + 11)))
  .join("");

const LINHAS = [
  "Ministerio da Fazenda",
  "Documento de Arrecadacao do Simples Nacional - DAS",
  "",
  "CNPJ Matriz: 12.345.678/0001-95",
  "Razao Social: MINHA EMPRESA LTDA",
  "Periodo de Apuracao: 08/2026",
  "Data de Vencimento: 21/09/2026",
  "Numero do Documento: 07.60.51.234.567.890-1",
  "",
  "Composicao do Documento de Arrecadacao",
  "Principal 1.234,56",
  "Multa 0,00 Juros 0,00",
  "Valor Total do Documento R$ 1.234,56",
  "",
  formatarLinhaDigitavel(linhaDigitavel),
];

const pdf = await PDFDocument.create();
const pagina = pdf.addPage([595, 842]);
const fonte = await pdf.embedFont(StandardFonts.Helvetica);
LINHAS.forEach((linha, i) => {
  pagina.drawText(linha, { x: 40, y: 780 - i * 18, size: 10, font: fonte });
});
const bytes = await pdf.save();
writeFileSync(new URL("../.tmp-das-teste.pdf", import.meta.url), bytes);

// Lê de volta com o mesmo pdf.js que roda no navegador.
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
const conteudo = await (await doc.getPage(1)).getTextContent();
let texto = "";
for (const item of conteudo.items as { str: string; hasEOL?: boolean }[]) {
  texto += item.str + (item.hasEOL ? "\n" : " ");
}

const dados = extrairDadosDoTexto(texto);
console.log(dados);

let falhas = 0;
function checar(nome: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "ok  " : "FALHA"} ${nome} → ${JSON.stringify(real)}`);
}
checar("tipo", dados.tipo, "DAS");
checar("valor", dados.valor, 1234.56);
checar("vencimento", dados.vencimento, "2026-09-21");
checar("competência", dados.competencia, "08/2026");
checar("CNPJ", dados.cnpj, "12.345.678/0001-95");
checar("linha digitável", dados.linhaDigitavel, linhaDigitavel);
checar("segmento", dados.segmento, "Órgãos governamentais");
checar("sem avisos", dados.avisos, []);

console.log(falhas === 0 ? "\nTudo certo." : `\n${falhas} falha(s).`);
process.exit(falhas === 0 ? 0 : 1);
