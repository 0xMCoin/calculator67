export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function moeda(v: number): string {
  return brl.format(Number.isFinite(v) ? v : 0);
}

export function pct(v: number, casas = 2): string {
  return `${(Number.isFinite(v) ? v : 0).toFixed(casas).replace(".", ",")}%`;
}

/** Converte o que o usuário digita ("12.345,67", "12345.67", "1234567") em número. */
export function paraNumero(entrada: string): number {
  const limpo = entrada.replace(/[^\d,.-]/g, "");
  if (!limpo) return 0;
  const temVirgula = limpo.includes(",");
  const normalizado = temVirgula
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

export function dataBR(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return d ? `${d}/${m}/${a}` : iso;
}

export function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const alvo = new Date(`${iso}T12:00:00`).getTime();
  if (!Number.isFinite(alvo)) return null;
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return Math.round((alvo - hoje.getTime()) / 86_400_000);
}
