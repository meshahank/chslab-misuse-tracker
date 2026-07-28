import { format } from "date-fns";
import { Star, Pencil, Trash2, Gavel, GraduationCap, Clock, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MisuseReport = {
  id: string;
  student_name: string;
  student_class: string;
  description: string;
  incident_at: string;
  important: boolean;
  status: "active" | "punished";
  is_deleted: boolean;
  reported_by: string | null;
  reported_by_name: string;
  punished_at: string | null;
  created_at: string;
};

type Props = {
  report: MisuseReport;
  onEdit?: (r: MisuseReport) => void;
  onDelete?: (r: MisuseReport) => void;
  onPunish?: (r: MisuseReport) => void;
  onRestore?: (r: MisuseReport) => void;
  variant?: "active" | "punished";
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
}

export function ReportCard({ report, onEdit, onDelete, onPunish, onRestore, variant = "active" }: Props) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl transition-all",
        "hover:border-border hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
      )}
    >
      {/* subtle gradient sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px 200px at 0% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 60%)",
        }}
      />
      {/* important side rail */}
      {report.important && (
        <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-warning to-[oklch(0.7_0.2_35)]" />
      )}

      <div className="relative flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent/40 text-[13px] font-semibold text-accent-foreground ring-1 ring-inset ring-hairline">
            {initials(report.student_name)}
          </div>
          <div className="min-w-0">
            <h3 className="font-display truncate text-[15px] font-semibold leading-tight">
              {report.student_name}
            </h3>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              {report.student_class}
            </div>
          </div>
        </div>
        {report.important && (
          <Badge className="gap-1 border-0 bg-warning/15 text-warning-foreground hover:bg-warning/20">
            <Star className="h-3 w-3 fill-current" />
            Important
          </Badge>
        )}
      </div>

      <div className="relative flex-1 px-5">
        <p className="line-clamp-3 rounded-lg border border-border/50 bg-muted/40 p-3 text-sm leading-relaxed text-foreground/90">
          {report.description}
        </p>
      </div>

      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {format(new Date(report.incident_at), "MMM d, yyyy · h:mm a")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserCircle2 className="h-3.5 w-3.5" />
          {report.reported_by_name}
        </span>
      </div>

      <div className="relative flex flex-wrap gap-2 p-5 pt-4">
        {variant === "active" ? (
          <>
            {onPunish && (
              <Button size="sm" onClick={() => onPunish(report)} className="gap-1.5 h-8">
                <Gavel className="h-3.5 w-3.5" /> Punish
              </Button>
            )}
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(report)} className="gap-1.5 h-8">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(report)}
                className="h-8 gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </>
        ) : (
          <>
            {onRestore && (
              <Button size="sm" variant="outline" onClick={() => onRestore(report)} className="h-8">
                Restore
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(report)}
                className="h-8 gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete permanently
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
