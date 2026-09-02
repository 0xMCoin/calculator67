// Confere o mês real da empresa contra o resumo que o app gerou.
import { calcularMes, ESTADO_INICIAL, type Estado } from "../src/lib/calculo.ts";
import { moeda, pct } from "../src/lib/format.ts";

const proLaboreTotal = 3242; // deduzido do DARF: 356,62 / 11%

function montar(proLabore: [number, number]): Estado {
  return {
    ...ESTADO_INICIAL,
    competencia: "2026-09",
    anexo: "III",
    usarFatorR: false,
    rbt12: 150_000,
    fonteDAS: "boleto",
    divisaoLucro: "proporcional",
    socios: [
      { ...ESTADO_INICIAL.socios[0], nome: "Murillo", faturamento: 13_960.15, proLabore: proLabore[0], quotas: 50 },
      { ...ESTADO_INICIAL.socios[1], nome: "Kauanzito", faturamento: 12_254.7, proLabore: proLabore[1], quotas: 50 },
    ],
    contas: [
      { id: "1", nome: "DAS", categoria: "DAS", valor: 1_338.84, vencimento: "2026-09-21", divisao: "proporcional", linhaDigitavel: null, origem: "manual" },
      { id: "2", nome: "DARF CP (INSS pró-labore)", categoria: "GPS/INSS", valor: 356.62, vencimento: "2026-09-18", divisao: "igual", linhaDigitavel: null, origem: "manual" },
      { id: "3", nome: "Contabilidade", categoria: "Contabilidade", valor: 300, vencimento: "2026-09-10", divisao: "igual", linhaDigitavel: null, origem: "manual" },
      { id: "4", nome: "Claude", categoria: "Outro", valor: 569.25, vencimento: null, divisao: "proporcional", linhaDigitavel: null, origem: "manual" },
      { id: "5", nome: "Contrato Leon", categoria: "Outro", valor: 1_000, vencimento: null, divisao: "socio1", linhaDigitavel: null, origem: "manual" },
    ],
  };
}

// --- 1. Confere a aritmética do resumo que você colou (sem pró-labore) ---
const semProLabore = calcularMes(montar([0, 0]));
const esperado = {
  total: 3_564.71,
  murilloPaga: 2_344.42,
  kauanPaga: 1_220.29,
  murilloSobra: 11_615.73,
  kauanSobra: 11_034.41,
};
const conferir = (nome: string, real: number, alvo: number) => {
  const ok = Math.abs(real - alvo) < 0.01;
  console.log(`${ok ? "ok  " : "DIVERGE"} ${nome}: ${moeda(real)}${ok ? "" : ` (resumo dizia ${moeda(alvo)})`}`);
};
console.log("=== 1. Aritmética do resumo que você mandou ===");
conferir("Total a pagar no mês", semProLabore.totalGeral, esperado.total);
conferir("Murillo paga", semProLabore.socios[0].total, esperado.murilloPaga);
conferir("Kauanzito paga", semProLabore.socios[1].total, esperado.kauanPaga);
conferir("Murillo sobra", semProLabore.socios[0].faturamento - semProLabore.socios[0].total, esperado.murilloSobra);
conferir("Kauanzito sobra", semProLabore.socios[1].faturamento - semProLabore.socios[1].total, esperado.kauanSobra);
console.log(
  `participação: Murillo ${pct(semProLabore.pesos.proporcional[0] * 100, 1)} / Kauanzito ${pct(semProLabore.pesos.proporcional[1] * 100, 1)}`
);

// --- 2. O DAS é sobre AGOSTO, não sobre setembro ---
console.log("\n=== 2. De qual faturamento é esse DAS ===");
const receitaAgosto = 1_338.84 / 0.06; // Anexo III, 1ª faixa: 6% cravado
console.log(`DAS de ${moeda(1338.84)} ÷ 6% (Anexo III, 1ª faixa) = ${moeda(receitaAgosto)} faturados em agosto`);
console.log(`Faturamento de setembro: ${moeda(26_214.85)} → o DAS de outubro será ${moeda(26_214.85 * 0.06)}`);

// --- 3. Com o pró-labore entrando ---
console.log("\n=== 3. Com pró-labore de R$ 3.242 (INSS de R$ 356,62 bate com o DARF) ===");
for (const [rotulo, divisao] of [
  ["todo do Murillo", [proLaboreTotal, 0]],
  ["metade para cada", [proLaboreTotal / 2, proLaboreTotal / 2]],
] as [string, [number, number]][]) {
  const m = calcularMes(montar(divisao));
  console.log(`\n-- pró-labore ${rotulo} --`);
  console.log(`INSS calculado: ${moeda(m.totalINSSproLabore)} | IRRF: ${moeda(m.totalIRRF)}`);
  console.log(`Lucro distribuível: ${moeda(m.lucroDistribuivel)} (margem ${pct(m.margem, 1)})`);
  for (const s of m.socios) {
    console.log(
      `  ${s.nome}: paga ${moeda(s.total)} | pró-labore líquido ${moeda(s.proLabore.liquido)} | lucro ${moeda(s.lucro)} | RETIRADA ${moeda(s.retirada)}`
    );
  }
  console.log(`  soma das retiradas: ${moeda(m.socios[0].retirada + m.socios[1].retirada)}`);
}
