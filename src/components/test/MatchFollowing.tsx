import { CheckCircle2, XCircle } from "lucide-react";
import MathRenderer from "@/components/MathRenderer";

export type MatchItem = { key: string; text: string };

type Props = {
  /** Column A items (left side, keys A/B/C/D…) */
  left: MatchItem[];
  /** Column B options (right side, indexed) */
  options: { id: number; text: string }[];
  optionImages?: (string | null)[];
  /** Current user answer: { A: "Q", B: "S", ... } — undefined keys mean "unanswered". */
  value: Record<string, string>;
  onChange?: (next: Record<string, string>) => void;
  /** When provided, renders read-only with correctness ticks. */
  correctMap?: Record<string, string>;
  /** When true, dropdowns are disabled. */
  disabled?: boolean;
};

const labelForOption = (i: number) => String.fromCharCode(80 + i); // P, Q, R, S…

const MatchFollowing = ({
  left,
  options,
  optionImages,
  value,
  onChange,
  correctMap,
  disabled,
}: Props) => {
  const review = !!correctMap;
  const labels = options.map((_, i) => labelForOption(i));

  const setPair = (leftKey: string, rightLabel: string) => {
    if (!onChange) return;
    const next = { ...value };
    if (!rightLabel) delete next[leftKey];
    else next[leftKey] = rightLabel;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Column B reference (shown above on mobile, side on desktop) */}
        <div className="order-2 lg:order-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Column B
          </p>
          <ul className="space-y-1.5">
            {options.map((opt, i) => (
              <li key={opt.id} className="flex items-start gap-2 text-sm">
                <span className="font-bold w-5 shrink-0 text-neutral-700">
                  ({labels[i]})
                </span>
                <div className="flex-1">
                  <MathRenderer content={opt.text} inline />
                  {optionImages?.[i] && (
                    <img
                      src={optionImages[i] || ""}
                      alt=""
                      className="mt-1 max-h-24 rounded border border-neutral-200"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Column A with pair pickers */}
        <div className="order-1 lg:order-1 rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Column A — pick a match for each
          </p>
          <ul className="space-y-2">
            {left.map((item) => {
              const selected = value[item.key] ?? "";
              const correct = correctMap?.[item.key];
              const isRight = review && selected && correct && selected === correct;
              const isWrong = review && selected && correct && selected !== correct;
              return (
                <li
                  key={item.key}
                  className={`flex items-start gap-2 rounded-md border p-2 ${
                    isRight
                      ? "border-emerald-300 bg-emerald-50"
                      : isWrong
                        ? "border-rose-300 bg-rose-50"
                        : "border-neutral-200 bg-white"
                  }`}
                >
                  <span className="font-bold w-5 shrink-0 text-neutral-700 mt-1">
                    ({item.key})
                  </span>
                  <div className="flex-1 text-sm">
                    <MathRenderer content={item.text} inline />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      disabled={disabled || review}
                      value={selected}
                      onChange={(e) => setPair(item.key, e.target.value)}
                      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-70"
                    >
                      <option value="">—</option>
                      {labels.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    {review && correct && (
                      <span
                        className={`text-[10px] font-bold ${
                          isRight ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {isRight ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="inline-flex items-center gap-0.5">
                            <XCircle className="h-4 w-4" />
                            <span>({correct})</span>
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {!review && (
        <p className="text-[10px] text-neutral-400 text-center">
          Pick one Column B label for every Column A entry. Leave blank to skip a row.
        </p>
      )}
    </div>
  );
};

export default MatchFollowing;
