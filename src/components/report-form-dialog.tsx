import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { MisuseReport } from "./report-card";

export type ReportFormValues = {
  student_name: string;
  student_class: string;
  description: string;
  incident_at: string;
  important: boolean;
};

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 16);
}

export function ReportFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: MisuseReport | null;
  onSubmit: (values: ReportFormValues) => Promise<void> | void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<ReportFormValues>({
    student_name: "",
    student_class: "",
    description: "",
    incident_at: toLocalDatetimeInput(new Date().toISOString()),
    important: false,
  });

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? {
              student_name: initial.student_name,
              student_class: initial.student_class,
              description: initial.description,
              incident_at: toLocalDatetimeInput(initial.incident_at),
              important: initial.important,
            }
          : {
              student_name: "",
              student_class: "",
              description: "",
              incident_at: toLocalDatetimeInput(new Date().toISOString()),
              important: false,
            },
      );
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit report" : "New misuse report"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(values);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="student_name">Student name</Label>
            <Input
              id="student_name"
              required
              value={values.student_name}
              onChange={(e) => setValues((v) => ({ ...v, student_name: e.target.value }))}
              placeholder="e.g. Sara Ahmed"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="student_class">Class</Label>
            <Input
              id="student_class"
              required
              value={values.student_class}
              onChange={(e) => setValues((v) => ({ ...v, student_class: e.target.value }))}
              placeholder="e.g. 10-B"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Misuse description</Label>
            <Textarea
              id="description"
              required
              rows={4}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="What happened?"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="incident_at">Date & time</Label>
            <Input
              id="incident_at"
              type="datetime-local"
              required
              value={values.incident_at}
              onChange={(e) => setValues((v) => ({ ...v, incident_at: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" />
              <div>
                <Label htmlFor="important" className="cursor-pointer">Mark as important</Label>
                <p className="text-xs text-muted-foreground">Pinned to top of dashboard</p>
              </div>
            </div>
            <Switch
              id="important"
              checked={values.important}
              onCheckedChange={(c) => setValues((v) => ({ ...v, important: c }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : initial ? "Save changes" : "Add report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { format };
