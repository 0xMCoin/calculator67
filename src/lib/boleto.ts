// Leitura de linha digitável / código de barras de boletos bancários (FEBRABAN)
// e de guias de arrecadação (DAS, DARF, GPS, FGTS, contas de concessionária).

export type TipoDocumento =
  | "DAS"
  | "DARF"
  | "GPS/INSS"
  | "FGTS"
  | "ISS"
  | "Contabilidade"
  | "Boleto"
  | "Outro";

export interface DadosBoleto {
  formato: "bancario" | "arrecadacao" | "desconhecido";
  linhaDigitavel: string | null;
  valor: number | null;
  vencimento: string | null; // ISO yyyy-mm-dd
  banco: string | null;
  segmento: string | null;
  tipo: TipoDocumento;
  competencia: string | null; // mm/yyyy
  cnpj: string | null;
  beneficiario: string | null;
  composicao: ItemComposicao[]; // tributos impressos na própria guia
  avisos: string[];
}

const BANCOS: Record<string, string> = {
  "001": "Banco do Brasil",
  "033": "Santander",
  "041": "Banrisul",
  "070": "BRB",
  "077": "Inter",
  "104": "Caixa Econômica",
  "197": "Stone",
  "208": "BTG Pactual",
  "212": "Banco Original",
  "237": "Bradesco",
  "260": "Nubank",
  "290": "PagBank",
  "323": "Mercado Pago",
  "336": "C6 Bank",
  "341": "Itaú",
  "380": "PicPay",
  "422": "Safra",
  "748": "Sicredi",
  "756": "Sicoob",
};

const SEGMENTOS: Record<string, string> = {
  "1": "Prefeituras",
  "2": "Saneamento",
  "3": "Energia elétrica e gás",
  "4": "Telecomunicações",
  "5": "Órgãos governamentais",
  "6": "Carnês e convênios",
  "7": "Multas de trânsito",
  "9": "Uso exclusivo do banco",
};

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

function modulo10(bloco: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = bloco.length - 1; i >= 0; i--) {
    let n = Number(bloco[i]) * peso;
    if (n > 9) n -= 9;
    soma += n;
    peso = peso === 2 ? 1 : 2;
  }
  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

function modulo11Arrecadacao(bloco: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = bloco.length - 1; i >= 0; i--) {
    soma += Number(bloco[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto === 0 || resto === 1 ? 0 : 11 - resto;
}

function modulo11Barra(barra43: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = barra43.length - 1; i >= 0; i--) {
    soma += Number(barra43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  return dv === 0 || dv === 1 || dv > 9 ? 1 : dv;
}

// Fator de vencimento: base 07/10/1997. O ciclo reiniciou em 22/02/2025 (fator 1000),
// então testamos os dois ciclos e ficamos com a data mais próxima de hoje.
function dataPorFator(fator: number): string | null {
  if (fator < 1000) return null;
  const base = Date.UTC(1997, 9, 7);
  const dia = 86_400_000;
  const candidatos = [fator, fator + 9000].map((f) => base + f * dia);
  const hoje = Date.now();
  const escolhido = candidatos.reduce((a, b) =>
    Math.abs(a - hoje) <= Math.abs(b - hoje) ? a : b
  );
  return new Date(escolhido).toISOString().slice(0, 10);
}

export function validarBoletoBancario(linha47: string): boolean {
  if (linha47.length !== 47) return false;
  const c1 = linha47.slice(0, 9);
  const c2 = linha47.slice(10, 20);
  const c3 = linha47.slice(21, 31);
  return (
    modulo10(c1) === Number(linha47[9]) &&
    modulo10(c2) === Number(linha47[20]) &&
    modulo10(c3) === Number(linha47[31])
  );
}

export function validarArrecadacao(linha48: string): boolean {
  if (linha48.length !== 48) return false;
  // Identificação do valor: 6 e 7 usam módulo 10; 8 e 9 usam módulo 11.
  const idValor = linha48[2];
  const usaModulo10 = idValor === "6" || idValor === "7";
  for (let i = 0; i < 4; i++) {
    const bloco = linha48.slice(i * 12, i * 12 + 11);
    const dv = Number(linha48[i * 12 + 11]);
    const calculado = usaModulo10 ? modulo10(bloco) : modulo11Arrecadacao(bloco);
    if (calculado !== dv) return false;
  }
  return true;
}

function lerBancario(linha47: string): Partial<DadosBoleto> {
  const banco = linha47.slice(0, 3);
  const fator = Number(linha47.slice(33, 37));
  const valor = Number(linha47.slice(37, 47)) / 100;
  return {
    formato: "bancario",
    linhaDigitavel: linha47,
    banco: BANCOS[banco] ? `${BANCOS[banco]} (${banco})` : `Banco ${banco}`,
    valor: valor > 0 ? valor : null,
    vencimento: dataPorFator(fator),
  };
}

function lerArrecadacao(linha48: string): Partial<DadosBoleto> {
  const barra =
    linha48.slice(0, 11) + linha48.slice(12, 23) + linha48.slice(24, 35) + linha48.slice(36, 47);
  const segmento = barra[1];
  const valor = Number(barra.slice(4, 15)) / 100;
  return {
    formato: "arrecadacao",
    linhaDigitavel: linha48,
    segmento: SEGMENTOS[segmento] ?? `Segmento ${segmento}`,
    valor: valor > 0 ? valor : null,
    vencimento: null, // não vem no código de barras de arrecadação
  };
}

/** Lê uma linha digitável colada pelo usuário (com ou sem pontuação). */
export function lerLinhaDigitavel(entrada: string): Partial<DadosBoleto> | null {
  const d = apenasDigitos(entrada);
  if (d.length === 47 && validarBoletoBancario(d)) return lerBancario(d);
  if (d.length === 48 && validarArrecadacao(d)) return lerArrecadacao(d);
  // Código de barras cru (44 dígitos)
  if (d.length === 44) {
    if (d[0] === "8") {
      const valor = Number(d.slice(4, 15)) / 100;
      return {
        formato: "arrecadacao",
        linhaDigitavel: d,
        segmento: SEGMENTOS[d[1]] ?? `Segmento ${d[1]}`,
        valor: valor > 0 ? valor : null,
        vencimento: null,
      };
    }
    if (modulo11Barra(d.slice(0, 4) + d.slice(5)) === Number(d[4])) {
      const valor = Number(d.slice(9, 19)) / 100;
      return {
        formato: "bancario",
        linhaDigitavel: d,
        banco: BANCOS[d.slice(0, 3)] ?? `Banco ${d.slice(0, 3)}`,
        valor: valor > 0 ? valor : null,
        vencimento: dataPorFator(Number(d.slice(5, 9))),
      };
    }
  }
  // Sem DV válido: aceita mesmo assim quando o tamanho bate, avisando.
  if (d.length === 47) return { ...lerBancario(d), avisos: ["Dígitos verificadores não conferem."] };
  if (d.length === 48)
    return { ...lerArrecadacao(d), avisos: ["Dígitos verificadores não conferem."] };
  return null;
}

/** Procura uma linha digitável válida dentro do texto extraído do PDF. */
export function acharLinhaDigitavel(texto: string): Partial<DadosBoleto> | null {
  // A linha digitável costuma vir colada a outros números da página, então
  // varremos cada sequência de dígitos com uma janela deslizante.
  const candidatos = texto.match(/\d[\d\s.\-]{40,120}\d/g) ?? [];
  const sequencias = candidatos.map(apenasDigitos);

  // 1ª passada: só aceita quem tem os dígitos verificadores corretos.
  for (const d of sequencias) {
    for (let i = 0; i + 47 <= d.length; i++) {
      if (validarArrecadacao(d.slice(i, i + 48))) return lerArrecadacao(d.slice(i, i + 48));
      if (validarBoletoBancario(d.slice(i, i + 47))) return lerBancario(d.slice(i, i + 47));
    }
  }

  // 2ª passada: aceita pelo formato (produto 8 na arrecadação, moeda 9 no boleto),
  // avisando que os DVs não bateram.
  const aviso = ["Dígitos verificadores não conferem — confira o valor antes de pagar."];
  for (const d of sequencias) {
    for (let i = 0; i + 47 <= d.length; i++) {
      const a = d.slice(i, i + 48);
      if (a.length === 48 && a[0] === "8" && "6789".includes(a[2])) {
        return { ...lerArrecadacao(a), avisos: aviso };
      }
      const b = d.slice(i, i + 47);
      if (b[3] === "9" && Number(b.slice(37, 47)) > 0) {
        return { ...lerBancario(b), avisos: aviso };
      }
    }
  }
  return null;
}

export function classificarDocumento(texto: string): TipoDocumento {
  const t = texto.toLowerCase();
  if (/(\bdas\b|simples nacional|pgdas|documento de arrecada[çc][ãa]o do simples)/.test(t))
    return "DAS";
  if (/\bdarf\b|documento de arrecada[çc][ãa]o de receitas federais/.test(t)) return "DARF";
  if (/\bgps\b|previd[êe]ncia social|guia da previd/.test(t)) return "GPS/INSS";
  if (/\bfgts\b|\bgrf\b|guia de recolhimento do fgts/.test(t)) return "FGTS";
  if (/issqn|imposto sobre servi[çc]os|nota fiscal de servi/.test(t)) return "ISS";
  if (/cont[áa]bil|contabilidade|honor[áa]rios|escrit[óo]rio cont/.test(t)) return "Contabilidade";
  if (/linha digit[áa]vel|benefici[áa]rio|cedente|boleto/.test(t)) return "Boleto";
  return "Outro";
}

function acharData(texto: string): string | null {
  const perto = texto.match(
    /(vencimento|vence em|data de vencimento|pagar at[ée])[^\d]{0,40}(\d{2})\/(\d{2})\/(\d{4})/i
  );
  const alvo = perto ?? texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!alvo) return null;
  const [dia, mes, ano] = perto
    ? [alvo[2], alvo[3], alvo[4]]
    : [alvo[1], alvo[2], alvo[3]];
  return `${ano}-${mes}-${dia}`;
}

function acharValor(texto: string): number | null {
  const m =
    texto.match(
      /(valor total do documento|valor do documento|valor total|valor a pagar|total a recolher|total geral|\(=\)\s*valor)[^\d]{0,40}(\d{1,3}(?:\.\d{3})*,\d{2})/i
    ) ?? texto.match(/r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i);
  if (!m) return null;
  const bruto = m[m.length - 1];
  const n = Number(bruto.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const MESES: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  março: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
};

function acharCompetencia(texto: string): string | null {
  // "Competência: 08/2026", "PA: 08/2026", "Período de Apuração 08/2026"
  const rotulado = texto.match(
    /(compet[êe]ncia|per[íi]odo de apura[çc][ãa]o|\bPA)[:\s]{0,20}(0[1-9]|1[0-2])\/(\d{4})/i
  );
  if (rotulado) return `${rotulado[2]}/${rotulado[3]}`;

  // "agosto/2026", "REF. AGOSTO 2026"
  const porExtenso = texto.match(
    /\b(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[\s/]+(\d{4})\b/i
  );
  if (porExtenso) return `${MESES[porExtenso[1].toLowerCase()]}/${porExtenso[2]}`;

  return null;
}

const NOME_DE_EMPRESA =
  /\b(LTDA|EIRELI|EPP|MEI|S\/A|S\.A|SOCIEDADE|ASSOCIA|CONTABILIDADE|CONTABIL|SERVI[CÇ]OS|COM[EÉ]RCIO|IND[UÚ]STRIA|SOLU[CÇ][OÕ]ES|TECNOLOGIA|ADVOCACIA|ESCRIT[OÓ]RIO)\b/i;

/** Razões sociais que aparecem no documento, na ordem em que aparecem. */
function nomesDeEmpresa(texto: string): string[] {
  const nomes = texto
    .split("\n")
    .map((linha) =>
      linha
        // tira o CNPJ, venha ele antes do nome (guias federais) ou depois (boletos)
        .replace(/^\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\s*/, "")
        .replace(/\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*$/, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter(
      (linha) =>
        linha.length >= 8 &&
        linha.length <= 70 &&
        NOME_DE_EMPRESA.test(linha) &&
        !/\d{2}\/\d{2}\/\d{4}/.test(linha) &&
        !/^(nome|raz[ãa]o|benefici|pagador|cedente|informa)/i.test(linha)
    );
  return [...new Set(nomes)];
}

function acharBeneficiario(texto: string, formato: DadosBoleto["formato"]): string | null {
  const nomes = nomesDeEmpresa(texto);
  if (nomes.length === 0) return null;
  // No boleto bancário o 1º nome costuma ser o pagador e o 2º o beneficiário.
  // Nas guias de arrecadação só aparece o contribuinte.
  if (formato === "bancario" && nomes.length > 1) return nomes[1];
  return nomes[0];
}

export interface ItemComposicao {
  codigo: string;
  denominacao: string;
  valor: number;
}

/**
 * Lê a tabela "Composição do Documento de Arrecadação" das guias federais
 * (DAS e DARF), que traz o valor real de cada tributo.
 */
export function extrairComposicao(texto: string): ItemComposicao[] {
  const itens: ItemComposicao[] = [];
  for (const linha of texto.split("\n")) {
    const m = linha
      .trim()
      .match(/^(\d{4})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})(?:\s+(\d{1,3}(?:\.\d{3})*,\d{2}))*\s*$/);
    if (!m) continue;
    const valor = Number(m[3].replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) continue;
    itens.push({
      codigo: m[1],
      denominacao: m[2].replace(/\s{2,}/g, " ").replace(/\s+-\s+/g, " - ").trim(),
      valor,
    });
  }
  return itens;
}

/** Junta tudo: lê o texto de um PDF de boleto/guia e devolve os dados estruturados. */
export function extrairDadosDoTexto(texto: string): DadosBoleto {
  const avisos: string[] = [];
  const codigo = acharLinhaDigitavel(texto);
  const valorTexto = acharValor(texto);
  const vencimentoTexto = acharData(texto);

  const valor = codigo?.valor ?? valorTexto;
  if (codigo?.valor && valorTexto && Math.abs(codigo.valor - valorTexto) > 0.01) {
    avisos.push(
      `O valor do código de barras (R$ ${codigo.valor.toFixed(
        2
      )}) é diferente do valor impresso (R$ ${valorTexto.toFixed(2)}). Usei o do código de barras.`
    );
  }
  if (!codigo) avisos.push("Não encontrei a linha digitável no PDF.");

  const formato = (codigo?.formato as DadosBoleto["formato"]) ?? "desconhecido";
  const composicao = extrairComposicao(texto);
  const somaComposicao = composicao.reduce((s, i) => s + i.valor, 0);
  if (composicao.length > 0 && valor && Math.abs(somaComposicao - valor) > 0.01) {
    avisos.push(
      "A soma dos tributos discriminados não fecha com o valor total — pode haver multa ou juros na guia."
    );
  }

  return {
    formato,
    linhaDigitavel: codigo?.linhaDigitavel ?? null,
    valor: valor ?? null,
    vencimento: codigo?.vencimento ?? vencimentoTexto,
    banco: codigo?.banco ?? null,
    segmento: codigo?.segmento ?? null,
    tipo: classificarDocumento(texto),
    competencia: acharCompetencia(texto),
    cnpj: texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)?.[0] ?? null,
    beneficiario: acharBeneficiario(texto, formato),
    composicao,
    avisos: [...avisos, ...(codigo?.avisos ?? [])],
  };
}

export function formatarLinhaDigitavel(linha: string): string {
  const d = apenasDigitos(linha);
  if (d.length === 47) {
    return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(
      15,
      21
    )} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
  }
  if (d.length === 48) {
    return `${d.slice(0, 12)} ${d.slice(12, 24)} ${d.slice(24, 36)} ${d.slice(36)}`;
  }
  return d;
}
