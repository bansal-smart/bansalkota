import { useEffect, useMemo, useState } from "react";
import { Inbox, Loader2, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type Lead = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  class_level: string | null;
  city: string | null;
  message: string | null;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

const STATUSES = ["new", "contacted", "converted", "discarded"];

export default function AdminLandingLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<Lead | null>(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [savingRow, setSavingRow] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("landing_page_leads" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast.error(error.message);
    setLeads((data as unknown as Lead[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (open) {
      setDraftStatus(open.status);
      setDraftNotes(open.notes || "");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const lq = debouncedQ.trim().toLowerCase();
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (!lq) return true;
      return (
        l.full_name.toLowerCase().includes(lq) ||
        l.phone.toLowerCase().includes(lq) ||
        (l.email || "").toLowerCase().includes(lq) ||
        (l.city || "").toLowerCase().includes(lq) ||
        (l.utm_campaign || "").toLowerCase().includes(lq)
      );
    });
  }, [leads, debouncedQ, status]);

  const saveRow = async () => {
    if (!open) return;
    setSavingRow(true);
    const { error } = await supabase
      .from("landing_page_leads" as any)
      .update({ status: draftStatus, notes: draftNotes })
      .eq("id", open.id);
    setSavingRow(false);
    if (error) return toast.error(error.message);
    toast.success("Lead updated");
    setOpen(null);
    load();
  };

  const exportCSV = () => {
    const headers = ["created_at","full_name","phone","email","class_level","city","status","utm_source","utm_medium","utm_campaign","message","notes"];
    const rows = filtered.map((l) => headers.map((h) => `"${String((l as any)[h] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `landing-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    STATUSES.forEach((s) => (c[s] = leads.filter((l) => l.status === s).length));
    return c;
  }, [leads]);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Inbox className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Campaign Leads</h1>
            <p className="text-sm text-muted-foreground">Leads captured from /new landing page</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name, phone, email, city, campaign…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
              status === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
            }`}
          >
            {s} <span className="opacity-70">({counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No leads yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setOpen(l)}
                  className="cursor-pointer border-t border-border hover:bg-muted/40"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-semibold">{l.full_name}</td>
                  <td className="px-3 py-2">{l.phone}</td>
                  <td className="px-3 py-2">{l.email || "—"}</td>
                  <td className="px-3 py-2">{l.class_level || "—"}</td>
                  <td className="px-3 py-2">{l.city || "—"}</td>
                  <td className="px-3 py-2 text-xs">{l.utm_campaign || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      l.status === "new" ? "bg-primary/15 text-primary" :
                      l.status === "contacted" ? "bg-blue-500/15 text-blue-600" :
                      l.status === "converted" ? "bg-green-500/15 text-green-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.full_name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <Row k="Phone" v={open.phone} />
                <Row k="Email" v={open.email} />
                <Row k="Class" v={open.class_level} />
                <Row k="City" v={open.city} />
                <Row k="Source" v={open.source} />
                <Row k="UTM source" v={open.utm_source} />
                <Row k="UTM medium" v={open.utm_medium} />
                <Row k="UTM campaign" v={open.utm_campaign} />
                <Row k="Received" v={new Date(open.created_at).toLocaleString()} />
                {open.message && (
                  <div>
                    <div className="text-xs font-bold uppercase text-muted-foreground">Message</div>
                    <p className="mt-1 rounded-md bg-muted p-2">{open.message}</p>
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold uppercase text-muted-foreground">Status</div>
                  <select
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-muted-foreground">Internal notes</div>
                  <Textarea rows={3} value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
                </div>
                <Button onClick={saveRow} disabled={savingRow} className="w-full">
                  {savingRow ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className="text-right">{v || "—"}</span>
    </div>
  );
}
