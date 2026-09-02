import type { ItemComposicao, TipoDocumento } from "./boleto";
import { calcularIRRF, type ResultadoIRRF } from "./irrf";
import { calcularDAS, inssProLabore, type AnexoId, type ResultadoDAS } from "./simples";

export type Divisao = "proporcional" | "igual" | "quotas" | "socio1" | "socio2";

export interface Socio {
  nome: string;
  faturamento: number;
  proLabore: number;
  dependentes: number;
  quotas: number; // participação no capital social, em %
  irrfManual: number | null; // sobrepõe a estimativa quando você tem o valor da folha
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
  divisaoLucro: Divisao;
  fonteDAS: "calculado" | "boleto";
  tetoINSS: number;
  contas: Conta[];
}

export const SOCIO_INICIAL: Socio = {
  nome: "",
  faturamento: 0,
  proLabore: 0,
  dependentes: 0,
  quotas: 50,
  irrfManual: null,
};

export const ESTADO_INICIAL: Estado = {
  competencia: new Date().toISOString().slice(0, 7),
  socios: [
    { ...SOCIO_INICIAL, nome: "Sócio 1" },
    { ...SOCIO_INICIAL, nome: "Sócio 2" },
  ],
  anexo: "III",
  usarFatorR: true,
  rbt12: 0,
  folha12: 0,
  divisaoDAS: "proporcional",
  divisaoLucro: "proporcional",
  fonteDAS: "calculado",
  tetoINSS: 8157.41,
  contas: [],
};

/** Completa campos que não existiam em versões anteriores dos dados salvos. */
export function migrarEstado(estado: Estado): Estado {
  return {
    ...ESTADO_INICIAL,
    ...estado,
    socios: [
      { ...SOCIO_INICIAL, ...(estado.socios?.[0] ?? {}) },
      { ...SOCIO_INICIAL, ...(estado.socios?.[1] ?? {}) },
    ],
    contas: estado.contas ?? [],
  };
}

export const ROTULOS_DIVISAO: Record<Divisao, string> = {
  proporcional: "Proporcional ao faturamento",
  igual: "Meio a meio (50/50)",
  quotas: "Pelas quotas do contrato social",
  socio1: "Só o sócio 1",
  socio2: "Só o sócio 2",
};

export interface Pesos {
  proporcional: [number, number];
  quotas: [number, number];
}

/** Quanto do valor cabe ao sócio de índice `i`. */
export function parcela(valor: number, divisao: Divisao, i: 0 | 1, pesos: Pesos): number {
  switch (divisao) {
    case "igual":
      return valor / 2;
    case "quotas":
      return valor * pesos.quotas[i];
    case "socio1":
      return i === 0 ? valor : 0;
    case "socio2":
      return i === 1 ? valor : 0;
    default:
      return valor * pesos.proporcional[i];
  }
}

function normalizar(a: number, b: number): [number, number] {
  const total = a + b;
  return total > 0 ? [a / total, b / total] : [0.5, 0.5];
}

export interface ItemSocio {
  rotulo: string;
  valor: number;
  detalhe?: string;
}

export interface ProLaboreSocio {
  bruto: number;
  inss: number;
  irrf: ResultadoIRRF;
  irrfAplicado: number;
  liquido: number;
}

export interface ResumoSocio {
  nome: string;
  faturamento: number;
  participacao: number;
  quotas: number;
  itens: ItemSocio[];
  das: number;
  contas: number;
  total: number; // o que sai do bolso da empresa e é atribuído a ele
  proLabore: ProLaboreSocio;
  lucro: number;
  retirada: number; // pró-labore líquido + lucro distribuído
}

export interface ResultadoMes {
  totalFaturamento: number;
  pesos: Pesos;
  das: ResultadoDAS;
  dasBoleto: Conta | null;
  dasValor: number;
  outrasContas: Conta[];
  totalOutrasContas: number;
  totalGeral: number; // tudo que precisa ser pago no mês
  cargaSobreFaturamento: number;
  proLaboreBruto: number;
  totalINSSproLabore: number;
  totalIRRF: number;
  despesasDoLucro: number;
  lucroDistribuivel: number;
  margem: number; // lucro / faturamento, em %
  socios: [ResumoSocio, ResumoSocio];
  proximosVencimentos: Conta[];
  avisos: string[];
}

/** Guias que já são o INSS do pró-labore (DARF de CP / GPS de contribuinte individual). */
export function pareceINSSdeProLabore(conta: Conta): boolean {
  return (
    conta.categoria === "GPS/INSS" ||
    (conta.composicao ?? []).some((i) =>
      /contrib(\.|uinte)? individual|segurado/i.test(i.denominacao)
    )
  );
}

export function calcularMes(estado: Estado): ResultadoMes {
  const totalFaturamento = estado.socios.reduce((s, x) => s + x.faturamento, 0);
  const pesos: Pesos = {
    proporcional: normalizar(estado.socios[0].faturamento, estado.socios[1].faturamento),
    quotas: normalizar(estado.socios[0].quotas, estado.socios[1].quotas),
  };

  const das = calcularDAS({
    receitaMes: totalFaturamento,
    rbt12: estado.rbt12,
    anexo: estado.anexo,
    usarFatorR: estado.usarFatorR,
    folha12: estado.folha12,
  });

  const dasBoleto = estado.contas.find((c) => c.categoria === "DAS" && c.valor > 0) ?? null;
  const dasValor = estado.fonteDAS === "boleto" && dasBoleto ? dasBoleto.valor : das.das;

  const outrasContas = estado.contas.filter((c) => c.categoria !== "DAS");
  const totalOutrasContas = outrasContas.reduce((s, c) => s + c.valor, 0);

  // --- Pró-labore de cada sócio ---
  const proLabores = estado.socios.map((socio) => {
    const bruto = Math.max(0, socio.proLabore);
    const inss = inssProLabore(bruto, estado.tetoINSS);
    const irrf = calcularIRRF(bruto, inss, socio.dependentes);
    const irrfAplicado = socio.irrfManual ?? irrf.irrf;
    return {
      bruto,
      inss,
      irrf,
      irrfAplicado,
      liquido: bruto - inss - irrfAplicado,
    } satisfies ProLaboreSocio;
  }) as [ProLaboreSocio, ProLaboreSocio];

  const proLaboreBruto = proLabores[0].bruto + proLabores[1].bruto;
  const totalINSSproLabore = proLabores[0].inss + proLabores[1].inss;
  const totalIRRF = proLabores[0].irrfAplicado + proLabores[1].irrfAplicado;

  // --- Lucro distribuível ---
  // O pró-labore bruto já inclui o INSS retido, então a guia desse INSS não pode
  // ser descontada de novo quando o pró-labore está sendo contado.
  const guiasINSSproLabore = outrasContas.filter(pareceINSSdeProLabore);
  const totalGuiasINSS = guiasINSSproLabore.reduce((s, c) => s + c.valor, 0);
  const despesasDoLucro =
    dasValor + totalOutrasContas - (proLaboreBruto > 0 ? totalGuiasINSS : 0) + proLaboreBruto;
  const lucroDistribuivel = totalFaturamento - despesasDoLucro;

  const totalGeral = dasValor + totalOutrasContas;

  const socios = estado.socios.map((socio, indice) => {
    const i = indice as 0 | 1;
    const itens: ItemSocio[] = [];

    const parteDAS = parcela(dasValor, estado.divisaoDAS, i, pesos);
    itens.push({
      rotulo: "DAS — Simples Nacional",
      valor: parteDAS,
      detalhe:
        estado.divisaoDAS === "proporcional"
          ? `${(pesos.proporcional[i] * 100).toFixed(1)}% do total`
          : ROTULOS_DIVISAO[estado.divisaoDAS],
    });

    let parteContas = 0;
    for (const conta of outrasContas) {
      const v = parcela(conta.valor, conta.divisao, i, pesos);
      parteContas += v;
      if (v > 0) {
        itens.push({
          rotulo: conta.nome,
          valor: v,
          detalhe:
            conta.divisao === "proporcional"
              ? `${(pesos.proporcional[i] * 100).toFixed(1)}% de ${conta.valor.toLocaleString(
                  "pt-BR",
                  { style: "currency", currency: "BRL" }
                )}`
              : ROTULOS_DIVISAO[conta.divisao],
        });
      }
    }

    const lucro = parcela(Math.max(0, lucroDistribuivel), estado.divisaoLucro, i, pesos);

    return {
      nome: socio.nome,
      faturamento: socio.faturamento,
      participacao: pesos.proporcional[i],
      quotas: socio.quotas,
      itens,
      das: parteDAS,
      contas: parteContas,
      total: parteDAS + parteContas,
      proLabore: proLabores[i],
      lucro,
      retirada: proLabores[i].liquido + lucro,
    } satisfies ResumoSocio;
  }) as [ResumoSocio, ResumoSocio];

  const proximosVencimentos = [...estado.contas]
    .filter((c) => c.vencimento)
    .sort((a, b) => (a.vencimento! < b.vencimento! ? -1 : 1));

  const avisos: string[] = [];
  // O DAS que vence neste mês é sobre o faturamento do mês anterior.
  if (dasBoleto?.competencia && estado.competencia) {
    const [ano, mes] = estado.competencia.split("-");
    if (dasBoleto.competencia !== `${mes}/${ano}`) {
      avisos.push(
        `O DAS é da competência ${dasBoleto.competencia}, mas você está lançando o faturamento de ${mes}/${ano}. O valor do DAS é sobre o que foi faturado em ${dasBoleto.competencia} — se a divisão entre vocês mudou de um mês para o outro, rateie esse DAS pela participação daquele mês.`
      );
    }
  }
  if (lucroDistribuivel < 0) {
    avisos.push(
      "As despesas e o pró-labore passaram do faturamento do mês: não há lucro para distribuir."
    );
  }
  if (proLaboreBruto > 0 && guiasINSSproLabore.length > 0) {
    avisos.push(
      `${guiasINSSproLabore
        .map((c) => c.nome)
        .join(", ")} é o INSS do próprio pró-labore — continua na lista de contas a pagar, mas não desconto de novo do lucro.`
    );
  }
  if (proLaboreBruto > 0 && guiasINSSproLabore.length === 0) {
    avisos.push(
      `O pró-labore gera INSS de ${totalINSSproLabore.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} por mês, mas não vi nenhuma guia dele nas contas. Confira se falta cadastrar.`
    );
  }
  const duplicadas = outrasContas.filter((c, i) =>
    outrasContas.some(
      (o, j) =>
        j < i && o.valor === c.valor && o.linhaDigitavel && o.linhaDigitavel === c.linhaDigitavel
    )
  );
  if (duplicadas.length > 0) {
    avisos.push(
      `Tem conta repetida: ${duplicadas.map((c) => c.nome).join(", ")} está com a mesma linha digitável de outra já cadastrada.`
    );
  }

  return {
    totalFaturamento,
    pesos,
    das,
    dasBoleto,
    dasValor,
    outrasContas,
    totalOutrasContas,
    totalGeral,
    cargaSobreFaturamento: totalFaturamento > 0 ? (totalGeral / totalFaturamento) * 100 : 0,
    proLaboreBruto,
    totalINSSproLabore,
    totalIRRF,
    despesasDoLucro,
    lucroDistribuivel,
    margem: totalFaturamento > 0 ? (lucroDistribuivel / totalFaturamento) * 100 : 0,
    socios,
    proximosVencimentos,
    avisos,
  };
}
