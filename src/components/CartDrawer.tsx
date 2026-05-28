import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CartDrawer = ({ open, onClose }: Props) => {
  const { cart, updateCartQty, removeFromCart } = useAppStore();
  const subtotal = cart.reduce((s, c) => s + Number(c.price) * c.quantity, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 max-w-[90vw] bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2 font-bold">
            <ShoppingCart className="h-5 w-5 text-primary" /> Your Cart ({cart.length})
          </div>
          <button onClick={onClose} aria-label="Close cart" className="p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Your cart is empty. Browse the{" "}
              <Link to="/e-store" onClick={onClose} className="text-primary underline">
                e-store
              </Link>
              .
            </div>
          ) : (
            cart.map((c) => (
              <div key={`${c.type}-${c.id}`} className="flex gap-3 rounded-xl border border-border p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
                  {c.cover_url ? (
                    <img src={c.cover_url} alt={c.title} className="h-full w-full object-contain p-1" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    {c.type === "pack" ? "Module Pack" : "Book"}
                  </p>
                  <p className="text-sm font-semibold leading-snug line-clamp-2">{c.title}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-md border border-border">
                      <button
                        onClick={() => updateCartQty(c.type, c.id, c.quantity - 1)}
                        className="px-2 py-1"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-sm font-bold">{c.quantity}</span>
                      <button
                        onClick={() => updateCartQty(c.type, c.id, c.quantity + 1)}
                        className="px-2 py-1"
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-sm font-black">₹{(Number(c.price) * c.quantity).toLocaleString()}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(c.type, c.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-border p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold">₹{subtotal.toLocaleString()}</span>
            </div>
            <Link
              to="/e-store/checkout"
              onClick={onClose}
              className="block rounded-xl bg-[hsl(var(--bansal-orange))] py-3 text-center font-bold text-white hover:bg-[hsl(var(--bansal-orange))]/90"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
