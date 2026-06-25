import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Inbox, Search, Loader2, Download, Archive, Trash2, CheckCircle2, CreditCard, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";
import { exportCsv } from "@/lib/exportCsv";

type Row = {
  id: string;
  course_id: string | null;
  course_name: string;
  course_price: number | null;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  parent_phone: string | null;
  class_level: string | null;
  city: string | null;
  state: string | null;
  preferred_centre_id: string | null;
  message: string | null;
  payment_status: string;
  payment_order_id: string | null;
  payment_id: string | null;
  paid_at: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

const paymentStyle: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  initiated: "bg-primary/15 text-primary border-primary/30",
  paid: "bg-secondary/15 text-secondary border-secondary/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusStyle: Record<string, string> = {
  new: "bg-warning/15 text-warning border-warning/30",
  contacted: "bg-primary/15 text-primary border-primary/30",
  converted: "bg-secondary/15 text-secondary border-secondary/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const AdminCourseEnquiriesPage = () => {
  const { isSuperAdmin } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [active, setActive] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("course_enquiries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (paymentFilter !== "all" && r.payment_status !== paymentFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.course_name.toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, paymentFilter, statusFilter]);

  const { paged, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 20);

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.payment_status === "pending" || r.payment_status === "initiated").length,
    paid: rows.filter((r) => r.payment_status === "paid").length,
    failed: rows.filter((r) => r.payment_status === "failed").length,
  }), [rows]);

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("course_enquiries").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (active?.id === id) setActive({ ...active, ...patch });
    toast.success("Updated");
  };

  const markPaid = (id: string) =>
    update(id, {
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      status: "converted",
    });

  const remove = async (r: Row) => {
    const ok = await confirm({
      title: `Delete enquiry from ${r.full_name}?`,
      description: "This will permanently remove the enquiry. This cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const { error } = await supabase.from("course_enquiries").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    if (active?.id === r.id) setActive(null);
    toast.success("Deleted");
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {ConfirmDialog}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground">Course Enquiries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every "Enroll Now" submission is captured here — even if the student abandoned payment.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportCsv("course-enquiries", filtered, [
              { key: "created_at", label: "Submitted", value: (r) => format(new Date(r.created_at), "yyyy-MM-dd HH:mm") },
              { key: "full_name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "course_name", label: "Course" },
              { key: "course_price", label: "Price" },
              { key: "class_level", label: "Class" },
              { key: "city", label: "City" },
              { key: "state", label: "State" },
              { key: "payment_status", label: "Payment" },
              { key: "status", label: "Status" },
              { key: "message", label: "Message" },
            ])
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV ({filtered.length})
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground", icon: Inbox },
          { label: "Pending", value: stats.pending, color: "text-warning", icon: Clock },
          { label: "Paid", value: stats.paid, color: "text-secondary", icon: CheckCircle2 },
          { label: "Failed", value: stats.failed, color: "text-destructive", icon: AlertCircle },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`mt-1 text-2xl font-black font-display ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone, course, city"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full md:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="initiated">Initiated</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Archive className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-semibold text-foreground">No course enquiries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setActive(r)}
                    className="border-t border-border align-top cursor-pointer hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd MMM, HH:mm")}</td>
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{r.full_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="truncate max-w-[180px]">{r.email}</div>
                      <div>{r.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[220px]">
                      <div className="line-clamp-2 text-foreground">{r.course_name}</div>
                      {r.course_price != null && (
                        <div className="text-muted-foreground">₹{Number(r.course_price).toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{r.class_level || "—"}</td>
                    <td className="px-4 py-3 text-xs">{r.city || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={paymentStyle[r.payment_status] || ""}>{r.payment_status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusStyle[r.status] || ""}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>{active.full_name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email" value={active.email} />
                  <Field label="Phone" value={active.phone} />
                  <Field label="Class" value={active.class_level || "—"} />
                  <Field label="City" value={active.city || "—"} />
                  <Field label="State" value={active.state || "—"} />
                  <Field label="Submitted" value={format(new Date(active.created_at), "dd MMM yyyy, HH:mm")} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Course</p>
                  <p className="font-medium text-foreground">{active.course_name}</p>
                  {active.course_price != null && (
                    <p className="text-xs text-muted-foreground">₹{Number(active.course_price).toLocaleString()}</p>
                  )}
                </div>
                {active.message && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Message</p>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap">
                      {active.message}
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Payment</span>
                    <Badge variant="outline" className={paymentStyle[active.payment_status]}>{active.payment_status}</Badge>
                  </div>
                  {active.payment_order_id && (
                    <p className="text-[11px] text-muted-foreground">Order: {active.payment_order_id}</p>
                  )}
                  {active.paid_at && (
                    <p className="text-[11px] text-muted-foreground">Paid: {format(new Date(active.paid_at), "dd MMM yyyy, HH:mm")}</p>
                  )}
                  {active.payment_status !== "paid" && (
                    <Button size="sm" className="w-full" onClick={() => markPaid(active.id)}>
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Mark as paid (manual)
                    </Button>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lead status</p>
                  <Select value={active.status} onValueChange={(v) => update(active.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Internal notes</p>
                  <Textarea
                    rows={4}
                    defaultValue={active.admin_notes ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (active.admin_notes ?? "")) update(active.id, { admin_notes: v });
                    }}
                    placeholder="Add an internal note (saved on blur)"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setActive(null)}>Close</Button>
                  {isSuperAdmin && (
                    <Button variant="destructive" onClick={() => remove(active)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium text-foreground break-all">{value}</p>
  </div>
);

export default AdminCourseEnquiriesPage;
