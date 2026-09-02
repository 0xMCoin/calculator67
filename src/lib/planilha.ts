// Exporta e importa os dados em CSV — abre direto no Excel e no Google Sheets.
// Separador ";" e vírgula decimal, que é o padrão do Excel em português.

import type { TipoDocumento } from "./boleto";
import {
  ESTADO_INICIAL,
  ROTULOS_DIVISAO,
  SOCIO_INICIAL,
  migrarEstado,
  type Conta,
  type Divisao,
  type Estado,
  type ResultadoMes,
} from "./calculo";
import type { AnexoId } from "./simples";

const CABECALHO_CONTAS = "Descrição;Categoria;Valor;Vencimento;Quem paga;Linha digitável";
const CABECALHO_SOCIOS = "Sócio;Faturamento;Pró-labore;Dependentes;Quotas %;IRRF manual";

function n(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

function numero(texto: string): number {
  const limpo = (texto ?? "").replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return 0;
  const valor = limpo.includes(",")
    ? Number(limpo.replace(/\./g, "").replace(",", "."))
    : Number(limpo);
  return Number.isFinite(valor) ? valor : 0;
}

function celula(texto: string): string {
  const limpo = (texto ?? "").replace(/"/g, "'").replace(/[\r\n]+/g, " ");
  return limpo.includes(";") ? `"${limpo}"` : limpo;
}

function separarLinha(linha: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let entreAspas = false;
  for (const c of linha) {
    if (c === '"') entreAspas = !entreAspas;
    else if (c === ";" && !entreAspas) {
      campos.push(atual.trim());
      atual = "";
    } else atual += c;
  }
  campos.push(atual.trim());
  return campos;
}

function dataBR(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return d ? `${d}/${m}/${a}` : "";
}

function dataISO(br: string): string | null {
  const m = br.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(br) ? br : null;
}

/** minúsculas e sem acento, para comparar rótulos vindos da planilha. */
function normaliza(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const DIVISAO_POR_ROTULO = Object.fromEntries(
  (Object.keys(ROTULOS_DIVISAO) as Divisao[]).map((d) => [normaliza(ROTULOS_DIVISAO[d]), d])
) as Record<string, Divisao>;

export function exportarCSV(estado: Estado, r: ResultadoMes): string {
  const linhas: string[] = [];

  linhas.push("CALCULADORA DE CONTAS DA EMPRESA");
  linhas.push(`Competência;${estado.competencia}`);
  linhas.push("");

  linhas.push("CONFIGURAÇÃO");
  linhas.push(`Anexo;${estado.anexo}`);
  linhas.push(`RBT12;${n(estado.rbt12)}`);
  linhas.push(`Folha 12 meses;${n(estado.folha12)}`);
  linhas.push(`Aplicar Fator R;${estado.usarFatorR ? "sim" : "não"}`);
  linhas.push(`Teto do INSS;${n(estado.tetoINSS)}`);
  linhas.push(`Divisão do DAS;${ROTULOS_DIVISAO[estado.divisaoDAS]}`);
  linhas.push(`Divisão do lucro;${ROTULOS_DIVISAO[estado.divisaoLucro]}`);
  linhas.push(`Valor do DAS;${estado.fonteDAS === "boleto" ? "do boleto" : "calculado"}`);
  linhas.push("");

  linhas.push("SÓCIOS");
  linhas.push(CABECALHO_SOCIOS);
  for (const s of estado.socios) {
    linhas.push(
      [
        celula(s.nome),
        n(s.faturamento),
        n(s.proLabore),
        String(s.dependentes),
        n(s.quotas),
        s.irrfManual === null ? "" : n(s.irrfManual),
      ].join(";")
    );
  }
  linhas.push("");

  linhas.push("CONTAS DO MÊS");
  linhas.push(CABECALHO_CONTAS);
  for (const c of estado.contas) {
    linhas.push(
      [
        celula(c.nome),
        c.categoria,
        n(c.valor),
        dataBR(c.vencimento),
        ROTULOS_DIVISAO[c.divisao],
        c.linhaDigitavel ?? "",
      ].join(";")
    );
  }
  linhas.push("");

  linhas.push("RESUMO (calculado — não é lido na importação)");
  linhas.push("Item;Valor");
  linhas.push(`Faturamento total;${n(r.totalFaturamento)}`);
  linhas.push(`DAS;${n(r.dasValor)}`);
  linhas.push(`Outras contas;${n(r.totalOutrasContas)}`);
  linhas.push(`Total a pagar no mês;${n(r.totalGeral)}`);
  linhas.push(`Pró-labore bruto;${n(r.proLaboreBruto)}`);
  linhas.push(`INSS sobre pró-labore;${n(r.totalINSSproLabore)}`);
  linhas.push(`IRRF sobre pró-labore;${n(r.totalIRRF)}`);
  linhas.push(`Lucro distribuível;${n(r.lucroDistribuivel)}`);
  linhas.push("");

  linhas.push("POR SÓCIO");
  linhas.push(
    "Sócio;Faturamento;Participação %;DAS;Outras contas;Total a pagar;Pró-labore bruto;INSS;IRRF;Pró-labore líquido;Lucro;Retirada total"
  );
  for (const s of r.socios) {
    linhas.push(
      [
        celula(s.nome),
        n(s.faturamento),
        n(s.participacao * 100),
        n(s.das),
        n(s.contas),
        n(s.total),
        n(s.proLabore.bruto),
        n(s.proLabore.inss),
        n(s.proLabore.irrfAplicado),
        n(s.proLabore.liquido),
        n(s.lucro),
        n(s.retirada),
      ].join(";")
    );
  }

  if (r.dasBoleto?.composicao?.length) {
    linhas.push("");
    linhas.push("COMPOSIÇÃO DO DAS (da própria guia)");
    linhas.push("Código;Tributo;Valor");
    for (const item of r.dasBoleto.composicao) {
      linhas.push([item.codigo, celula(item.denominacao), n(item.valor)].join(";"));
    }
  }

  return linhas.join("\r\n");
}

export interface ResultadoImportacao {
  estado: Estado;
  contasLidas: number;
  sociosLidos: number;
  avisos: string[];
}

/**
 * Lê o CSV de volta. Aceita tanto o arquivo exportado aqui quanto uma planilha
 * simples que tenha só o cabeçalho das contas.
 */
export function importarCSV(texto: string, atual: Estado): ResultadoImportacao {
  const linhas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const avisos: string[] = [];
  const estado: Estado = migrarEstado({ ...atual });
  const contas: Conta[] = [];
  const socios = [{ ...estado.socios[0] }, { ...estado.socios[1] }];
  let sociosLidos = 0;
  let secao: "contas" | "socios" | "config" | null = null;
  let achouAlgumCabecalho = false;

  for (const linha of linhas) {
    if (!linha.trim()) {
      secao = null;
      continue;
    }
    const campos = separarLinha(linha);
    const primeiro = normaliza(campos[0]);

    if (normaliza(linha).startsWith(normaliza(CABECALHO_CONTAS.split(";")[0]) + ";")) {
      secao = "contas";
      achouAlgumCabecalho = true;
      continue;
    }
    if (primeiro === "socio" && normaliza(campos[1] ?? "").startsWith("faturamento")) {
      secao = "socios";
      achouAlgumCabecalho = true;
      continue;
    }
    if (primeiro === "configuracao") {
      secao = "config";
      continue;
    }

    if (secao === "config") {
      const valor = campos[1] ?? "";
      if (primeiro === "anexo" && /^(I|II|III|IV|V)$/.test(valor)) estado.anexo = valor as AnexoId;
      else if (primeiro === "rbt12") estado.rbt12 = numero(valor);
      else if (primeiro === "folha 12 meses") estado.folha12 = numero(valor);
      else if (primeiro === "aplicar fator r") estado.usarFatorR = normaliza(valor) === "sim";
      else if (primeiro === "teto do inss") estado.tetoINSS = numero(valor) || estado.tetoINSS;
      else if (primeiro === "divisao do das")
        estado.divisaoDAS = DIVISAO_POR_ROTULO[normaliza(valor)] ?? estado.divisaoDAS;
      else if (primeiro === "divisao do lucro")
        estado.divisaoLucro = DIVISAO_POR_ROTULO[normaliza(valor)] ?? estado.divisaoLucro;
      else if (primeiro === "valor do das")
        estado.fonteDAS = normaliza(valor).includes("boleto") ? "boleto" : "calculado";
      continue;
    }

    if (secao === "socios" && sociosLidos < 2) {
      const i = sociosLidos;
      socios[i] = {
        ...SOCIO_INICIAL,
        ...socios[i],
        nome: campos[0] || socios[i].nome,
        faturamento: numero(campos[1] ?? ""),
        proLabore: numero(campos[2] ?? ""),
        dependentes: Math.max(0, Math.round(numero(campos[3] ?? ""))),
        quotas: numero(campos[4] ?? "") || socios[i].quotas,
        irrfManual: (campos[5] ?? "").trim() ? numero(campos[5]) : null,
      };
      sociosLidos++;
      continue;
    }

    if (secao === "contas") {
      const nome = campos[0];
      const valor = numero(campos[2] ?? "");
      if (!nome || valor <= 0) {
        if (nome) avisos.push(`Linha "${nome}" ignorada: valor vazio ou inválido.`);
        continue;
      }
      contas.push({
        id: Math.random().toString(36).slice(2, 10),
        nome,
        categoria: (campos[1] || "Outro") as TipoDocumento,
        valor,
        vencimento: dataISO(campos[3] ?? ""),
        divisao: DIVISAO_POR_ROTULO[normaliza(campos[4] ?? "")] ?? "igual",
        linhaDigitavel: (campos[5] ?? "").replace(/\s/g, "") || null,
        origem: "manual",
      });
    }
  }

  if (!achouAlgumCabecalho) {
    avisos.push(
      `Não achei o cabeçalho "${CABECALHO_CONTAS}" na planilha. Exporte uma vez para ver o formato esperado.`
    );
  }

  estado.socios = [socios[0], socios[1]];
  if (contas.length > 0) estado.contas = contas;
  estado.fonteDAS = contas.some((c) => c.categoria === "DAS") ? estado.fonteDAS : "calculado";

  return { estado, contasLidas: contas.length, sociosLidos, avisos };
}

export function baixarCSV(nomeArquivo: string, conteudo: string) {
  // BOM na frente para o Excel abrir os acentos certo.
  const blob = new Blob([`﻿${conteudo}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export const MODELO_CSV = [
  "CONTAS DO MÊS",
  CABECALHO_CONTAS,
  `Contabilidade;Contabilidade;300,00;10/09/2026;${ROTULOS_DIVISAO.igual};`,
  `Aluguel;Outro;1.200,00;05/09/2026;${ROTULOS_DIVISAO.proporcional};`,
].join("\r\n");

export { ESTADO_INICIAL };
