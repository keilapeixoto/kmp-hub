"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ACTION_RESP,
  ACTION_STATUS,
  TRAJ_STATUS,
} from "@/lib/consultation-forms/constants";
import type {
  ConsultationFormData,
  TrajRow,
} from "@/lib/consultation-forms/types";
import {
  autosaveConsultationForm,
  confirmAiSection,
  deleteConsultationForm,
} from "../actions";
import { ImportTranscriptModal } from "./import-transcript-modal";

const STATUS_COLOR: Record<string, string> = {
  green: "border-green-600 text-green-600",
  amber: "border-amber-600 text-amber-600",
  orange: "border-kmp-orange text-kmp-orange",
  blue: "border-blue-600 text-blue-600",
  muted: "border-gray-400 text-gray-500",
};

function colorFor(list: readonly { slug: string; color: string }[], slug: string) {
  return STATUS_COLOR[list.find((i) => i.slug === slug)?.color ?? "orange"];
}

function updateAt<T>(list: T[], index: number, patch: Partial<T>): T[] {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}
function removeAt<T>(list: T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

const selectClass = "rounded-full border-[1.5px] bg-white px-2.5 py-1 text-[11px] font-semibold";
const cardClass = "relative rounded-lg border border-black/10 bg-kmp-bg p-4";
const cardNameClass =
  "mb-2 w-full border-b border-dashed border-black/15 bg-transparent pb-2 font-heading text-lg font-semibold text-kmp-graphite focus:border-kmp-orange focus:outline-none";
const fieldRowClass = "flex items-center gap-2 border-b border-dotted border-black/10 py-1.5 last:border-none";
const fieldLabelClass = "w-[42%] shrink-0 text-xs font-medium text-kmp-graphite";
const fieldInputClass = "flex-1 border-none bg-transparent text-right text-sm text-kmp-graphite focus:outline-none";
const removeBtnClass =
  "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-red-700 hover:bg-red-50 print:hidden";
const addBtnClass =
  "mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-kmp-orange px-3 py-1.5 text-xs font-semibold text-kmp-orange hover:bg-orange-50 print:hidden";
const sectionHdClass = "mb-3 flex items-center gap-3 border-b-2 border-orange-100 pb-2";
const sectionNumClass =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kmp-orange text-xs font-bold text-white";
const sectionTitleClass = "text-sm font-bold uppercase tracking-wide text-kmp-graphite";

function AiBadge({
  section,
  pending,
  onConfirm,
}: {
  section: string | string[];
  pending: string[];
  onConfirm: () => void;
}) {
  const keys = Array.isArray(section) ? section : [section];
  const isPending = keys.some((k) => pending.includes(k));
  if (!isPending) return null;
  return (
    <button
      type="button"
      onClick={onConfirm}
      className="ml-auto shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 print:hidden"
      title="Preenchido pela IA — clique para marcar como revisado"
    >
      gerado por IA — clique para confirmar revisão
    </button>
  );
}

export function FichaEditor({
  formId,
  clientId,
  initialData,
  initialPendingSections,
}: {
  formId: string;
  clientId: string;
  initialData: ConsultationFormData;
  initialPendingSections: string[];
}) {
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState(initialPendingSections);
  const [saveStatus, setSaveStatus] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        const res = await autosaveConsultationForm(formId, data);
        setSaveStatus(
          res.error ? "Erro ao salvar" : `Salvo às ${new Date().toLocaleTimeString("pt-BR")}`,
        );
      });
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function clearPending(sections: string | string[]) {
    const keys = Array.isArray(sections) ? sections : [sections];
    const toClear = keys.filter((k) => pending.includes(k));
    if (toClear.length === 0) return;
    const next = pending.filter((s) => !toClear.includes(s));
    setPending(next);
    startTransition(() => {
      confirmAiSection(formId, toClear[0], pending).then(() => {
        toClear.slice(1).forEach((s) => confirmAiSection(formId, s, next));
      });
    });
  }

  function set<K extends keyof ConsultationFormData>(key: K, value: ConsultationFormData[K]) {
    clearPending(key as string);
    setData((d) => ({ ...d, [key]: value }));
  }

  function applyImport(next: ConsultationFormData, pendingSections: string[]) {
    skipNextSave.current = true;
    setData(next);
    setPending(pendingSections);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-full">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/clientes/${clientId}?tab=fichas`} className="text-sm text-kmp-graphite/60 hover:text-kmp-orange">
          ← Voltar
        </Link>
        <span className="flex-1" />
        <span className="text-xs text-kmp-graphite/50">{saveStatus}</span>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="rounded-md bg-kmp-graphite px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Importar transcrição
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-medium text-kmp-graphite transition hover:bg-black/5"
        >
          Imprimir / Exportar PDF
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("Excluir esta ficha? Essa ação não pode ser desfeita.")) {
              startTransition(() => deleteConsultationForm(formId, clientId));
            }
          }}
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
        >
          Excluir
        </button>
      </div>

      <div className="rounded-lg bg-white shadow-sm print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-lg bg-kmp-orange px-8 py-5 print:rounded-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG local, next/image bloqueia SVG por padrão (sem dangerouslyAllowSVG) */}
          <img src="/kmp-logo-horizontal.svg" alt="KMP Consulting" width={140} height={30} />
          <div className="flex flex-wrap justify-end gap-2">
            <input
              placeholder="Nome do(s) cliente(s)"
              value={data.clientNames}
              onChange={(e) => set("clientNames", e.target.value)}
              className="min-w-[220px] rounded-md border border-white/40 bg-white/15 px-3 py-1.5 text-sm text-white placeholder:text-white/75 focus:bg-white/25 focus:outline-none"
            />
            <input
              type="date"
              value={data.date}
              onChange={(e) => set("date", e.target.value)}
              className="rounded-md border border-white/40 bg-white/15 px-3 py-1.5 text-sm text-white focus:bg-white/25 focus:outline-none"
            />
          </div>
        </div>

        <div className="border-b border-black/10 px-8 py-5 text-center">
          <h1 className="font-heading text-2xl font-bold text-kmp-graphite">
            Briefing Estratégico de Carreira e Visto
          </h1>
          <p className="mt-1.5 text-xs text-kmp-graphite/60">KMP Consulting · Sydney, Austrália</p>
        </div>

        <div className="space-y-8 px-8 py-6">
          {/* 1. Panorama Atual */}
          <section>
            <div className={sectionHdClass}>
              <div className={sectionNumClass}>1</div>
              <h2 className={sectionTitleClass}>Panorama Atual</h2>
              <AiBadge section="panorama" pending={pending} onConfirm={() => clearPending("panorama")} />
            </div>
            <div className="flex flex-col gap-3">
              {data.panorama.map((p, i) => (
                <div key={i} className={cardClass}>
                  <button className={removeBtnClass} onClick={() => set("panorama", removeAt(data.panorama, i))}>
                    ×
                  </button>
                  <input
                    className={cardNameClass}
                    placeholder="Nome do cliente"
                    value={p.name}
                    onChange={(e) => set("panorama", updateAt(data.panorama, i, { name: e.target.value }))}
                  />
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>Chegada na Austrália</label>
                    <input
                      className={fieldInputClass}
                      placeholder="mês / ano"
                      value={p.chegada}
                      onChange={(e) => set("panorama", updateAt(data.panorama, i, { chegada: e.target.value }))}
                    />
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>Idade</label>
                    <input
                      className={fieldInputClass}
                      value={p.idade}
                      onChange={(e) => set("panorama", updateAt(data.panorama, i, { idade: e.target.value }))}
                    />
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>Situação / experiência profissional</label>
                    <input
                      className={fieldInputClass}
                      placeholder="ex: 15 anos em Tecnologia da Informação"
                      value={p.situacao}
                      onChange={(e) => set("panorama", updateAt(data.panorama, i, { situacao: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              className={addBtnClass}
              onClick={() => set("panorama", [...data.panorama, { name: "", chegada: "", idade: "", situacao: "" }])}
            >
              + Adicionar cliente
            </button>
          </section>

          {/* 2. Experiência Profissional */}
          <section>
            <div className={sectionHdClass}>
              <div className={sectionNumClass}>2</div>
              <h2 className={sectionTitleClass}>Experiência Profissional</h2>
              <AiBadge section="exp" pending={pending} onConfirm={() => clearPending("exp")} />
            </div>
            <div className="flex flex-col gap-3">
              {data.exp.map((x, i) => (
                <div key={i} className={cardClass}>
                  <button className={removeBtnClass} onClick={() => set("exp", removeAt(data.exp, i))}>
                    ×
                  </button>
                  <input
                    className={cardNameClass}
                    placeholder="Nome do cliente"
                    value={x.name}
                    onChange={(e) => set("exp", updateAt(data.exp, i, { name: e.target.value }))}
                  />
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>Área de Formação</label>
                    <input
                      className={fieldInputClass}
                      value={x.area}
                      onChange={(e) => set("exp", updateAt(data.exp, i, { area: e.target.value }))}
                    />
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>Experiência no Brasil</label>
                    <input
                      className={fieldInputClass}
                      value={x.br}
                      onChange={(e) => set("exp", updateAt(data.exp, i, { br: e.target.value }))}
                    />
                  </div>
                  <div className={fieldRowClass}>
                    <label className={fieldLabelClass}>Experiência na Austrália</label>
                    <input
                      className={fieldInputClass}
                      value={x.au}
                      onChange={(e) => set("exp", updateAt(data.exp, i, { au: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              className={addBtnClass}
              onClick={() => set("exp", [...data.exp, { name: "", area: "", br: "", au: "" }])}
            >
              + Adicionar cliente
            </button>
          </section>

          {/* 3. Trajetória Acadêmica */}
          <section>
            <div className={sectionHdClass}>
              <div className={sectionNumClass}>3</div>
              <h2 className={sectionTitleClass}>Trajetória Acadêmica</h2>
              <AiBadge section="traj" pending={pending} onConfirm={() => clearPending("traj")} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {data.traj.map((t, ti) => (
                <div key={ti} className={cardClass}>
                  <button className={removeBtnClass} onClick={() => set("traj", removeAt(data.traj, ti))}>
                    ×
                  </button>
                  <input
                    className={cardNameClass}
                    placeholder="Nome"
                    value={t.name}
                    onChange={(e) => set("traj", updateAt(data.traj, ti, { name: e.target.value }))}
                  />
                  <div className="flex flex-col">
                    {t.rows.map((r, ri) => (
                      <div key={ri} className="flex items-center gap-2 border-b border-dotted border-black/10 py-1.5 last:border-none">
                        <input
                          className="flex-1 border-none bg-transparent text-xs font-semibold text-kmp-graphite focus:outline-none"
                          placeholder="Nome do curso ou qualificação"
                          value={r.course}
                          onChange={(e) =>
                            set(
                              "traj",
                              updateAt(data.traj, ti, {
                                rows: updateAt(t.rows, ri, { course: e.target.value }),
                              }),
                            )
                          }
                        />
                        <select
                          className="w-[70px] rounded-md border border-black/10 bg-white px-1 py-0.5 text-[11px]"
                          value={r.country}
                          onChange={(e) =>
                            set(
                              "traj",
                              updateAt(data.traj, ti, {
                                rows: updateAt(t.rows, ri, { country: e.target.value as TrajRow["country"] }),
                              }),
                            )
                          }
                        >
                          <option value="BR">Brasil</option>
                          <option value="AU">Austrália</option>
                        </select>
                        <select
                          className={`${selectClass} ${colorFor(TRAJ_STATUS, r.status)}`}
                          value={r.status}
                          onChange={(e) =>
                            set(
                              "traj",
                              updateAt(data.traj, ti, {
                                rows: updateAt(t.rows, ri, { status: e.target.value as TrajRow["status"] }),
                              }),
                            )
                          }
                        >
                          {TRAJ_STATUS.map((s) => (
                            <option key={s.slug} value={s.slug}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="shrink-0 text-red-700 print:hidden"
                          onClick={() =>
                            set("traj", updateAt(data.traj, ti, { rows: removeAt(t.rows, ri) }))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-2 rounded-md border border-dashed border-kmp-orange px-3 py-1 text-[11px] font-semibold text-kmp-orange hover:bg-orange-50 print:hidden"
                    onClick={() =>
                      set("traj", updateAt(data.traj, ti, { rows: [...t.rows, { course: "", country: "BR", status: "next" }] }))
                    }
                  >
                    + Curso
                  </button>
                </div>
              ))}
            </div>
            <button
              className={addBtnClass}
              onClick={() => set("traj", [...data.traj, { name: "", rows: [{ course: "", country: "BR", status: "next" }] }])}
            >
              + Adicionar pessoa
            </button>
          </section>

          {/* 4. Informações Importantes Discutidas */}
          <section>
            <div className={sectionHdClass}>
              <div className={sectionNumClass}>4</div>
              <h2 className={sectionTitleClass}>Informações Importantes Discutidas</h2>
              <AiBadge section="notes" pending={pending} onConfirm={() => clearPending("notes")} />
            </div>
            <div className="flex flex-col gap-2.5">
              {data.notes.map((n, i) => (
                <div key={i} className="relative rounded-r-lg border-l-4 border-kmp-orange bg-orange-50/60 p-4">
                  <button className={removeBtnClass} onClick={() => set("notes", removeAt(data.notes, i))}>
                    ×
                  </button>
                  <input
                    className="mb-1.5 w-full border-none bg-transparent text-sm font-bold text-kmp-graphite focus:outline-none"
                    placeholder="Título do ponto discutido"
                    value={n.title}
                    onChange={(e) => set("notes", updateAt(data.notes, i, { title: e.target.value }))}
                  />
                  <textarea
                    className="w-full resize-y border-none bg-transparent text-sm text-kmp-graphite focus:outline-none"
                    placeholder="Explicação..."
                    rows={2}
                    value={n.body}
                    onChange={(e) => set("notes", updateAt(data.notes, i, { body: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <button className={addBtnClass} onClick={() => set("notes", [...data.notes, { title: "", body: "" }])}>
              + Adicionar informação
            </button>
          </section>

          {/* 5. Caminho Recomendado */}
          <section>
            <div className={sectionHdClass}>
              <div className={sectionNumClass}>5</div>
              <h2 className={sectionTitleClass}>Caminho Recomendado</h2>
              <AiBadge
                section={["steps", "strategyNote", "benefitNote"]}
                pending={pending}
                onConfirm={() => clearPending(["steps", "strategyNote", "benefitNote"])}
              />
            </div>
            <div className="rounded-lg bg-orange-100/70 p-4">
              <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wide text-kmp-orange">Fluxo proposto</p>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {data.steps.map((s, i) => (
                  <span key={i} className="flex items-center gap-0">
                    {i > 0 ? <span className="mr-2 font-bold text-kmp-orange">→</span> : null}
                    <span className="flex items-center gap-2 rounded-full border-[1.5px] border-kmp-orange bg-white px-3.5 py-1.5 text-xs font-semibold">
                      <input
                        className="min-w-[60px] border-none bg-transparent text-xs font-semibold text-kmp-graphite focus:outline-none"
                        placeholder="Etapa"
                        value={s}
                        onChange={(e) =>
                          set(
                            "steps",
                            data.steps.map((step, j) => (j === i ? e.target.value : step)),
                          )
                        }
                      />
                      <button className="text-red-700 print:hidden" onClick={() => set("steps", removeAt(data.steps, i))}>
                        ×
                      </button>
                    </span>
                  </span>
                ))}
              </div>
              <button className={addBtnClass} onClick={() => set("steps", [...data.steps, ""])}>
                + Adicionar etapa
              </button>
              <span className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-kmp-graphite/60">
                Estratégia para aumentar a pontuação
              </span>
              <textarea
                className="mt-1.5 min-h-[50px] w-full rounded-md border border-black/10 bg-white p-2.5 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none"
                placeholder="Descreva a estratégia discutida..."
                value={data.strategyNote}
                onChange={(e) => set("strategyNote", e.target.value)}
              />
              <span className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-kmp-graphite/60">
                Benefício ou observação adicional
              </span>
              <textarea
                className="mt-1.5 min-h-[50px] w-full rounded-md border border-black/10 bg-white p-2.5 text-sm text-kmp-graphite focus:border-kmp-orange focus:outline-none"
                placeholder="Descreva benefícios ou pontos adicionais..."
                value={data.benefitNote}
                onChange={(e) => set("benefitNote", e.target.value)}
              />
            </div>
          </section>

          {/* 6. Plano de Ação */}
          <section>
            <div className={sectionHdClass}>
              <div className={sectionNumClass}>6</div>
              <h2 className={sectionTitleClass}>Plano de Ação</h2>
              <AiBadge section="actions" pending={pending} onConfirm={() => clearPending("actions")} />
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-orange-100 text-left text-[10.5px] font-bold uppercase tracking-wide text-kmp-graphite/50">
                  <th className="w-[46%] pb-2">Ação</th>
                  <th className="w-[26%] pb-2">Responsável</th>
                  <th className="w-[22%] pb-2">Status</th>
                  <th className="w-[6%] pb-2" />
                </tr>
              </thead>
              <tbody>
                {data.actions.map((a, i) => (
                  <tr key={i} className="border-b border-black/5">
                    <td className="py-2 pr-2">
                      <input
                        className="w-full border-none bg-transparent text-sm text-kmp-graphite focus:outline-none"
                        placeholder="Descreva a ação"
                        value={a.text}
                        onChange={(e) => set("actions", updateAt(data.actions, i, { text: e.target.value }))}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        className={`${selectClass} w-full ${colorFor(ACTION_RESP, a.resp)}`}
                        value={a.resp}
                        onChange={(e) => set("actions", updateAt(data.actions, i, { resp: e.target.value as typeof a.resp }))}
                      >
                        {ACTION_RESP.map((r) => (
                          <option key={r.slug} value={r.slug}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        className={`${selectClass} w-full ${colorFor(ACTION_STATUS, a.status)}`}
                        value={a.status}
                        onChange={(e) => set("actions", updateAt(data.actions, i, { status: e.target.value as typeof a.status }))}
                      >
                        {ACTION_STATUS.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 print:hidden">
                      <button className="text-red-700" onClick={() => set("actions", removeAt(data.actions, i))}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className={addBtnClass}
              onClick={() => set("actions", [...data.actions, { text: "", resp: "kmp", status: "progress" }])}
            >
              + Adicionar ação
            </button>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-lg bg-kmp-orange px-8 py-4 print:rounded-none">
          <span className="text-[10.5px] text-white">
            KMP Consulting · keila.peixoto@kmpconsulting.com.au · kmpconsulting.com.au
          </span>
        </div>
      </div>

      {importOpen ? (
        <ImportTranscriptModal
          formId={formId}
          onClose={() => setImportOpen(false)}
          onApplied={applyImport}
        />
      ) : null}
    </div>
  );
}
