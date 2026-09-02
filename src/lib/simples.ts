// Tabelas do Simples Nacional (LC 123/2006, anexos vigentes desde 2018)

export type AnexoId = "I" | "II" | "III" | "IV" | "V";
export type Tributo =
  | "IRPJ"
  | "CSLL"
  | "COFINS"
  | "PIS"
  | "CPP"
  | "IPI"
  | "ICMS"
  | "ISS";

export interface Faixa {
  numero: number;
  ate: number;
  aliquota: number; // nominal, em %
  deduzir: number; // parcela a deduzir, em R$
  reparticao: Partial<Record<Tributo, number>>; // % de repartição dentro do DAS
}

export interface Anexo {
  id: AnexoId;
  nome: string;
  descricao: string;
  faixas: Faixa[];
}

const T = Infinity;

export const ANEXOS: Record<AnexoId, Anexo> = {
  I: {
    id: "I",
    nome: "Anexo I — Comércio",
    descricao: "Revenda de mercadorias: lojas, e-commerce, distribuidoras.",
    faixas: [
      { numero: 1, ate: 180_000, aliquota: 4.0, deduzir: 0, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 12.74, PIS: 2.76, CPP: 41.5, ICMS: 34.0 } },
      { numero: 2, ate: 360_000, aliquota: 7.3, deduzir: 5_940, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 12.74, PIS: 2.76, CPP: 41.5, ICMS: 34.0 } },
      { numero: 3, ate: 720_000, aliquota: 9.5, deduzir: 13_860, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 12.74, PIS: 2.76, CPP: 42.0, ICMS: 33.5 } },
      { numero: 4, ate: 1_800_000, aliquota: 10.7, deduzir: 22_500, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 12.74, PIS: 2.76, CPP: 42.0, ICMS: 33.5 } },
      { numero: 5, ate: 3_600_000, aliquota: 14.3, deduzir: 87_300, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 12.74, PIS: 2.76, CPP: 42.0, ICMS: 33.5 } },
      { numero: 6, ate: T, aliquota: 19.0, deduzir: 378_000, reparticao: { IRPJ: 13.5, CSLL: 10.0, COFINS: 28.27, PIS: 6.13, CPP: 42.1 } },
    ],
  },
  II: {
    id: "II",
    nome: "Anexo II — Indústria",
    descricao: "Fábricas e industrialização em geral.",
    faixas: [
      { numero: 1, ate: 180_000, aliquota: 4.5, deduzir: 0, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 11.51, PIS: 2.49, CPP: 37.5, IPI: 7.5, ICMS: 32.0 } },
      { numero: 2, ate: 360_000, aliquota: 7.8, deduzir: 5_940, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 11.51, PIS: 2.49, CPP: 37.5, IPI: 7.5, ICMS: 32.0 } },
      { numero: 3, ate: 720_000, aliquota: 10.0, deduzir: 13_860, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 11.51, PIS: 2.49, CPP: 37.5, IPI: 7.5, ICMS: 32.0 } },
      { numero: 4, ate: 1_800_000, aliquota: 11.2, deduzir: 22_500, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 11.51, PIS: 2.49, CPP: 37.5, IPI: 7.5, ICMS: 32.0 } },
      { numero: 5, ate: 3_600_000, aliquota: 14.7, deduzir: 85_500, reparticao: { IRPJ: 5.5, CSLL: 3.5, COFINS: 11.51, PIS: 2.49, CPP: 37.5, IPI: 7.5, ICMS: 32.0 } },
      { numero: 6, ate: T, aliquota: 30.0, deduzir: 720_000, reparticao: { IRPJ: 8.5, CSLL: 7.5, COFINS: 20.96, PIS: 4.54, CPP: 23.5, IPI: 35.0 } },
    ],
  },
  III: {
    id: "III",
    nome: "Anexo III — Serviços (Fator R ≥ 28%)",
    descricao:
      "Serviços em geral, e também TI/consultoria quando a folha dos últimos 12 meses é de pelo menos 28% do faturamento.",
    faixas: [
      { numero: 1, ate: 180_000, aliquota: 6.0, deduzir: 0, reparticao: { IRPJ: 4.0, CSLL: 3.5, COFINS: 12.82, PIS: 2.78, CPP: 43.4, ISS: 33.5 } },
      { numero: 2, ate: 360_000, aliquota: 11.2, deduzir: 9_360, reparticao: { IRPJ: 4.0, CSLL: 3.5, COFINS: 14.05, PIS: 3.05, CPP: 43.4, ISS: 32.0 } },
      { numero: 3, ate: 720_000, aliquota: 13.5, deduzir: 17_640, reparticao: { IRPJ: 4.0, CSLL: 3.5, COFINS: 13.64, PIS: 2.96, CPP: 43.4, ISS: 32.5 } },
      { numero: 4, ate: 1_800_000, aliquota: 16.0, deduzir: 35_640, reparticao: { IRPJ: 4.0, CSLL: 3.5, COFINS: 13.64, PIS: 2.96, CPP: 43.4, ISS: 32.5 } },
      { numero: 5, ate: 3_600_000, aliquota: 21.0, deduzir: 125_640, reparticao: { IRPJ: 4.0, CSLL: 3.5, COFINS: 12.82, PIS: 2.78, CPP: 43.4, ISS: 33.5 } },
      { numero: 6, ate: T, aliquota: 33.0, deduzir: 648_000, reparticao: { IRPJ: 35.0, CSLL: 15.0, COFINS: 16.03, PIS: 3.47, CPP: 30.5 } },
    ],
  },
  IV: {
    id: "IV",
    nome: "Anexo IV — Serviços (sem CPP no DAS)",
    descricao:
      "Construção civil, limpeza, vigilância, advocacia. O INSS patronal é pago fora do DAS.",
    faixas: [
      { numero: 1, ate: 180_000, aliquota: 4.5, deduzir: 0, reparticao: { IRPJ: 18.8, CSLL: 15.2, COFINS: 17.67, PIS: 3.83, ISS: 44.5 } },
      { numero: 2, ate: 360_000, aliquota: 9.0, deduzir: 8_100, reparticao: { IRPJ: 19.8, CSLL: 15.2, COFINS: 20.55, PIS: 4.45, ISS: 40.0 } },
      { numero: 3, ate: 720_000, aliquota: 10.2, deduzir: 12_420, reparticao: { IRPJ: 20.8, CSLL: 15.2, COFINS: 19.73, PIS: 4.27, ISS: 40.0 } },
      { numero: 4, ate: 1_800_000, aliquota: 14.0, deduzir: 39_780, reparticao: { IRPJ: 17.8, CSLL: 19.2, COFINS: 18.9, PIS: 4.1, ISS: 40.0 } },
      { numero: 5, ate: 3_600_000, aliquota: 22.0, deduzir: 183_780, reparticao: { IRPJ: 18.8, CSLL: 19.2, COFINS: 18.08, PIS: 3.92, ISS: 40.0 } },
      { numero: 6, ate: T, aliquota: 33.0, deduzir: 828_000, reparticao: { IRPJ: 53.5, CSLL: 21.5, COFINS: 20.55, PIS: 4.45 } },
    ],
  },
  V: {
    id: "V",
    nome: "Anexo V — Serviços (Fator R < 28%)",
    descricao:
      "TI, engenharia, publicidade, medicina etc. quando a folha dos últimos 12 meses fica abaixo de 28% do faturamento.",
    faixas: [
      { numero: 1, ate: 180_000, aliquota: 15.5, deduzir: 0, reparticao: { IRPJ: 25.0, CSLL: 15.0, COFINS: 14.1, PIS: 3.05, CPP: 28.85, ISS: 14.0 } },
      { numero: 2, ate: 360_000, aliquota: 18.0, deduzir: 4_500, reparticao: { IRPJ: 23.0, CSLL: 15.0, COFINS: 14.1, PIS: 3.05, CPP: 27.85, ISS: 17.0 } },
      { numero: 3, ate: 720_000, aliquota: 19.5, deduzir: 9_900, reparticao: { IRPJ: 24.0, CSLL: 15.0, COFINS: 14.92, PIS: 3.23, CPP: 23.85, ISS: 19.0 } },
      { numero: 4, ate: 1_800_000, aliquota: 20.5, deduzir: 17_100, reparticao: { IRPJ: 21.0, CSLL: 15.0, COFINS: 15.74, PIS: 3.41, CPP: 23.85, ISS: 21.0 } },
      { numero: 5, ate: 3_600_000, aliquota: 23.0, deduzir: 62_100, reparticao: { IRPJ: 23.0, CSLL: 12.5, COFINS: 14.1, PIS: 3.05, CPP: 23.85, ISS: 23.5 } },
      { numero: 6, ate: T, aliquota: 30.5, deduzir: 540_000, reparticao: { IRPJ: 35.0, CSLL: 15.5, COFINS: 16.44, PIS: 3.56, CPP: 29.5 } },
    ],
  },
};

export const SUBLIMITE_ICMS_ISS = 3_600_000;
export const LIMITE_SIMPLES = 4_800_000;

export interface EntradaDAS {
  receitaMes: number;
  rbt12: number; // receita bruta dos 12 meses anteriores
  anexo: AnexoId;
  usarFatorR: boolean;
  folha12: number; // folha (com pró-labore e encargos) dos 12 meses anteriores
}

export interface ResultadoDAS {
  anexoAplicado: AnexoId;
  fatorR: number | null;
  faixa: Faixa;
  rbt12Base: number;
  rbt12Estimado: boolean;
  aliquotaNominal: number;
  aliquotaEfetiva: number; // em %
  das: number;
  tributos: { nome: Tributo; percentual: number; valor: number }[];
  avisos: string[];
}

export function calcularFatorR(folha12: number, rbt12: number): number | null {
  if (rbt12 <= 0) return null;
  return (folha12 / rbt12) * 100;
}

export function calcularDAS(e: EntradaDAS): ResultadoDAS {
  const avisos: string[] = [];

  // Empresa nova / sem histórico: estima o RBT12 anualizando a receita do mês.
  const rbt12Estimado = e.rbt12 <= 0;
  const rbt12Base = rbt12Estimado ? e.receitaMes * 12 : e.rbt12;
  if (rbt12Estimado && e.receitaMes > 0) {
    avisos.push(
      "Sem RBT12 informado: a alíquota foi estimada anualizando a receita do mês (aproximação da regra de início de atividade)."
    );
  }

  const fatorR = e.usarFatorR ? calcularFatorR(e.folha12, rbt12Base) : null;
  let anexoAplicado = e.anexo;
  if (e.usarFatorR && (e.anexo === "III" || e.anexo === "V")) {
    anexoAplicado = fatorR !== null && fatorR >= 28 ? "III" : "V";
  }

  const anexo = ANEXOS[anexoAplicado];
  const faixa =
    anexo.faixas.find((f) => rbt12Base <= f.ate) ?? anexo.faixas[anexo.faixas.length - 1];

  const aliquotaEfetiva =
    rbt12Base > 0
      ? ((rbt12Base * (faixa.aliquota / 100) - faixa.deduzir) / rbt12Base) * 100
      : faixa.aliquota;

  const das = Math.max(0, e.receitaMes * (aliquotaEfetiva / 100));

  const tributos = (Object.entries(faixa.reparticao) as [Tributo, number][])
    .map(([nome, percentual]) => ({
      nome,
      percentual,
      valor: das * (percentual / 100),
    }))
    .sort((a, b) => b.valor - a.valor);

  if (rbt12Base > SUBLIMITE_ICMS_ISS) {
    avisos.push(
      "RBT12 acima de R$ 3.600.000: ICMS e ISS passam a ser recolhidos fora do DAS (sublimite estadual)."
    );
  }
  if (rbt12Base > LIMITE_SIMPLES) {
    avisos.push("RBT12 acima de R$ 4.800.000: a empresa ultrapassou o limite do Simples Nacional.");
  }
  if (e.usarFatorR && fatorR !== null && fatorR >= 24 && fatorR < 28) {
    avisos.push(
      `Fator R em ${fatorR.toFixed(1)}% — perto dos 28%. Um aumento de pró-labore levaria a empresa para o Anexo III, com alíquota bem menor.`
    );
  }

  return {
    anexoAplicado,
    fatorR,
    faixa,
    rbt12Base,
    rbt12Estimado,
    aliquotaNominal: faixa.aliquota,
    aliquotaEfetiva,
    das,
    tributos,
    avisos,
  };
}

// INSS sobre pró-labore: 11% até o teto do salário de contribuição.
export function inssProLabore(proLabore: number, teto: number): number {
  return Math.min(Math.max(proLabore, 0), teto) * 0.11;
}
