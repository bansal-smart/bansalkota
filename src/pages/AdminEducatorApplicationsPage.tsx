import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Briefcase, Check, X, Mail, Phone, Calendar as CalIcon, GraduationCap, Building2, FileText, Video, ExternalLink, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Application = {
  id: string;
  candidate_name: string;
  email: string;
  date_of_birth: string;
  contact_no: string;
  alt_contact_no: string | null;
  subject: string;
  highest_qualification: string;
  other_qualification: string | null;
  current_organization: string | null;
  previous_organization: string | null;
  total_experience: number;
  current_ctc: number | null;
  expected_ctc: number;
  photo_url: string | null;
  resume_url: string | null;
  demo_video_link: string;
  status: string;
  created_at: string;
};

const statusVariants: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  approved: { label: "Approved", className: "bg-secondary/15 text-secondary border-secondary/30" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const AdminEducatorApplicationsPage = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("educator_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load applications", { description: error.message });
    } else {
      setApps((data ?? []) as Application[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("educator_applications")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error(`Could not ${status === "approved" ? "approve" : "reject"}`, { description: error.message });
    } else {
      toast.success(`Application ${status}`);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      if (selected?.id === id) setSelected({ ...selected, status });
    }
    setUpdatingId(null);
  };

  const filtered = apps.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.candidate_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black font-display text-foreground">
            <Briefcase className="h-6 w-6 text-primary" /> Educator Applications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Review, approve, or reject educator applications submitted via the Career page.</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total", value: counts.all, color: "text-primary" },
          { label: "Pending", value: counts.pending, color: "text-warning" },
          { label: "Approved", value: counts.approved, color: "text-secondary" },
          { label: "Rejected", value: counts.rejected, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={`mt-1 text-2xl font-black font-display ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          placeholder="Search by name, email, or subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:max-w-sm"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="md:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-semibold text-foreground">No applications found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {apps.length === 0 ? "Applications submitted via the landing page will appear here." : "Try changing filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const status = statusVariants[a.status] ?? statusVariants.pending;
            return (
              <div key={a.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  {/* Photo + identity */}
                  <div className="flex items-center gap-3 lg:w-72 shrink-0">
                    <Avatar className="h-14 w-14 border-2 border-border">
                      <AvatarImage src={a.photo_url ?? undefined} alt={a.candidate_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                        {a.candidate_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{a.candidate_name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {a.email}
                      </p>
                      <Badge variant="outline" className={`mt-1 ${status.className}`}>{status.label}</Badge>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Subject</p>
                      <p className="font-semibold text-foreground flex items-center gap-1"><GraduationCap className="h-3 w-3 text-primary" />{a.subject}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Experience</p>
                      <p className="font-semibold text-foreground">{a.total_experience} yrs</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expected CTC</p>
                      <p className="font-semibold text-foreground">₹{a.expected_ctc.toLocaleString()}/mo</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Applied</p>
                      <p className="font-semibold text-foreground">{format(new Date(a.created_at), "dd MMM yyyy")}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setSelected(a)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    {a.resume_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={a.resume_url} target="_blank" rel="noreferrer" download>
                          <FileText className="h-3.5 w-3.5" /> Resume
                        </a>
                      </Button>
                    )}
                    {a.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          disabled={updatingId === a.id}
                          onClick={() => updateStatus(a.id, "approved")}
                        >
                          {updatingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={updatingId === a.id}
                          onClick={() => updateStatus(a.id, "rejected")}
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border-2 border-border">
                    <AvatarImage src={selected.photo_url ?? undefined} alt={selected.candidate_name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                      {selected.candidate_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl font-display">{selected.candidate_name}</DialogTitle>
                    <DialogDescription>{selected.subject} educator application</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2 mt-2 text-sm">
                <Field icon={Mail} label="Email" value={selected.email} />
                <Field icon={Phone} label="Contact" value={selected.contact_no} />
                <Field icon={Phone} label="Alt. Contact" value={selected.alt_contact_no || "—"} />
                <Field icon={CalIcon} label="Date of Birth" value={format(new Date(selected.date_of_birth), "dd MMM yyyy")} />
                <Field icon={GraduationCap} label="Highest Qualification" value={selected.highest_qualification} />
                <Field icon={GraduationCap} label="Other Qualification" value={selected.other_qualification || "—"} />
                <Field icon={Building2} label="Current Organization" value={selected.current_organization || "—"} />
                <Field icon={Building2} label="Previous Organization" value={selected.previous_organization || "—"} />
                <Field icon={Briefcase} label="Total Experience" value={`${selected.total_experience} years`} />
                <Field icon={Briefcase} label="Current CTC" value={selected.current_ctc ? `₹${selected.current_ctc.toLocaleString()}/mo` : "—"} />
                <Field icon={Briefcase} label="Expected CTC" value={`₹${selected.expected_ctc.toLocaleString()}/mo`} />
                <Field icon={CalIcon} label="Submitted" value={format(new Date(selected.created_at), "dd MMM yyyy, HH:mm")} />
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {selected.resume_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selected.resume_url} target="_blank" rel="noreferrer" download>
                      <FileText className="h-4 w-4" /> Download Resume
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <a href={selected.demo_video_link} target="_blank" rel="noreferrer">
                    <Video className="h-4 w-4" /> Watch Demo Video <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                {selected.photo_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selected.photo_url} target="_blank" rel="noreferrer">
                      <Eye className="h-4 w-4" /> View Photo
                    </a>
                  </Button>
                )}
              </div>

              {selected.status === "pending" && (
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button
                    variant="destructive"
                    disabled={updatingId === selected.id}
                    onClick={() => updateStatus(selected.id, "rejected")}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  <Button
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    disabled={updatingId === selected.id}
                    onClick={() => updateStatus(selected.id, "approved")}
                  >
                    {updatingId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</p>
    <p className="mt-0.5 font-semibold text-foreground break-words">{value}</p>
  </div>
);

export default AdminEducatorApplicationsPage;
