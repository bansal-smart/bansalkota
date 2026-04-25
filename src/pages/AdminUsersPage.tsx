import { useState } from "react";
import { Search, UserPlus, Download, MoreHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";

const allUsers = [
  { id: 1, name: "Aditya Rajan", email: "aditya@gmail.com", phone: "+91 98765 43210", role: "student", plan: "Pro", country: "India", joined: "2025-12-01" },
  { id: 2, name: "Ishita Bansal", email: "ishita@gmail.com", phone: "+91 87654 32109", role: "student", plan: "Elite", country: "India", joined: "2025-11-15" },
  { id: 3, name: "Vikram Thapar", email: "vikram.t@arke.pro", phone: "+91 76543 21098", role: "teacher", plan: "Pro", country: "India", joined: "2025-06-01" },
  { id: 4, name: "Admin User", email: "admin@arke.pro", phone: "+91 99999 00000", role: "admin", plan: "Elite", country: "India", joined: "2025-01-01" },
  { id: 5, name: "Divya Nair", email: "divya@gmail.com", phone: "+971 50 123 4567", role: "student", plan: "Free", country: "Dubai", joined: "2026-01-10" },
  { id: 6, name: "Saurabh Pillai", email: "saurabh@outlook.com", phone: "+91 65432 10987", role: "student", plan: "Pro", country: "India", joined: "2026-02-14" },
  { id: 7, name: "Meghna Joshi", email: "meghna@arke.pro", phone: "+91 54321 09876", role: "teacher", plan: "Pro", country: "India", joined: "2025-08-20" },
  { id: 8, name: "Harsh Agarwal", email: "harsh@gmail.com", phone: "+91 43210 98765", role: "student", plan: "Free", country: "India", joined: "2026-03-01" },
];

const roleBadge = (role: string) => {
  const styles: Record<string, string> = { student: "bg-secondary/10 text-secondary", teacher: "bg-primary/10 text-primary", admin: "bg-destructive/10 text-destructive" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${styles[role]}`}>{role}</span>;
};

const planBadge = (plan: string) => {
  const styles: Record<string, string> = { Free: "bg-muted text-muted-foreground", Pro: "bg-primary/10 text-primary", Elite: "bg-accent/20 text-accent" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[plan]}`}>{plan}</span>;
};

const AdminUsersPage = () => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [drawerUser, setDrawerUser] = useState<typeof allUsers[0] | null>(null);

  const filtered = allUsers.filter(u => {
    if (filter !== "all" && u.role !== filter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-in-up">
        <h1 className="text-lg font-bold text-foreground">Users</h1>
        <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-2 text-xs font-semibold text-primary-foreground"><UserPlus className="h-3.5 w-3.5" /> Invite User</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2">
          {["all", "student", "teacher", "admin"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-2 text-xs font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground"}`}>{f === "all" ? "All" : `${f}s`}</button>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
          <span className="text-xs font-medium text-foreground">{selected.length} selected</span>
          <button className="rounded-lg bg-background border border-border px-3 py-1 text-[10px] font-medium text-muted-foreground flex items-center gap-1"><Download className="h-3 w-3" /> Export CSV</button>
          <button className="rounded-lg bg-background border border-border px-3 py-1 text-[10px] font-medium text-muted-foreground">Send Notification</button>
          <button className="rounded-lg bg-background border border-border px-3 py-1 text-[10px] font-medium text-destructive">Suspend</button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-x-auto animate-fade-in-up">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="p-3"><input type="checkbox" className="rounded" onChange={(e) => setSelected(e.target.checked ? filtered.map(u => u.id) : [])} checked={selected.length === filtered.length && filtered.length > 0} /></th>
              <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Plan</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Country</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-background/50 cursor-pointer" onClick={() => setDrawerUser(u)}>
                <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded" checked={selected.includes(u.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, u.id] : selected.filter(id => id !== u.id))} /></td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-[10px] font-bold text-primary shrink-0">{u.name.split(' ').map(n => n[0]).join('')}</div>
                    <span className="font-medium text-foreground">{u.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                <td className="p-3">{roleBadge(u.role)}</td>
                <td className="p-3 hidden md:table-cell">{planBadge(u.plan)}</td>
                <td className="p-3 text-muted-foreground hidden lg:table-cell">{u.country}</td>
                <td className="p-3 text-muted-foreground hidden lg:table-cell">{u.joined}</td>
                <td className="p-3"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Showing {filtered.length} of {allUsers.length} users</span>
        <div className="flex gap-1">
          <button className="rounded-lg border border-border p-2 text-muted-foreground"><ChevronLeft className="h-3.5 w-3.5" /></button>
          <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">1</button>
          <button className="rounded-lg border border-border p-2 text-muted-foreground"><ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {drawerUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerUser(null)} />
          <div className="relative w-full max-w-sm bg-card shadow-xl border-l border-border overflow-y-auto animate-slide-in-right">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">User Details</h2>
              <button onClick={() => setDrawerUser(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold text-primary">{drawerUser.name.split(' ').map(n => n[0]).join('')}</div>
                <div>
                  <p className="text-sm font-bold text-foreground">{drawerUser.name}</p>
                  <p className="text-xs text-muted-foreground">{drawerUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: "Role", value: drawerUser.role }, { label: "Plan", value: drawerUser.plan }, { label: "Phone", value: drawerUser.phone }, { label: "Country", value: drawerUser.country }, { label: "Joined", value: drawerUser.joined }].map((f) => (
                  <div key={f.label}>
                    <p className="text-[10px] text-muted-foreground uppercase">{f.label}</p>
                    <p className="text-xs font-medium text-foreground capitalize">{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground">Edit Role</button>
                <button className="flex-1 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive">Suspend</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
