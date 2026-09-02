"use client";

import { useRef, useState } from "react";
import { extrairDadosDoTexto, lerLinhaDigitavel, type DadosBoleto } from "@/lib/boleto";
import { extrairTextoDoPdf } from "@/lib/pdf";
import type { Conta } from "@/lib/calculo";
import { moeda } from "@/lib/format";
import { Etiqueta, InputTexto } from "./ui";

type Status = { arquivo: string; ok: boolean; mensagem: string };

function novoId() {
  return Math.random().toString(36).slice(2, 10);
}

function nomeDaConta(dados: DadosBoleto, arquivo: string): string {
  if (dados.tipo === "DAS") {
    return dados.competencia ? `DAS — competência ${dados.competencia}` : "DAS — Simples Nacional";
  }
  // Guias federais dizem na composição o que está sendo pago — é o melhor nome.
  if (dados.composicao.length === 1) {
    const d = dados.composicao[0].denominacao;
    return `${dados.tipo} — ${d.length > 60 ? `${d.slice(0, 60)}…` : d}`;
  }
  if (dados.tipo === "Contabilidade") return dados.beneficiario ?? "Contabilidade";
  // Em guia de arrecadação o nome que aparece é o do próprio contribuinte, não serve.
  if (dados.formato === "bancario" && dados.beneficiario) {
    return `${dados.tipo} — ${dados.beneficiario}`;
  }
  if (dados.competencia) return `${dados.tipo} — competência ${dados.competencia}`;
  if (dados.tipo !== "Outro" && dados.tipo !== "Boleto") return dados.tipo;
  return arquivo.replace(/\.pdf$/i, "");
}

export function UploadBoletos({ onAdicionar }: { onAdicionar: (contas: Conta[]) => void }) {
  const [processando, setProcessando] = useState(false);
  const [status, setStatus] = useState<Status[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [linha, setLinha] = useState("");
  const [erroLinha, setErroLinha] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processar(arquivos: FileList | File[]) {
    const lista = Array.from(arquivos).filter((f) => /\.pdf$/i.test(f.name));
    if (lista.length === 0) {
      setStatus([{ arquivo: "—", ok: false, mensagem: "Envie arquivos PDF." }]);
      return;
    }
    setProcessando(true);
    const novos: Conta[] = [];
    const resultados: Status[] = [];

    for (const arquivo of lista) {
      try {
        const texto = await extrairTextoDoPdf(arquivo);
        if (texto.replace(/\s/g, "").length < 20) {
          resultados.push({
            arquivo: arquivo.name,
            ok: false,
            mensagem: "PDF sem texto (parece ser digitalizado). Cadastre o valor na mão.",
          });
          continue;
        }
        const dados = extrairDadosDoTexto(texto);
        if (!dados.valor) {
          resultados.push({
            arquivo: arquivo.name,
            ok: false,
            mensagem: "Li o PDF mas não achei o valor. Cadastre na mão.",
          });
          continue;
        }
        novos.push({
          id: novoId(),
          nome: nomeDaConta(dados, arquivo.name),
          categoria: dados.tipo,
          valor: dados.valor,
          vencimento: dados.vencimento,
          divisao: dados.tipo === "DAS" ? "proporcional" : "igual",
          linhaDigitavel: dados.linhaDigitavel,
          origem: "pdf",
          arquivo: arquivo.name,
          competencia: dados.competencia,
          beneficiario: dados.beneficiario,
          composicao: dados.composicao,
          avisos: dados.avisos,
        });
        resultados.push({
          arquivo: arquivo.name,
          ok: true,
          mensagem: `${dados.tipo} · ${moeda(dados.valor)}${
            dados.vencimento ? ` · vence ${dados.vencimento.split("-").reverse().join("/")}` : ""
          }`,
        });
      } catch (e) {
        resultados.push({
          arquivo: arquivo.name,
          ok: false,
          mensagem: `Não consegui abrir o PDF (${(e as Error).message}).`,
        });
      }
    }

    if (novos.length) onAdicionar(novos);
    setStatus(resultados);
    setProcessando(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function adicionarPelaLinha() {
    const dados = lerLinhaDigitavel(linha);
    if (!dados || !dados.valor) {
      setErroLinha("Linha digitável inválida ou sem valor (47 ou 48 dígitos).");
      return;
    }
    setErroLinha(null);
    onAdicionar([
      {
        id: novoId(),
        nome: dados.formato === "arrecadacao" ? "Guia de arrecadação" : "Boleto",
        categoria: dados.formato === "arrecadacao" ? "Outro" : "Boleto",
        valor: dados.valor,
        vencimento: dados.vencimento ?? null,
        divisao: "igual",
        linhaDigitavel: dados.linhaDigitavel ?? null,
        origem: "manual",
        avisos: dados.avisos,
      },
    ]);
    setLinha("");
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          void processar(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
          arrastando
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => e.target.files && void processar(e.target.files)}
        />
        <p className="text-sm font-medium text-slate-200">
          {processando ? "Lendo os PDFs…" : "Arraste os PDFs aqui ou clique para escolher"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          DAS, DARF, GPS, FGTS, boleto da contabilidade… Leio o valor, o vencimento e a linha
          digitável direto no seu navegador — nenhum arquivo é enviado para lugar nenhum.
        </p>
      </div>

      {status.length > 0 && (
        <ul className="space-y-1.5">
          {status.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <Etiqueta tom={s.ok ? "emerald" : "amber"}>{s.ok ? "ok" : "atenção"}</Etiqueta>
              <span className="text-slate-400">
                <span className="text-slate-300">{s.arquivo}</span> — {s.mensagem}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <p className="mb-2 text-xs text-slate-400">
          Ou cole a linha digitável (o PDF pode ser uma imagem digitalizada):
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <InputTexto
            valor={linha}
            onChange={setLinha}
            placeholder="85800000012 3 45600000078 9 …"
          />
          <button
            type="button"
            onClick={adicionarPelaLinha}
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Ler código
          </button>
        </div>
        {erroLinha && <p className="mt-2 text-xs text-amber-400">{erroLinha}</p>}
      </div>
    </div>
  );
}
