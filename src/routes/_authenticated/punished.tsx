import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ReportCard, type MisuseReport } from "@/components/report-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/punished")({
  component: PunishedPage,
});

function PunishedPage() {
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<MisuseReport | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["reports", "punished"],
    queryFn: async () => {
      const { data, error } = await supabase.from("misuse_reports" as any)
        .select("*").eq("status", "punished").eq("is_deleted", false)
        .order("punished_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MisuseReport[];
    },
  });

  const restore = useMutation({
    mutationFn: async (r: MisuseReport) => {
      const { error } = await supabase.from("misuse_reports" as any)
        .update({ status: "active", punished_at: null }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report restored");
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const permaDelete = useMutation({
    mutationFn: async (r: MisuseReport) => {
      const { error } = await supabase.from("misuse_reports" as any).delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report permanently deleted");
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Students marked as punished appear here. You can restore them to the active list or delete permanently.
      </p>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <ShieldAlert className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">No punished reports</h3>
            <p className="text-sm text-muted-foreground">When you punish a report, it will land here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              variant="punished"
              onRestore={(rr) => restore.mutate(rr)}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All data for this report will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete) permaDelete.mutate(pendingDelete); setPendingDelete(null); }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
