"use client";

import { useEffect, useId, useState } from "react";
import { moeda, paraNumero } from "@/lib/format";

export function Card({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{titulo}</h2>
          {descricao && <p className="mt-1 text-sm text-slate-400">{descricao}</p>}
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}

export function Campo({
  label,
  dica,
  children,
}: {
  label: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
      {dica && <span className="mt-1 block text-xs text-slate-500">{dica}</span>}
    </label>
  );
}

const inputClasses =
  "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 placeholder:text-slate-600";

export function InputMoeda({
  valor,
  onChange,
  placeholder = "0,00",
}: {
  valor: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  const exibido =
    texto ?? (valor ? valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "");

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
        R$
      </span>
      <input
        inputMode="decimal"
        className={`${inputClasses} pl-9 tabular-nums`}
        value={exibido}
        placeholder={placeholder}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(paraNumero(e.target.value));
        }}
        onFocus={(e) => setTexto(e.target.value)}
        onBlur={() => setTexto(null)}
      />
    </div>
  );
}

export function InputTexto({
  valor,
  onChange,
  placeholder,
  tipo = "text",
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tipo?: string;
}) {
  return (
    <input
      type={tipo}
      className={`${inputClasses} ${tipo === "date" ? "[color-scheme:dark]" : ""}`}
      value={valor}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Select<T extends string>({
  valor,
  onChange,
  opcoes,
}: {
  valor: T;
  onChange: (v: T) => void;
  opcoes: { valor: T; label: string }[];
}) {
  return (
    <select
      className={inputClasses}
      value={valor}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor} className="bg-slate-900">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Switch({
  ligado,
  onChange,
  label,
  dica,
}: {
  ligado: boolean;
  onChange: (v: boolean) => void;
  label: string;
  dica?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        onClick={() => onChange(!ligado)}
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full border transition ${
          ligado ? "border-emerald-500 bg-emerald-500/80" : "border-slate-600 bg-slate-700"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition ${
            ligado ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer text-sm text-slate-300">
        {label}
        {dica && <span className="block text-xs text-slate-500">{dica}</span>}
      </label>
    </div>
  );
}

export function Etiqueta({
  children,
  tom = "slate",
}: {
  children: React.ReactNode;
  tom?: "slate" | "emerald" | "amber" | "sky" | "rose";
}) {
  const tons = {
    slate: "border-slate-700 bg-slate-800/60 text-slate-300",
    emerald: "border-emerald-800 bg-emerald-900/40 text-emerald-300",
    amber: "border-amber-800 bg-amber-900/30 text-amber-300",
    sky: "border-sky-800 bg-sky-900/30 text-sky-300",
    rose: "border-rose-800 bg-rose-900/30 text-rose-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tons[tom]}`}
    >
      {children}
    </span>
  );
}

export function Linha({
  rotulo,
  valor,
  detalhe,
  forte,
}: {
  rotulo: React.ReactNode;
  valor: number;
  detalhe?: string;
  forte?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-1.5 ${
        forte ? "border-t border-slate-700 pt-2.5 font-semibold text-slate-100" : "text-slate-300"
      }`}
    >
      <span className="text-sm">
        {rotulo}
        {detalhe && <span className="ml-2 text-xs text-slate-500">{detalhe}</span>}
      </span>
      <span className="tabular-nums text-sm">{moeda(valor)}</span>
    </div>
  );
}

/**
 * Estado persistido no navegador (nada sai do dispositivo).
 * `migrar` completa campos novos em dados salvos por versões antigas.
 */
export function useEstadoLocal<T>(chave: string, inicial: T, migrar: (v: T) => T = (v) => v) {
  const [valor, setValor] = useState<T>(inicial);
  const [carregado, setCarregado] = useState(false);

  // O localStorage só existe no navegador, então a leitura acontece depois da
  // hidratação — daí o setState dentro do efeito.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(chave);
      if (salvo) setValor(migrar({ ...inicial, ...(JSON.parse(salvo) as T) }));
    } catch {
      /* ignora storage indisponível */
    }
    setCarregado(true);
  }, [chave]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!carregado) return;
    try {
      window.localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      /* ignora storage indisponível */
    }
  }, [chave, valor, carregado]);

  return [valor, setValor, carregado] as const;
}
