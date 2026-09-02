import type { ItemComposicao, TipoDocumento } from "./boleto";
import { calcularDAS, inssProLabore, type AnexoId, type ResultadoDAS } from "./simples";

export type Divisao = "proporcional" | "igual" | "socio1" | "socio2";

export interface Socio {
  nome: string;
  faturamento: number;
  proLabore: number;
}

export interface Conta {
  id: string;
  nome: string;
  categoria: TipoDocumento;
  valor: number;
  vencimento: string | null;
  divisao: Divisao;
  linhaDigitavel: string | null;
  origem: "manual" | "pdf";
  arquivo?: string;
  competencia?: string | null;
  beneficiario?: string | null;
  composicao?: ItemComposicao[];
  avisos?: string[];
}

export interface Estado {
  competencia: string; // yyyy-mm
  socios: [Socio, Socio];
  anexo: AnexoId;
  usarFatorR: boolean;
  rbt12: number;
  folha12: number;
  divisaoDAS: Divisao;
  fonteDAS: "calculado" | "boleto";
  cobrarINSS: boolean;
  tetoINSS: number;
  contas: Conta[];
}

export const ESTADO_INICIAL: Estado = {
  competencia: new Date().toISOString().slice(0, 7),
  socios: [
    { nome: "Sócio 1", faturamento: 0, proLabore: 0 },
    { nome: "Sócio 2", faturamento: 0, proLabore: 0 },
  ],
  anexo: "III",
  usarFatorR: true,
  rbt12: 0,
  folha12: 0,
  divisaoDAS: "proporcional",
  fonteDAS: "calculado",
  cobrarINSS: false,
  tetoINSS: 8157.41,
  contas: [],
};

export const ROTULOS_DIVISAO: Record<Divisao, string> = {
  proporcional: "Proporcional ao faturamento",
  igual: "Meio a meio (50/50)",
  socio1: "Só o sócio 1",
  socio2: "Só o sócio 2",
};

/** Quanto do valor cabe ao sócio de índice `i`. */
export function parcela(
  valor: number,
  divisao: Divisao,
  i: 0 | 1,
  participacao: [number, number]
): number {
  switch (divisao) {
    case "igual":
      return valor / 2;
    case "socio1":
      return i === 0 ? valor : 0;
    case "socio2":
      return i === 1 ? valor : 0;
    default:
      return valor * participacao[i];
  }
}

export interface ItemSocio {
  rotulo: string;
  valor: number;
  detalhe?: string;
}

export interface ResumoSocio {
  nome: string;
  faturamento: number;
  participacao: number;
  itens: ItemSocio[];
  das: number;
  contas: number;
  inss: number;
  total: number;
  liquido: number;
}

export interface ResultadoMes {
  totalFaturamento: number;
  participacao: [number, number];
  das: ResultadoDAS;
  dasBoleto: Conta | null;
  dasValor: number;
  outrasContas: Conta[];
  totalOutrasContas: number;
  totalINSS: number;
  totalGeral: number;
  cargaSobreFaturamento: number; // % do faturamento que vai embora
  socios: [ResumoSocio, ResumoSocio];
  proximosVencimentos: Conta[];
  avisos: string[];
}

/** Guias que já são o INSS do pró-labore (DARF de CP / GPS de contribuinte individual). */
function pareceINSSdeProLabore(conta: Conta): boolean {
  return (
    conta.categoria === "GPS/INSS" ||
    (conta.composicao ?? []).some((i) =>
      /contrib(\.|uinte)? individual|segurado/i.test(i.denominacao)
    )
  );
}

export function calcularMes(estado: Estado): ResultadoMes {
  const totalFaturamento = estado.socios.reduce((s, x) => s + x.faturamento, 0);
  const participacao: [number, number] =
    totalFaturamento > 0
      ? [
          estado.socios[0].faturamento / totalFaturamento,
          estado.socios[1].faturamento / totalFaturamento,
        ]
      : [0.5, 0.5];

  const das = calcularDAS({
    receitaMes: totalFaturamento,
    rbt12: estado.rbt12,
    anexo: estado.anexo,
    usarFatorR: estado.usarFatorR,
    folha12: estado.folha12,
  });

  const dasBoleto =
    estado.contas.find((c) => c.categoria === "DAS" && c.valor > 0) ?? null;
  const dasValor =
    estado.fonteDAS === "boleto" && dasBoleto ? dasBoleto.valor : das.das;

  const outrasContas = estado.contas.filter((c) => c.categoria !== "DAS");
  const totalOutrasContas = outrasContas.reduce((s, c) => s + c.valor, 0);

  const socios = estado.socios.map((socio, indice) => {
    const i = indice as 0 | 1;
    const itens: ItemSocio[] = [];

    const parteDAS = parcela(dasValor, estado.divisaoDAS, i, participacao);
    itens.push({
      rotulo: "DAS — Simples Nacional",
      valor: parteDAS,
      detalhe:
        estado.divisaoDAS === "proporcional"
          ? `${(participacao[i] * 100).toFixed(1)}% do total`
          : ROTULOS_DIVISAO[estado.divisaoDAS],
    });

    let parteContas = 0;
    for (const conta of outrasContas) {
      const v = parcela(conta.valor, conta.divisao, i, participacao);
      parteContas += v;
      if (v > 0) {
        itens.push({
          rotulo: conta.nome,
          valor: v,
          detalhe:
            conta.divisao === "proporcional"
              ? `${(participacao[i] * 100).toFixed(1)}% de ${conta.valor.toLocaleString(
                  "pt-BR",
                  { style: "currency", currency: "BRL" }
                )}`
              : ROTULOS_DIVISAO[conta.divisao],
        });
      }
    }

    const inss = estado.cobrarINSS
      ? inssProLabore(socio.proLabore, estado.tetoINSS)
      : 0;
    if (inss > 0) {
      itens.push({
        rotulo: "INSS sobre pró-labore (11%)",
        valor: inss,
        detalhe: "desconto individual",
      });
    }

    const total = parteDAS + parteContas + inss;

    return {
      nome: socio.nome,
      faturamento: socio.faturamento,
      participacao: participacao[i],
      itens,
      das: parteDAS,
      contas: parteContas,
      inss,
      total,
      liquido: socio.faturamento - total,
    } satisfies ResumoSocio;
  }) as [ResumoSocio, ResumoSocio];

  const totalINSS = socios[0].inss + socios[1].inss;
  const totalGeral = dasValor + totalOutrasContas + totalINSS;

  const proximosVencimentos = [...estado.contas]
    .filter((c) => c.vencimento)
    .sort((a, b) => (a.vencimento! < b.vencimento! ? -1 : 1));

  const avisos: string[] = [];
  const guiasINSS = outrasContas.filter(pareceINSSdeProLabore);
  if (estado.cobrarINSS && totalINSS > 0 && guiasINSS.length > 0) {
    avisos.push(
      `Você marcou para descontar os 11% de INSS e também cadastrou ${guiasINSS
        .map((c) => c.nome)
        .join(", ")} — que já é essa mesma contribuição. Do jeito que está, o INSS entra duas vezes no total.`
    );
  }
  const duplicadas = outrasContas.filter((c, i) =>
    outrasContas.some(
      (o, j) => j < i && o.valor === c.valor && o.linhaDigitavel && o.linhaDigitavel === c.linhaDigitavel
    )
  );
  if (duplicadas.length > 0) {
    avisos.push(
      `Tem conta repetida: ${duplicadas.map((c) => c.nome).join(", ")} está com a mesma linha digitável de outra já cadastrada.`
    );
  }

  return {
    totalFaturamento,
    participacao,
    das,
    dasBoleto,
    dasValor,
    outrasContas,
    totalOutrasContas,
    totalINSS,
    totalGeral,
    cargaSobreFaturamento:
      totalFaturamento > 0 ? (totalGeral / totalFaturamento) * 100 : 0,
    socios,
    proximosVencimentos,
    avisos,
  };
}
