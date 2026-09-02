// Conferência rápida das rotinas de cálculo e leitura de código de barras.
import {
  acharLinhaDigitavel,
  extrairDadosDoTexto,
  formatarLinhaDigitavel,
  lerLinhaDigitavel,
  validarArrecadacao,
  validarBoletoBancario,
} from "../src/lib/boleto.ts";
import { calcularDAS } from "../src/lib/simples.ts";

let falhas = 0;
function checar(nome: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? "ok  " : "FALHA"} ${nome}${ok ? "" : `\n      esperado ${JSON.stringify(esperado)}\n      recebido ${JSON.stringify(real)}`}`);
}

// --- Boleto bancário (exemplo público do Itaú) ---
const itau = "34191790010104351004791020150008489840000020000";
checar("DVs do boleto bancário", validarBoletoBancario(itau), true);
const b = lerLinhaDigitavel(itau);
checar("valor do boleto bancário", b?.valor, 200.0);
console.log("      vencimento lido:", b?.vencimento, "| banco:", b?.banco);

// --- Guia de arrecadação (DAS): monta uma de R$ 1.234,56 e lê de volta ---
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
const valorCentavos = "123456".padStart(11, "0");
const barra = `856${"0"}${valorCentavos}${"0".repeat(29)}`; // 44 dígitos
const linha48 = [0, 1, 2, 3]
  .map((i) => {
    const bloco = barra.slice(i * 11, i * 11 + 11);
    return bloco + dv10(bloco);
  })
  .join("");
checar("tamanho da linha de arrecadação", linha48.length, 48);
checar("DVs da guia de arrecadação", validarArrecadacao(linha48), true);
checar("valor da guia de arrecadação", lerLinhaDigitavel(linha48)?.valor, 1234.56);

// --- Extração a partir do texto de um PDF de DAS ---
const textoDAS = `
Documento de Arrecadação do Simples Nacional - DAS
Período de Apuração: 08/2026
CNPJ: 12.345.678/0001-95
Razão Social: MINHA EMPRESA LTDA
Vencimento: 20/09/2026
Valor Total do Documento R$ 1.234,56
${formatarLinhaDigitavel(linha48)}
`;
const dados = extrairDadosDoTexto(textoDAS);
checar("tipo do documento", dados.tipo, "DAS");
checar("valor extraído", dados.valor, 1234.56);
checar("vencimento extraído", dados.vencimento, "2026-09-20");
checar("competência extraída", dados.competencia, "08/2026");
checar("CNPJ extraído", dados.cnpj, "12.345.678/0001-95");
checar("achou a linha digitável", acharLinhaDigitavel(textoDAS)?.linhaDigitavel, linha48);

// --- DAS: Anexo III, 4ª faixa ---
const r = calcularDAS({
  receitaMes: 100_000,
  rbt12: 1_000_000,
  anexo: "III",
  usarFatorR: false,
  folha12: 0,
});
checar("faixa do Anexo III", r.faixa.numero, 4);
checar("alíquota efetiva", Number(r.aliquotaEfetiva.toFixed(4)), 12.436);
checar("valor do DAS", Number(r.das.toFixed(2)), 12436.0);
checar(
  "soma da repartição bate com o DAS",
  Number(r.tributos.reduce((s, t) => s + t.valor, 0).toFixed(2)),
  Number(r.das.toFixed(2))
);

// --- Conferência contra uma guia real emitida pela Receita ---
// DAS de 08/2026: Anexo III, 1ª faixa, receita de R$ 22.314,00.
const real = calcularDAS({
  receitaMes: 22_314,
  rbt12: 150_000,
  anexo: "III",
  usarFatorR: false,
  folha12: 0,
});
checar("[guia real] DAS", Number(real.das.toFixed(2)), 1338.84);
const esperado: Record<string, number> = {
  CPP: 581.06,
  ISS: 448.51,
  COFINS: 171.64,
  IRPJ: 53.55,
  CSLL: 46.86,
  PIS: 37.22,
};
for (const t of real.tributos) {
  checar(`[guia real] ${t.nome}`, Number(t.valor.toFixed(2)), esperado[t.nome]);
}
checar(
  "[guia real] DVs do código de barras do DAS",
  validarArrecadacao("858500000134388403282627640720262450517946423977"),
  true
);
checar(
  "[guia real] DVs do código de barras do DARF",
  validarArrecadacao("858400000035566203852626610716262458592508660088"),
  true
);
checar(
  "[guia real] DVs da linha digitável do boleto da contabilidade",
  validarBoletoBancario("00190000090345509700000002419174715650000030000"),
  true
);

// --- Fator R troca o anexo ---
const semFolha = calcularDAS({ receitaMes: 100_000, rbt12: 1_000_000, anexo: "III", usarFatorR: true, folha12: 100_000 });
const comFolha = calcularDAS({ receitaMes: 100_000, rbt12: 1_000_000, anexo: "III", usarFatorR: true, folha12: 300_000 });
checar("Fator R 10% → Anexo V", semFolha.anexoAplicado, "V");
checar("Fator R 30% → Anexo III", comFolha.anexoAplicado, "III");

// --- Pró-labore: INSS, IRRF e líquido ---
import { inssProLabore } from "../src/lib/simples.ts";
import { calcularIRRF, ISENCAO_INTEGRAL } from "../src/lib/irrf.ts";

checar("INSS de 11% sobre R$ 3.242", Number(inssProLabore(3242, 8157.41).toFixed(2)), 356.62);
checar(
  "INSS limitado ao teto",
  Number(inssProLabore(20_000, 8157.41).toFixed(2)),
  Number((8157.41 * 0.11).toFixed(2))
);
checar("IRRF isento até a faixa da reforma", calcularIRRF(ISENCAO_INTEGRAL, 550).irrf, 0);
checar("IRRF de quem ganha pouco", calcularIRRF(3242, 356.62).irrf, 0);
const irrfAlto = calcularIRRF(12_000, 897.32);
checar("IRRF de quem ganha acima da faixa", irrfAlto.irrf > 0, true);
checar(
  "IRRF entra proporcionalmente na transição",
  calcularIRRF(6_175, 679.25).irrf < calcularIRRF(7_400, 814).irrf,
  true
);

// --- Rateio completo: contas, pró-labore e lucro ---
import { calcularMes, ESTADO_INICIAL, type Estado } from "../src/lib/calculo.ts";
import { exportarCSV, importarCSV } from "../src/lib/planilha.ts";

const mes: Estado = {
  ...ESTADO_INICIAL,
  competencia: "2026-08",
  anexo: "III",
  usarFatorR: false,
  rbt12: 150_000,
  fonteDAS: "boleto",
  divisaoLucro: "quotas",
  socios: [
    { ...ESTADO_INICIAL.socios[0], nome: "A", faturamento: 12_000, proLabore: 3_242, quotas: 50 },
    { ...ESTADO_INICIAL.socios[1], nome: "B", faturamento: 10_314, proLabore: 0, quotas: 50 },
  ],
  contas: [
    {
      id: "1", nome: "DAS", categoria: "DAS", valor: 1_338.84, vencimento: "2026-09-21",
      divisao: "proporcional", linhaDigitavel: null, origem: "manual",
    },
    {
      id: "2", nome: "INSS pró-labore", categoria: "GPS/INSS", valor: 356.62,
      vencimento: "2026-09-18", divisao: "socio1", linhaDigitavel: null, origem: "manual",
    },
    {
      id: "3", nome: "Contabilidade", categoria: "Contabilidade", valor: 300,
      vencimento: "2026-09-10", divisao: "igual", linhaDigitavel: null, origem: "manual",
    },
  ],
};

const m = calcularMes(mes);
checar("total a pagar no mês", Number(m.totalGeral.toFixed(2)), 1_995.46);
// 22.314 − 1.338,84 (DAS) − 300 (contabilidade) − 3.242 (pró-labore bruto).
// A guia de INSS não entra de novo: já está dentro do pró-labore bruto.
checar("lucro distribuível", Number(m.lucroDistribuivel.toFixed(2)), 17_433.16);
checar("lucro dividido pelas quotas", Number(m.socios[0].lucro.toFixed(2)), 8_716.58);
checar(
  "retirada do sócio com pró-labore",
  Number(m.socios[0].retirada.toFixed(2)),
  Number((3242 - 356.62 + 8716.58).toFixed(2))
);
checar("retirada do sócio sem pró-labore", Number(m.socios[1].retirada.toFixed(2)), 8_716.58);
checar(
  "a guia de INSS não é descontada duas vezes",
  Number((m.totalFaturamento - m.despesasDoLucro).toFixed(2)),
  Number(m.lucroDistribuivel.toFixed(2))
);

// --- Pró-labore deduzido automaticamente da guia de INSS ---
import { inferirProLabore, extrairComposicao } from "../src/lib/boleto.ts";

const textoDARF = `Documento de Arrecadacao de Receitas Federais
Periodo de Apuracao: 08/2026
Composicao do Documento de Arrecadacao
1099   CP   DESCONTADA SEGURADO - CONTRIB INDIVIDUAL   356,62   356,62
01   CP   SEGURADOS - CONTRIBUINTES INDIVIDUAIS - 11%
Totais   356,62   356,62`;
const composicaoDARF = extrairComposicao(textoDARF);
checar("leu a composição do DARF", composicaoDARF.length, 1);
checar(
  "pró-labore deduzido do INSS da guia",
  Number(inferirProLabore(textoDARF, composicaoDARF)!.toFixed(2)),
  3_242
);
checar(
  "guia sem INSS de sócio não vira pró-labore",
  inferirProLabore("Valor Total 300,00", []),
  null
);

const semDigitar: Estado = {
  ...mes,
  socios: [
    { ...mes.socios[0], proLabore: 0 },
    { ...mes.socios[1], proLabore: 0 },
  ],
  contas: mes.contas.map((c) =>
    c.categoria === "GPS/INSS" ? { ...c, divisao: "socio1", proLaboreInferido: 3_242 } : c
  ),
};
const auto = calcularMes(semDigitar);
checar("pró-labore veio da guia", auto.socios[0].proLabore.origem, "guia");
checar("valor do pró-labore automático", Number(auto.socios[0].proLabore.bruto.toFixed(2)), 3_242);
checar(
  "INSS recalculado bate com a guia",
  Number(auto.socios[0].proLabore.inss.toFixed(2)),
  356.62
);
checar("sócio sem guia fica sem pró-labore", auto.socios[1].proLabore.bruto, 0);
checar(
  "lucro é o mesmo de quando o valor era digitado",
  Number(auto.lucroDistribuivel.toFixed(2)),
  Number(m.lucroDistribuivel.toFixed(2))
);

// --- Planilha: exportar e importar de volta ---
const csv = exportarCSV(mes, m);
const volta = importarCSV(csv, ESTADO_INICIAL);
checar("importou as 3 contas", volta.contasLidas, 3);
checar("importou os 2 sócios", volta.sociosLidos, 2);
checar("sem avisos na importação", volta.avisos, []);
checar("faturamento voltou igual", volta.estado.socios[0].faturamento, 12_000);
checar("pró-labore voltou igual", volta.estado.socios[0].proLabore, 3_242);
checar("anexo voltou igual", volta.estado.anexo, "III");
checar("divisão do lucro voltou igual", volta.estado.divisaoLucro, "quotas");
checar("vencimento voltou igual", volta.estado.contas[0].vencimento, "2026-09-21");
checar("quem paga voltou igual", volta.estado.contas[1].divisao, "socio1");
const mVolta = calcularMes(volta.estado);
checar(
  "o mês recalculado bate com o original",
  Number(mVolta.lucroDistribuivel.toFixed(2)),
  Number(m.lucroDistribuivel.toFixed(2))
);

console.log(falhas === 0 ? "\nTudo certo." : `\n${falhas} falha(s).`);
process.exit(falhas === 0 ? 0 : 1);
