import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BOOST_CONTENT_ID,
  DEFAULTS,
  ICON_MAP,
  isSpanRow,
  type BoostContent,
  type ExamRow,
} from "@/hooks/useBoostContent";

const INPUT =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const LABEL = "text-xs font-semibold text-muted-foreground";

/** Move item at `from` by `dir` (-1 up, +1 down); no-op at the edges. */
function move<T>(arr: T[], from: number, dir: number): T[] {
  const to = from + dir;
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-border bg-background/40 open:bg-background" open>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-foreground">
        {title}
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>
    </details>
  );
}

function RowTools({
  onUp,
  onDown,
  onRemove,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onUp} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Move up">
        <ChevronUp className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDown} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Move down">
        <ChevronDown className="h-4 w-4" />
      </button>
      <button type="button" onClick={onRemove} className="p-1.5 text-muted-foreground hover:text-red-600" aria-label="Remove">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-bansal-orange hover:underline"
    >
      <Plus className="h-3 w-3" /> {label}
    </button>
  );
}

export default function BoostContentPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<BoostContent>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("boost_page_content" as any)
        .select("content")
        .eq("id", BOOST_CONTENT_ID)
        .maybeSingle();
      if (error) toast.error(error.message);
      const content = (data as any)?.content;
      if (content) setDraft({ ...DEFAULTS, ...(content as BoostContent) });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("boost_page_content" as any)
      .update({ content: draft })
      .eq("id", BOOST_CONTENT_ID);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("BOOST page content saved");
  };

  // ---- generic section setters ----
  const setLegacy = (patch: Partial<BoostContent["legacy"]>) =>
    setDraft((d) => ({ ...d, legacy: { ...d.legacy, ...patch } }));

  const es = draft.examStructure;
  const setEs = (patch: Partial<BoostContent["examStructure"]>) =>
    setDraft((d) => ({ ...d, examStructure: { ...d.examStructure, ...patch } }));

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading BOOST page content…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-bansal-orange" />
        <h2 className="font-bold text-foreground">BOOST Page Content</h2>
        <span className="text-xs text-muted-foreground">
          Edit the public /boost page sections. Use <code className="font-mono">{"{price}"}</code> where the live
          registration price should appear.
        </span>
      </div>

      <div className="space-y-3">
        {/* Legacy */}
        <Section title="Legacy of Excellence">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className={LABEL}>Badge</span>
              <input className={INPUT} value={draft.legacy.badge} onChange={(e) => setLegacy({ badge: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className={LABEL}>Heading</span>
              <input className={INPUT} value={draft.legacy.heading} onChange={(e) => setLegacy({ heading: e.target.value })} />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className={LABEL}>Body paragraph</span>
            <textarea className={INPUT} rows={4} value={draft.legacy.body} onChange={(e) => setLegacy({ body: e.target.value })} />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className={LABEL}>Callout title</span>
              <input className={INPUT} value={draft.legacy.calloutTitle} onChange={(e) => setLegacy({ calloutTitle: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className={LABEL}>Callout body</span>
              <textarea className={INPUT} rows={3} value={draft.legacy.calloutBody} onChange={(e) => setLegacy({ calloutBody: e.target.value })} />
            </label>
          </div>
        </Section>

        {/* Benefits */}
        <Section title="Benefits of BOOST">
          {draft.benefits.map((b, i) => (
            <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={LABEL}>Benefit {i + 1}</span>
                <RowTools
                  onUp={() => setDraft((d) => ({ ...d, benefits: move(d.benefits, i, -1) }))}
                  onDown={() => setDraft((d) => ({ ...d, benefits: move(d.benefits, i, 1) }))}
                  onRemove={() => setDraft((d) => ({ ...d, benefits: d.benefits.filter((_, j) => j !== i) }))}
                />
              </div>
              <div className="grid sm:grid-cols-[160px_1fr] gap-2">
                <select
                  className={INPUT}
                  value={b.icon}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, benefits: d.benefits.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)) }))
                  }
                >
                  {Object.keys(ICON_MAP).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <input
                  className={INPUT}
                  placeholder="Title"
                  value={b.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, benefits: d.benefits.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) }))
                  }
                />
              </div>
              <textarea
                className={INPUT}
                rows={2}
                placeholder="Description"
                value={b.desc}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, benefits: d.benefits.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) }))
                }
              />
            </div>
          ))}
          <AddButton
            label="Add benefit"
            onClick={() => setDraft((d) => ({ ...d, benefits: [...d.benefits, { icon: "Trophy", title: "", desc: "" }] }))}
          />
        </Section>

        {/* Exam Structure */}
        <Section title="Exam Structure (BOOST Details)">
          <label className="space-y-1 block">
            <span className={LABEL}>First column header</span>
            <input className={INPUT} value={es.paramHeader} onChange={(e) => setEs({ paramHeader: e.target.value })} />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={LABEL}>Exam columns</span>
              <AddButton
                label="Add column"
                onClick={() =>
                  setEs({
                    columns: [...es.columns, "New Column"],
                    rows: es.rows.map((r) => (isSpanRow(r) ? r : { ...r, cells: [...r.cells, ""] })),
                  })
                }
              />
            </div>
            {es.columns.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <input
                  className={INPUT}
                  value={c}
                  onChange={(e) => setEs({ columns: es.columns.map((x, j) => (j === ci ? e.target.value : x)) })}
                />
                <button
                  type="button"
                  onClick={() =>
                    setEs({
                      columns: es.columns.filter((_, j) => j !== ci),
                      rows: es.rows.map((r) => (isSpanRow(r) ? r : { ...r, cells: r.cells.filter((_, j) => j !== ci) })),
                    })
                  }
                  className="p-2 text-muted-foreground hover:text-red-600"
                  aria-label="Remove column"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <span className={LABEL}>Rows</span>
            {es.rows.map((row, ri) => {
              const span = isSpanRow(row);
              const setRow = (next: ExamRow) => setEs({ rows: es.rows.map((r, j) => (j === ri ? next : r)) });
              return (
                <div key={ri} className="rounded-lg border border-border/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      className={INPUT}
                      placeholder="Row label"
                      value={row.label}
                      onChange={(e) => setRow({ ...row, label: e.target.value } as ExamRow)}
                    />
                    <RowTools
                      onUp={() => setEs({ rows: move(es.rows, ri, -1) })}
                      onDown={() => setEs({ rows: move(es.rows, ri, 1) })}
                      onRemove={() => setEs({ rows: es.rows.filter((_, j) => j !== ri) })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={span}
                      onChange={() =>
                        setRow(
                          span
                            ? { label: row.label, cells: es.columns.map(() => "") }
                            : { label: row.label, span: "" },
                        )
                      }
                    />
                    Spans all columns
                  </label>
                  {span ? (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input
                        className={INPUT}
                        placeholder="Cell text"
                        value={row.span}
                        onChange={(e) => setRow({ ...row, span: e.target.value })}
                      />
                      <input
                        className={INPUT}
                        placeholder="Optional link URL (https://…)"
                        value={row.href ?? ""}
                        onChange={(e) => setRow({ ...row, href: e.target.value || undefined })}
                      />
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-3 gap-2">
                      {row.cells.map((cell, ci) => (
                        <input
                          key={ci}
                          className={INPUT}
                          placeholder={es.columns[ci] ?? `Col ${ci + 1}`}
                          value={cell}
                          onChange={(e) => setRow({ ...row, cells: row.cells.map((x, j) => (j === ci ? e.target.value : x)) })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <AddButton
              label="Add row"
              onClick={() => setEs({ rows: [...es.rows, { label: "", cells: es.columns.map(() => "") }] })}
            />
          </div>

          <label className="space-y-1 block">
            <span className={LABEL}>Legend</span>
            <textarea className={INPUT} rows={2} value={es.legend} onChange={(e) => setEs({ legend: e.target.value })} />
          </label>
          <label className="space-y-1 block">
            <span className={LABEL}>Marking scheme</span>
            <textarea className={INPUT} rows={2} value={es.markingScheme} onChange={(e) => setEs({ markingScheme: e.target.value })} />
          </label>
        </Section>

        {/* Scholarship Grid */}
        <Section title="Scholarship Grid">
          <p className="text-xs text-muted-foreground">Sr.No and the two-column split are automatic.</p>
          {draft.scholarshipGrid.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
              <input
                className={INPUT}
                placeholder="Score in BOOST"
                value={r.score}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, scholarshipGrid: d.scholarshipGrid.map((x, j) => (j === i ? { ...x, score: e.target.value } : x)) }))
                }
              />
              <input
                className={INPUT}
                placeholder="% Scholarship"
                value={r.scholarship}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, scholarshipGrid: d.scholarshipGrid.map((x, j) => (j === i ? { ...x, scholarship: e.target.value } : x)) }))
                }
              />
              <RowTools
                onUp={() => setDraft((d) => ({ ...d, scholarshipGrid: move(d.scholarshipGrid, i, -1) }))}
                onDown={() => setDraft((d) => ({ ...d, scholarshipGrid: move(d.scholarshipGrid, i, 1) }))}
                onRemove={() => setDraft((d) => ({ ...d, scholarshipGrid: d.scholarshipGrid.filter((_, j) => j !== i) }))}
              />
            </div>
          ))}
          <AddButton
            label="Add scholarship row"
            onClick={() => setDraft((d) => ({ ...d, scholarshipGrid: [...d.scholarshipGrid, { score: "", scholarship: "" }] }))}
          />
        </Section>

        {/* Notes */}
        <Section title="Important Instructions & Notes">
          {draft.notes.map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2 w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
              <textarea
                className={INPUT}
                rows={2}
                value={n}
                onChange={(e) => setDraft((d) => ({ ...d, notes: d.notes.map((x, j) => (j === i ? e.target.value : x)) }))}
              />
              <RowTools
                onUp={() => setDraft((d) => ({ ...d, notes: move(d.notes, i, -1) }))}
                onDown={() => setDraft((d) => ({ ...d, notes: move(d.notes, i, 1) }))}
                onRemove={() => setDraft((d) => ({ ...d, notes: d.notes.filter((_, j) => j !== i) }))}
              />
            </div>
          ))}
          <AddButton label="Add note" onClick={() => setDraft((d) => ({ ...d, notes: [...d.notes, ""] }))} />
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          {draft.timeline.map((t, i) => (
            <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={LABEL}>Step {i + 1}</span>
                <RowTools
                  onUp={() => setDraft((d) => ({ ...d, timeline: move(d.timeline, i, -1) }))}
                  onDown={() => setDraft((d) => ({ ...d, timeline: move(d.timeline, i, 1) }))}
                  onRemove={() => setDraft((d) => ({ ...d, timeline: d.timeline.filter((_, j) => j !== i) }))}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  className={INPUT}
                  placeholder="Phase (e.g. Registration)"
                  value={t.phase}
                  onChange={(e) => setDraft((d) => ({ ...d, timeline: d.timeline.map((x, j) => (j === i ? { ...x, phase: e.target.value } : x)) }))}
                />
                <input
                  className={INPUT}
                  placeholder="Date (e.g. Open Now)"
                  value={t.date}
                  onChange={(e) => setDraft((d) => ({ ...d, timeline: d.timeline.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)) }))}
                />
              </div>
              <textarea
                className={INPUT}
                rows={2}
                placeholder="Description (supports {price})"
                value={t.desc}
                onChange={(e) => setDraft((d) => ({ ...d, timeline: d.timeline.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) }))}
              />
            </div>
          ))}
          <AddButton
            label="Add timeline step"
            onClick={() => setDraft((d) => ({ ...d, timeline: [...d.timeline, { phase: "", date: "", desc: "" }] }))}
          />
        </Section>

        {/* FAQs */}
        <Section title="FAQs">
          {draft.faqs.map((f, i) => (
            <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={LABEL}>FAQ {i + 1}</span>
                <RowTools
                  onUp={() => setDraft((d) => ({ ...d, faqs: move(d.faqs, i, -1) }))}
                  onDown={() => setDraft((d) => ({ ...d, faqs: move(d.faqs, i, 1) }))}
                  onRemove={() => setDraft((d) => ({ ...d, faqs: d.faqs.filter((_, j) => j !== i) }))}
                />
              </div>
              <input
                className={INPUT}
                placeholder="Question"
                value={f.q}
                onChange={(e) => setDraft((d) => ({ ...d, faqs: d.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) }))}
              />
              <textarea
                className={INPUT}
                rows={2}
                placeholder="Answer"
                value={f.a}
                onChange={(e) => setDraft((d) => ({ ...d, faqs: d.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) }))}
              />
            </div>
          ))}
          <AddButton label="Add FAQ" onClick={() => setDraft((d) => ({ ...d, faqs: [...d.faqs, { q: "", a: "" }] }))} />
        </Section>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-bansal-orange text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save page content
        </button>
      </div>
    </div>
  );
}
