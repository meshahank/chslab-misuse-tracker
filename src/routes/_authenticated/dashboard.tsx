import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Star, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReportCard, type MisuseReport } from "@/components/report-card";
import { ReportFormDialog, type ReportFormValues } from "@/components/report-form-dialog";


export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

async function fetchActiveReports(): Promise<MisuseReport[]> {
  const { data, error } = await supabase
    .from("misuse_reports" as any)
    .select("*")
    .eq("status", "active")
    .eq("is_deleted", false)
    .order("important", { ascending: false })
    .order("incident_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

function DashboardPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", "active"],
    queryFn: fetchActiveReports,
  });

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "important" | "mine">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MisuseReport | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MisuseReport | null>(null);
  const [pendingPunish, setPendingPunish] = useState<MisuseReport | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (filter === "important" && !r.important) return false;
      if (filter === "mine" && r.reported_by !== me?.user.id) return false;
      if (!q) return true;
      return (
        r.student_name.toLowerCase().includes(q) ||
        r.student_class.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.reported_by_name.toLowerCase().includes(q)
      );
    });
  }, [reports, query, filter, me?.user.id]);

  const upsert = useMutation({
    mutationFn: async (values: ReportFormValues) => {
      if (!me) throw new Error("Not signed in");
      const payload = {
        student_name: values.student_name,
        student_class: values.student_class,
        description: values.description,
        incident_at: new Date(values.incident_at).toISOString(),
        important: values.important,
      };
      if (editing) {
        const { error } = await supabase.from("misuse_reports" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("misuse_reports" as any).insert({
          ...payload,
          reported_by: me.user.id,
          reported_by_name: me.profile?.full_name ?? me.profile?.username ?? "Admin",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Report updated" : "Report added");
      setFormOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteReport = useMutation({
    mutationFn: async (r: MisuseReport) => {
      const { error } = await supabase.from("misuse_reports" as any)
        .update({ is_deleted: true }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report deleted");
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const punish = useMutation({
    mutationFn: async (r: MisuseReport) => {
      const { error } = await supabase.from("misuse_reports" as any)
        .update({ status: "punished", punished_at: new Date().toISOString() })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as punished");
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importantCount = reports.filter((r) => r.important).length;

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Active reports" value={reports.length} accent="primary" />
        <SummaryTile label="Important" value={importantCount} accent="warning" icon={<Star className="h-4 w-4" />} />
        <SummaryTile label="Your reports" value={reports.filter((r) => r.reported_by === me?.user.id).length} accent="accent" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search students, classes, description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-1 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reports</SelectItem>
              <SelectItem value="important">Important only</SelectItem>
              <SelectItem value="mine">My reports</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Misuse
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => { setEditing(null); setFormOpen(true); }} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onEdit={(rr) => { setEditing(rr); setFormOpen(true); }}
              onDelete={setPendingDelete}
              onPunish={setPendingPunish}
            />
          ))}
        </div>
      )}

      <ReportFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        initial={editing}
        submitting={upsert.isPending}
        onSubmit={(v) => upsert.mutateAsync(v)}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be moved out of the active list. This can be undone later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (pendingDelete) deleteReport.mutate(pendingDelete); setPendingDelete(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingPunish} onOpenChange={(o) => !o && setPendingPunish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as punished?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the report to the Punished section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (pendingPunish) punish.mutate(pendingPunish); setPendingPunish(null); }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryTile({
  label, value, accent, icon,
}: { label: string; value: number; accent: "primary" | "warning" | "accent"; icon?: React.ReactNode }) {
  const tone: Record<string, string> = {
    primary: "from-primary/20 to-primary/0 text-primary",
    warning: "from-warning/25 to-warning/0 text-warning-foreground",
    accent: "from-[oklch(0.7_0.18_200)]/25 to-transparent text-[oklch(0.7_0.18_200)]",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl transition-all hover:border-border">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${tone[accent]} blur-2xl opacity-70`} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl border border-hairline bg-background/40 ${tone[accent].split(" ").pop()}`}>
          {icon ?? <span className="text-base font-semibold">#</span>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/70 bg-card/40 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-transparent ring-1 ring-inset ring-hairline">
          <Plus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold">No reports yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add the first misuse report to get started.</p>
        </div>
        <Button onClick={onAdd} className="mt-2 gap-2">
          <Plus className="h-4 w-4" /> Add Misuse
        </Button>
      </div>
    </div>
  );
}

