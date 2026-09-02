"use client";

import { useState } from "react";
import {
  Card,
  Campo,
  Etiqueta,
  InputMoeda,
  InputTexto,
  Linha,
  Select,
  Switch,
  useEstadoLocal,
} from "@/components/ui";
import { UploadBoletos } from "@/components/UploadBoletos";
import {
  calcularMes,
  ESTADO_INICIAL,
  ROTULOS_DIVISAO,
  type Conta,
  type Divisao,
  type Estado,
} from "@/lib/calculo";
import { ANEXOS, type AnexoId } from "@/lib/simples";
import { dataBR, diasAte, moeda, pct } from "@/lib/format";
import { formatarLinhaDigitavel, type TipoDocumento } from "@/lib/boleto";

const CATEGORIAS: TipoDocumento[] = [
  "DAS",
  "Contabilidade",
  "DARF",
  "GPS/INSS",
  "FGTS",
  "ISS",
  "Boleto",
  "Outro",
];

const OPCOES_DIVISAO = (Object.keys(ROTULOS_DIVISAO) as Divisao[]).map((v) => ({
  valor: v,
  label: ROTULOS_DIVISAO[v],
}));

function novoId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Home() {
  const [estado, setEstado, carregado] = useEstadoLocal<Estado>(
    "calculadora-empresa-v1",
    ESTADO_INICIAL
  );
  const [copiado, setCopiado] = useState(false);

  const r = calcularMes(estado);

  function atualizar(patch: Partial<Estado>) {
    setEstado((e) => ({ ...e, ...patch }));
  }

  function atualizarSocio(i: 0 | 1, patch: Partial<Estado["socios"][0]>) {
    setEstado((e) => {
      const socios = [...e.socios] as Estado["socios"];
      socios[i] = { ...socios[i], ...patch };
      return { ...e, socios };
    });
  }

  function adicionarContas(contas: Conta[]) {
    setEstado((e) => {
      const temDAS = contas.some((c) => c.categoria === "DAS");
      return {
        ...e,
        contas: [...e.contas, ...contas],
        fonteDAS: temDAS ? "boleto" : e.fonteDAS,
      };
    });
  }

  function atualizarConta(id: string, patch: Partial<Conta>) {
    setEstado((e) => ({
      ...e,
      contas: e.contas.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function removerConta(id: string) {
    setEstado((e) => {
      const contas = e.contas.filter((c) => c.id !== id);
      return {
        ...e,
        contas,
        fonteDAS: contas.some((c) => c.categoria === "DAS") ? e.fonteDAS : "calculado",
      };
    });
  }

  function contaManual(preset?: Partial<Conta>) {
    adicionarContas([
      {
        id: novoId(),
        nome: "Nova conta",
        categoria: "Outro",
        valor: 0,
        vencimento: null,
        divisao: "igual",
        linhaDigitavel: null,
        origem: "manual",
        ...preset,
      },
    ]);
  }

  function copiarResumo() {
    const linhas = [
      `Contas da empresa — ${estado.competencia}`,
      `Faturamento total: ${moeda(r.totalFaturamento)}`,
      `DAS (${estado.fonteDAS === "boleto" ? "boleto" : `calculado, ${pct(r.das.aliquotaEfetiva)}`}): ${moeda(r.dasValor)}`,
      ...r.outrasContas.map((c) => `${c.nome}: ${moeda(c.valor)}`),
      r.totalINSS > 0 ? `INSS pró-labore: ${moeda(r.totalINSS)}` : "",
      `TOTAL DO MÊS: ${moeda(r.totalGeral)}`,
      "",
      ...r.socios.flatMap((s) => [
        `${s.nome} — faturou ${moeda(s.faturamento)} (${pct(s.participacao * 100, 1)})`,
        ...s.itens.map((i) => `   ${i.rotulo}: ${moeda(i.valor)}`),
        `   TOTAL A PAGAR: ${moeda(s.total)} · sobra ${moeda(s.liquido)}`,
        "",
      ]),
    ].filter(Boolean);
    void navigator.clipboard.writeText(linhas.join("\n"));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (!carregado) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  const anexoInfo = ANEXOS[r.das.anexoAplicado];
  // Quando o DAS vem do boleto, a própria guia traz o valor de cada tributo.
  const composicaoReal =
    estado.fonteDAS === "boleto" && r.dasBoleto?.composicao?.length
      ? [...r.dasBoleto.composicao].sort((a, b) => b.valor - a.valor)
      : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            Calculadora de contas da empresa
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            DAS do Simples Nacional, contabilidade e demais boletos — com o rateio entre os dois
            sócios.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <Campo label="Competência">
            <InputTexto
              tipo="month"
              valor={estado.competencia}
              onChange={(v) => atualizar({ competencia: v })}
            />
          </Campo>
          <button
            type="button"
            onClick={copiarResumo}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            {copiado ? "Copiado!" : "Copiar resumo"}
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <Card
            titulo="Faturamento dos sócios"
            descricao="Quanto cada um faturou na competência. É isso que define o rateio proporcional."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {estado.socios.map((socio, indice) => {
                const i = indice as 0 | 1;
                return (
                  <div
                    key={i}
                    className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <InputTexto
                      valor={socio.nome}
                      onChange={(v) => atualizarSocio(i, { nome: v })}
                      placeholder={`Sócio ${i + 1}`}
                    />
                    <Campo label="Faturamento no mês">
                      <InputMoeda
                        valor={socio.faturamento}
                        onChange={(v) => atualizarSocio(i, { faturamento: v })}
                      />
                    </Campo>
                    {estado.cobrarINSS && (
                      <Campo label="Pró-labore">
                        <InputMoeda
                          valor={socio.proLabore}
                          onChange={(v) => atualizarSocio(i, { proLabore: v })}
                        />
                      </Campo>
                    )}
                    <p className="text-xs text-slate-500">
                      Participação no faturamento:{" "}
                      <span className="text-slate-300">{pct(r.participacao[i] * 100, 1)}</span>
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-800/40 px-4 py-2.5">
              <span className="text-sm text-slate-300">Faturamento total do mês</span>
              <span className="tabular-nums text-lg font-semibold text-slate-50">
                {moeda(r.totalFaturamento)}
              </span>
            </div>
          </Card>

          <Card
            titulo="Simples Nacional"
            descricao="Dados da empresa que definem a alíquota do DAS."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Anexo" dica={ANEXOS[estado.anexo].descricao}>
                <Select<AnexoId>
                  valor={estado.anexo}
                  onChange={(v) => atualizar({ anexo: v })}
                  opcoes={(Object.keys(ANEXOS) as AnexoId[]).map((id) => ({
                    valor: id,
                    label: ANEXOS[id].nome,
                  }))}
                />
              </Campo>
              <Campo
                label="RBT12 — faturamento dos últimos 12 meses"
                dica="Sem esse valor a alíquota é só uma estimativa."
              >
                <InputMoeda valor={estado.rbt12} onChange={(v) => atualizar({ rbt12: v })} />
              </Campo>
            </div>

            <div className="mt-4 space-y-4">
              <Switch
                ligado={estado.usarFatorR}
                onChange={(v) => atualizar({ usarFatorR: v })}
                label="Aplicar Fator R (Anexo III ou V)"
                dica="Folha ≥ 28% do faturamento leva a empresa para o Anexo III."
              />
              {estado.usarFatorR && (
                <Campo
                  label="Folha dos últimos 12 meses (com pró-labore e encargos)"
                  dica={
                    r.das.fatorR !== null
                      ? `Fator R atual: ${pct(r.das.fatorR, 1)} → Anexo ${r.das.anexoAplicado}`
                      : undefined
                  }
                >
                  <InputMoeda valor={estado.folha12} onChange={(v) => atualizar({ folha12: v })} />
                </Campo>
              )}
              <Campo label="Como dividir o DAS entre os sócios">
                <Select<Divisao>
                  valor={estado.divisaoDAS}
                  onChange={(v) => atualizar({ divisaoDAS: v })}
                  opcoes={OPCOES_DIVISAO}
                />
              </Campo>
              <Switch
                ligado={estado.cobrarINSS}
                onChange={(v) => atualizar({ cobrarINSS: v })}
                label="Descontar INSS de 11% sobre o pró-labore de cada sócio"
                dica={`Limitado ao teto de ${moeda(estado.tetoINSS)}.`}
              />
              {estado.cobrarINSS && (
                <Campo label="Teto do INSS" dica="Atualize quando o teto mudar no ano.">
                  <InputMoeda valor={estado.tetoINSS} onChange={(v) => atualizar({ tetoINSS: v })} />
                </Campo>
              )}
            </div>
          </Card>

          <Card
            titulo="Contas do mês"
            descricao="Suba os PDFs dos boletos ou cadastre na mão."
            acao={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => contaManual({ nome: "Contabilidade", categoria: "Contabilidade" })}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
                >
                  + Contabilidade
                </button>
                <button
                  type="button"
                  onClick={() => contaManual()}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
                >
                  + Conta
                </button>
              </div>
            }
          >
            <UploadBoletos onAdicionar={adicionarContas} />

            <div className="mt-5 space-y-3">
              {estado.contas.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
                  Nenhuma conta cadastrada ainda.
                </p>
              )}
              {estado.contas.map((conta) => (
                <div
                  key={conta.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Etiqueta tom={conta.categoria === "DAS" ? "emerald" : "slate"}>
                        {conta.categoria}
                      </Etiqueta>
                      {conta.origem === "pdf" && <Etiqueta tom="sky">lido do PDF</Etiqueta>}
                      {conta.competencia && <Etiqueta>comp. {conta.competencia}</Etiqueta>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removerConta(conta.id)}
                      className="text-xs text-slate-500 transition hover:text-rose-400"
                    >
                      remover
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo label="Descrição">
                      <InputTexto
                        valor={conta.nome}
                        onChange={(v) => atualizarConta(conta.id, { nome: v })}
                      />
                    </Campo>
                    <Campo label="Categoria">
                      <Select<TipoDocumento>
                        valor={conta.categoria}
                        onChange={(v) => atualizarConta(conta.id, { categoria: v })}
                        opcoes={CATEGORIAS.map((c) => ({ valor: c, label: c }))}
                      />
                    </Campo>
                    <Campo label="Valor">
                      <InputMoeda
                        valor={conta.valor}
                        onChange={(v) => atualizarConta(conta.id, { valor: v })}
                      />
                    </Campo>
                    <Campo label="Vencimento">
                      <InputTexto
                        tipo="date"
                        valor={conta.vencimento ?? ""}
                        onChange={(v) => atualizarConta(conta.id, { vencimento: v || null })}
                      />
                    </Campo>
                    {conta.categoria !== "DAS" && (
                      <div className="sm:col-span-2">
                        <Campo label="Quem paga">
                          <Select<Divisao>
                            valor={conta.divisao}
                            onChange={(v) => atualizarConta(conta.id, { divisao: v })}
                            opcoes={OPCOES_DIVISAO}
                          />
                        </Campo>
                      </div>
                    )}
                  </div>

                  {conta.linhaDigitavel && (
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(conta.linhaDigitavel!)}
                      title="Clique para copiar"
                      className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-left font-mono text-[11px] tracking-tight text-slate-400 transition hover:text-emerald-300"
                    >
                      {formatarLinhaDigitavel(conta.linhaDigitavel)}
                    </button>
                  )}
                  {conta.avisos?.map((a, i) => (
                    <p key={i} className="mt-2 text-xs text-amber-400">
                      {a}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card titulo="Total do mês" descricao="Tudo que a empresa precisa pagar na competência.">
            <Linha rotulo="DAS — Simples Nacional" valor={r.dasValor} />
            {r.outrasContas.map((c) => (
              <Linha key={c.id} rotulo={c.nome} valor={c.valor} />
            ))}
            {r.totalINSS > 0 && <Linha rotulo="INSS sobre pró-labore" valor={r.totalINSS} />}
            <Linha rotulo="Total" valor={r.totalGeral} forte />
            {r.avisos.map((a, i) => (
              <p
                key={i}
                className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300"
              >
                {a}
              </p>
            ))}
            {r.totalFaturamento > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Isso é{" "}
                <span className="font-medium text-slate-300">
                  {pct(r.cargaSobreFaturamento, 1)}
                </span>{" "}
                do faturamento do mês. Sobram {moeda(r.totalFaturamento - r.totalGeral)} para os
                sócios.
              </p>
            )}
          </Card>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {r.socios.map((s, i) => (
              <Card key={i} titulo={s.nome} descricao={`Faturou ${moeda(s.faturamento)}`}>
                {s.itens.length === 0 && (
                  <p className="text-sm text-slate-500">Nada a pagar neste mês.</p>
                )}
                {s.itens.map((item, j) => (
                  <Linha key={j} rotulo={item.rotulo} valor={item.valor} detalhe={item.detalhe} />
                ))}
                <Linha rotulo="Total a pagar" valor={s.total} forte />
                <div className="mt-3 rounded-lg bg-emerald-950/40 px-3 py-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-emerald-300/80">Sobra para o sócio</span>
                    <span className="tabular-nums text-sm font-semibold text-emerald-300">
                      {moeda(s.liquido)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card
            titulo="Como o DAS foi calculado"
            descricao={anexoInfo.nome}
            acao={
              r.dasBoleto ? (
                <Select<Estado["fonteDAS"]>
                  valor={estado.fonteDAS}
                  onChange={(v) => atualizar({ fonteDAS: v })}
                  opcoes={[
                    { valor: "boleto", label: "Usar valor do boleto" },
                    { valor: "calculado", label: "Usar valor calculado" },
                  ]}
                />
              ) : undefined
            }
          >
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">RBT12 usado</dt>
                <dd className="tabular-nums text-slate-200">
                  {moeda(r.das.rbt12Base)}
                  {r.das.rbt12Estimado && (
                    <span className="ml-2 text-xs text-amber-400">estimado</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Faixa</dt>
                <dd className="text-slate-200">
                  {r.das.faixa.numero}ª faixa · alíquota nominal {pct(r.das.aliquotaNominal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Parcela a deduzir</dt>
                <dd className="tabular-nums text-slate-200">{moeda(r.das.faixa.deduzir)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Alíquota efetiva</dt>
                <dd className="tabular-nums font-semibold text-emerald-300">
                  {pct(r.das.aliquotaEfetiva)}
                </dd>
              </div>
            </dl>

            <p className="mt-3 rounded-lg bg-slate-950/60 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
              ({moeda(r.das.rbt12Base)} × {pct(r.das.aliquotaNominal)} −{" "}
              {moeda(r.das.faixa.deduzir)}) ÷ {moeda(r.das.rbt12Base)} ={" "}
              {pct(r.das.aliquotaEfetiva)}
              <br />
              {moeda(r.totalFaturamento)} × {pct(r.das.aliquotaEfetiva)} ={" "}
              <span className="text-emerald-300">{moeda(r.das.das)}</span>
            </p>

            {r.dasBoleto && Math.abs(r.dasBoleto.valor - r.das.das) > 0.01 && (
              <p className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">
                O boleto do DAS veio {moeda(r.dasBoleto.valor)} e o cálculo deu{" "}
                {moeda(r.das.das)} — diferença de {moeda(Math.abs(r.dasBoleto.valor - r.das.das))}.
                Costuma ser receita de outra competência, multa/juros ou retenções. Estou usando o
                valor {estado.fonteDAS === "boleto" ? "do boleto" : "calculado"}.
              </p>
            )}

            <div className="mt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Para onde vai o DAS
                {composicaoReal && (
                  <span className="ml-2 normal-case tracking-normal text-emerald-400">
                    valores da própria guia
                  </span>
                )}
              </h3>
              <div className="space-y-1">
                {composicaoReal?.map((item) => (
                  <div key={item.codigo} className="flex items-center gap-3 text-xs">
                    <span className="w-14 shrink-0 text-slate-300">
                      {item.denominacao.split(/\s+-\s+/)[0]}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500/70"
                        style={{ width: `${(item.valor / composicaoReal[0].valor) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right tabular-nums text-slate-500">
                      {pct((item.valor / r.dasValor) * 100, 1)}
                    </span>
                    <span className="w-24 shrink-0 text-right tabular-nums text-slate-300">
                      {moeda(item.valor)}
                    </span>
                  </div>
                ))}
                {!composicaoReal &&
                  r.das.tributos.map((t) => (
                  <div key={t.nome} className="flex items-center gap-3 text-xs">
                    <span className="w-14 shrink-0 text-slate-300">{t.nome}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500/70"
                        style={{
                          width: `${(t.percentual / r.das.tributos[0].percentual) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right tabular-nums text-slate-500">
                      {pct(t.percentual, 1)}
                    </span>
                    <span className="w-24 shrink-0 text-right tabular-nums text-slate-300">
                      {moeda(r.dasValor * (t.percentual / 100))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {r.das.avisos.length > 0 && (
              <ul className="mt-4 space-y-2">
                {r.das.avisos.map((a, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {r.proximosVencimentos.length > 0 && (
            <Card titulo="Vencimentos" descricao="O que vence primeiro.">
              <ul className="space-y-2">
                {r.proximosVencimentos.map((c) => {
                  const dias = diasAte(c.vencimento);
                  return (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-2 text-sm last:border-0"
                    >
                      <div>
                        <p className="text-slate-200">{c.nome}</p>
                        <p className="text-xs text-slate-500">
                          {dataBR(c.vencimento)}
                          {dias !== null && (
                            <span
                              className={
                                dias < 0
                                  ? " text-rose-400"
                                  : dias <= 5
                                    ? " text-amber-400"
                                    : " text-slate-500"
                              }
                            >
                              {dias < 0
                                ? ` · vencido há ${Math.abs(dias)} dia(s)`
                                : dias === 0
                                  ? " · vence hoje"
                                  : ` · em ${dias} dia(s)`}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="tabular-nums text-slate-300">{moeda(c.valor)}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500">
        <p className="max-w-2xl">
          Cálculo baseado nas tabelas dos Anexos I a V da LC 123/2006. É uma ferramenta de apoio
          para a divisão entre os sócios — o valor oficial é sempre o do DAS gerado no PGDAS-D.
          Tudo fica salvo só no seu navegador.
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm("Apagar todos os dados salvos?")) setEstado(ESTADO_INICIAL);
          }}
          className="rounded-lg border border-slate-800 px-3 py-1.5 transition hover:border-rose-900 hover:text-rose-400"
        >
          Limpar tudo
        </button>
      </footer>
    </main>
  );
}
