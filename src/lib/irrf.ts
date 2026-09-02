// Imposto de renda retido na fonte sobre o pró-labore.
//
// ATENÇÃO: estes números mudam por lei. Se a tabela mudar, é só editar aqui.
// Tabela progressiva mensal vigente desde maio/2025:
export const FAIXAS_IRRF = [
  { ate: 2_428.8, aliquota: 0, deduzir: 0 },
  { ate: 2_826.65, aliquota: 7.5, deduzir: 182.16 },
  { ate: 3_751.05, aliquota: 15, deduzir: 394.16 },
  { ate: 4_664.68, aliquota: 22.5, deduzir: 675.49 },
  { ate: Infinity, aliquota: 27.5, deduzir: 908.73 },
];

/** Desconto simplificado mensal — usado quando é mais vantajoso que as deduções legais. */
export const DESCONTO_SIMPLIFICADO = 607.2;

/** Dedução por dependente. */
export const DEDUCAO_DEPENDENTE = 189.59;

/**
 * Isenção da reforma do IR (Lei 15.270/2025, a partir de 2026): quem recebe até
 * ISENCAO_INTEGRAL por mês não paga nada, e entre ISENCAO_INTEGRAL e REDUCAO_ATE
 * o imposto entra proporcionalmente. A transição aqui é uma aproximação linear —
 * o redutor oficial é apurado na folha, então trate como estimativa.
 */
export const ISENCAO_INTEGRAL = 5_000;
export const REDUCAO_ATE = 7_350;

export interface ResultadoIRRF {
  base: number;
  aliquota: number;
  irrf: number;
  faixaIsenta: boolean;
  usouDescontoSimplificado: boolean;
}

/**
 * @param bruto pró-labore bruto do mês
 * @param inss INSS descontado (dedutível da base)
 * @param dependentes quantidade de dependentes
 */
export function calcularIRRF(bruto: number, inss: number, dependentes = 0): ResultadoIRRF {
  if (bruto <= 0) {
    return { base: 0, aliquota: 0, irrf: 0, faixaIsenta: true, usouDescontoSimplificado: false };
  }

  const baseLegal = Math.max(0, bruto - inss - dependentes * DEDUCAO_DEPENDENTE);
  const baseSimplificada = Math.max(0, bruto - DESCONTO_SIMPLIFICADO);

  const imposto = (base: number) => {
    const faixa = FAIXAS_IRRF.find((f) => base <= f.ate) ?? FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
    return {
      valor: Math.max(0, base * (faixa.aliquota / 100) - faixa.deduzir),
      aliquota: faixa.aliquota,
    };
  };

  const pelaLegal = imposto(baseLegal);
  const pelaSimplificada = imposto(baseSimplificada);
  const usouDescontoSimplificado = pelaSimplificada.valor < pelaLegal.valor;
  const escolhida = usouDescontoSimplificado ? pelaSimplificada : pelaLegal;
  const base = usouDescontoSimplificado ? baseSimplificada : baseLegal;

  // Isenção de quem ganha até R$ 5.000, com entrada proporcional até R$ 7.350.
  let irrf = escolhida.valor;
  if (bruto <= ISENCAO_INTEGRAL) {
    irrf = 0;
  } else if (bruto < REDUCAO_ATE) {
    irrf *= (bruto - ISENCAO_INTEGRAL) / (REDUCAO_ATE - ISENCAO_INTEGRAL);
  }

  return {
    base,
    aliquota: escolhida.aliquota,
    irrf,
    faixaIsenta: irrf === 0,
    usouDescontoSimplificado,
  };
}
