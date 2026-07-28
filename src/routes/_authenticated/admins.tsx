import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, ShieldCheck, User } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createLabAdmin, deleteLabAdmin, listAdmins, resetLabAdminPassword } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admins")({
  component: AdminsPage,
});

function AdminsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me, isLoading: meLoading } = useCurrentUser();

  useEffect(() => {
    if (!meLoading && me && !me.isSuperAdmin) navigate({ to: "/dashboard", replace: true });
  }, [me, meLoading, navigate]);

  const list = useServerFn(listAdmins);
  const create = useServerFn(createLabAdmin);
  const remove = useServerFn(deleteLabAdmin);
  const reset = useServerFn(resetLabAdminPassword);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: () => list(),
    enabled: !!me?.isSuperAdmin,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const createMut = useMutation({
    mutationFn: (data: { username: string; full_name: string; password: string }) => create({ data }),
    onSuccess: () => { toast.success("Lab admin created"); setCreateOpen(false); qc.invalidateQueries({ queryKey: ["admins"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (user_id: string) => remove({ data: { user_id } }),
    onSuccess: () => { toast.success("Admin deleted"); qc.invalidateQueries({ queryKey: ["admins"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resetMut = useMutation({
    mutationFn: (v: { user_id: string; password: string }) => reset({ data: v }),
    onSuccess: () => { toast.success("Password reset"); setResetTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!me?.isSuperAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Create and manage lab admin accounts. Only Super Admins can access this page.
        </p>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Lab Admin
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Admin accounts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : (
            <ul className="divide-y">
              {admins.map((a: any) => {
                const isSuper = a.roles?.includes("super_admin");
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{a.full_name}</p>
                        {isSuper ? (
                          <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                            <ShieldCheck className="h-3 w-3" /> Super Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Lab Admin</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">@{a.username}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isSuper && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setResetTarget(a)} className="gap-1">
                            <KeyRound className="h-3.5 w-3.5" /> Reset password
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(a)}
                            className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateAdminDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        submitting={createMut.isPending}
        onSubmit={(v) => createMut.mutateAsync(v)}
      />

      <ResetPasswordDialog
        target={resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
        submitting={resetMut.isPending}
        onSubmit={(pw) => resetMut.mutateAsync({ user_id: resetTarget.id, password: pw })}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.full_name} (@{deleteTarget?.username}) will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { removeMut.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateAdminDialog({
  open, onOpenChange, onSubmit, submitting,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onSubmit: (v: { username: string; full_name: string; password: string }) => Promise<any>;
  submitting?: boolean;
}) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) { setUsername(""); setFullName(""); setPassword(""); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a Lab Admin</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit({ username, full_name: fullName, password });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="new-username">Username</Label>
            <Input id="new-username" required minLength={2} value={username}
              onChange={(e) => setUsername(e.target.value)} placeholder="e.g. lab_omar" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-name">Full name</Label>
            <Input id="new-name" required value={fullName}
              onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Omar Farouk" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-pw">Temporary password</Label>
            <Input id="new-pw" type="text" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            <p className="text-xs text-muted-foreground">Share it securely; the admin can change it later.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create admin"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  target, onOpenChange, onSubmit, submitting,
}: {
  target: any | null; onOpenChange: (o: boolean) => void;
  onSubmit: (pw: string) => Promise<any>; submitting?: boolean;
}) {
  const [password, setPassword] = useState("");
  useEffect(() => { if (target) setPassword(""); }, [target]);
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for @{target?.username}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => { e.preventDefault(); await onSubmit(password); }}
        >
          <div className="grid gap-2">
            <Label htmlFor="reset-pw">New password</Label>
            <Input id="reset-pw" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Reset password"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
