import { useEffect, useMemo, useState } from "react";
import { FileBarChart, Download, Search, Loader2 } from "lucide-react";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { fetchStudentReport } from "@/lib/studentReport";
import { fetchNonStaffProfiles, supabaseErrorMessage } from "@/lib/studentListQuery";

type StudentRow = {
  user_id: string;
  full_name: string | null;
  target_exam: string | null;
  class_level: string | null;
};

const errorMessage = (e: unknown) => supabaseErrorMessage(e);

const AdminStudentReportsPage = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedId, setSelectedId] = useState<string>("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Page profiles with .range() and drop staff in memory. A single
        // `.in(user_id, 650 UUIDs)` GET is ~25KB and fails (400 / missing apikey).
        const rows = await fetchNonStaffProfiles<StudentRow>(
          "user_id, full_name, target_exam, class_level",
          { column: "full_name", ascending: true },
        );
        setStudents(rows);
      } catch (e: unknown) {
        toast.error("Failed to load students", { description: errorMessage(e) });
        setStudents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = debouncedSearch.trim().toLowerCase();
    if (!s) return students;
    return students.filter((r) =>
      (r.full_name ?? "").toLowerCase().includes(s) ||
      (r.target_exam ?? "").toLowerCase().includes(s),
    );
  }, [students, debouncedSearch]);

  async function generate(studentId: string) {
    if (!studentId) {
      toast.error("Pick a student first");
      return;
    }
    setGeneratingId(studentId);
    try {
      const data = await fetchStudentReport(studentId);
      const { downloadStudentReport } = await import("@/lib/studentReportPdf");
      downloadStudentReport(data);
      toast.success("Report downloaded", { description: `${data.student.name} • ${data.tests.attempts} tests` });
    } catch (e: unknown) {
      toast.error("Failed to generate report", { description: errorMessage(e) });
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <FileBarChart className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Report</h1>
          <p className="text-sm text-muted-foreground">
            Generate a parent-friendly, overall academic performance PDF for any student — every test
            attempted (and any missed), segregated by subject.
          </p>
        </div>
      </div>

      {/* Quick generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick generate</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[2fr_auto] md:items-end">
          <div>
            <Label className="mb-1 block">Student</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading…" : "Select a student"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {students.map((s) => (
                  <SelectItem key={s.user_id} value={s.user_id}>
                    {s.full_name || "Unnamed"}
                    {s.target_exam ? ` · ${s.target_exam}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => generate(selectedId)}
            disabled={!selectedId || generatingId === selectedId}
            className="w-full md:w-auto"
          >
            {generatingId === selectedId ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </CardContent>
      </Card>

      {/* All students */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg">All students</CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or exam"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Target exam</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell className="font-medium">{s.full_name || "Unnamed"}</TableCell>
                      <TableCell>{s.class_level || "—"}</TableCell>
                      <TableCell>{s.target_exam || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generate(s.user_id)}
                          disabled={generatingId === s.user_id}
                        >
                          {generatingId === s.user_id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStudentReportsPage;
