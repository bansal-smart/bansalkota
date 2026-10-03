import { useEffect, useState } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { previewCoupon, type CouponScope } from "@/lib/cashfree";

type Props = {
  scope: CouponScope;
  subtotal: number;
  disabled?: boolean;
  onApplied: (code: string, discountAmount: number) => void;
  onRemoved: () => void;
};

const CouponInput = ({ scope, subtotal, disabled, onApplied, onRemoved }: Props) => {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [error, setError] = useState("");

  // Re-price the applied coupon if the subtotal changes (e.g. cart quantity edits).
  useEffect(() => {
    if (!applied) return;
    let active = true;
    previewCoupon(applied.code, scope, subtotal).then((res) => {
      if (!active) return;
      if (res.valid) {
        const discount = Number(res.discount_amount) || 0;
        setApplied({ code: applied.code, discount });
        onApplied(applied.code, discount);
      } else {
        setApplied(null);
        setError(res.message);
        onRemoved();
      }
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const apply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setChecking(true);
    setError("");
    const res = await previewCoupon(trimmed, scope, subtotal);
    setChecking(false);
    if (!res.valid) {
      setError(res.message);
      return;
    }
    const discount = Number(res.discount_amount) || 0;
    const normalized = res.code ?? trimmed.toUpperCase();
    setApplied({ code: normalized, discount });
    setCode("");
    onApplied(normalized, discount);
  };

  const remove = () => {
    setApplied(null);
    setError("");
    onRemoved();
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-600/30 bg-green-50 px-3 py-2 text-sm dark:bg-green-950/20">
        <span className="inline-flex items-center gap-1.5 font-semibold text-green-700 dark:text-green-400">
          <Tag className="h-3.5 w-3.5" /> {applied.code} applied — you save ₹{applied.discount.toLocaleString("en-IN")}
        </span>
        <button type="button" onClick={remove} disabled={disabled} aria-label="Remove coupon" className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void apply(); } }}
          placeholder="Coupon code"
          maxLength={40}
          disabled={disabled || checking}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase"
        />
        <button
          type="button"
          onClick={apply}
          disabled={disabled || checking || !code.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          {checking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Apply
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default CouponInput;
