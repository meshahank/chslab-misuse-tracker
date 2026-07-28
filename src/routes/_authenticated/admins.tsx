import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, ShieldOff, Lock, Unlock, History, User } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  promoteToSuperAdmin,
  demoteToLabAdmin,
  disableUser,
  enableUser,
  listAdmins,
  getAuditLogs,
} from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

  const listFn = useServerFn(listAdmins);
  const promoteFn = useServerFn(promoteToSuperAdmin);
  const demoteFn = useServerFn(demoteToLabAdmin);
  const disableFn = useServerFn(disableUser);
  const enableFn = useServerFn(enableUser);
  const auditFn = useServerFn(getAuditLogs);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: () => listFn(),
    enabled: !!me?.isSuperAdmin,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => auditFn(),
    enabled: !!me?.isSuperAdmin,
  });

  const [actionTarget, setActionTarget] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"promote" | "demote" | "disable" | "enable" | null>(null);

  // Get count of active super admins
  const activeSuperAdminCount = (admins as any[]).filter(
    (a) => a.role === "super_admin" && a.status === "active"
  ).length;

  const promote = useMutation({
    mutationFn: (user_id: string) => promoteFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("User promoted to Super Admin");
      qc.invalidateQueries({ queryKey: ["admins"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      setActionTarget(null);
      setActionType(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const demote = useMutation({
    mutationFn: (user_id: string) => demoteFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("User demoted to Lab Admin");
      qc.invalidateQueries({ queryKey: ["admins"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      setActionTarget(null);
      setActionType(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disable = useMutation({
    mutationFn: (user_id: string) => disableFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("User disabled");
      qc.invalidateQueries({ queryKey: ["admins"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      setActionTarget(null);
      setActionType(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enable = useMutation({
    mutationFn: (user_id: string) => enableFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("User enabled");
      qc.invalidateQueries({ queryKey: ["admins"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      setActionTarget(null);
      setActionType(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!me?.isSuperAdmin) return null;

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    const userId = actionTarget.id;

    switch (actionType) {
      case "promote":
        await promote.mutateAsync(userId);
        break;
      case "demote":
        await demote.mutateAsync(userId);
        break;
      case "disable":
        await disable.mutateAsync(userId);
        break;
      case "enable":
        await enable.mutateAsync(userId);
        break;
    }
  };

  const getActionLabel = () => {
    if (!actionType || !actionTarget) return "";
    const userName = actionTarget.full_name;
    switch (actionType) {
      case "promote":
        return `Promote ${userName} to Super Admin?`;
      case "demote":
        return `Demote ${userName} to Lab Admin?`;
      case "disable":
        return `Disable ${userName}'s account?`;
      case "enable":
        return `Enable ${userName}'s account?`;
    }
  };

  const getActionDescription = () => {
    if (!actionType || !actionTarget) return "";
    switch (actionType) {
      case "promote":
        return `${actionTarget.full_name} will have access to admin panel and user management.`;
      case "demote":
        return `${actionTarget.full_name} will lose admin privileges.`;
      case "disable":
        return `${actionTarget.full_name} will be unable to access the system.`;
      case "enable":
        return `${actionTarget.full_name} will regain access to the system.`;
    }
  };

  const isLastSuperAdmin = (admin: any) =>
    admin.role === "super_admin" && admin.status === "active" && activeSuperAdminCount === 1;

  const canDemote = (admin: any) => admin.role === "super_admin" && !isLastSuperAdmin(admin);
  const canDisable = (admin: any) => !isLastSuperAdmin(admin);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Manage lab admin accounts and permissions. Only Super Admins can access this page.
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lab Admins</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading...</div>
              ) : (
                <ul className="divide-y">
                  {admins.map((admin: any) => (
                    <li key={admin.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{admin.full_name}</p>
                          <div className="flex gap-1">
                            <Badge
                              className={
                                admin.role === "super_admin"
                                  ? "gap-1 bg-primary/10 text-primary hover:bg-primary/10"
                                  : "bg-secondary text-secondary-foreground"
                              }
                            >
                              {admin.role === "super_admin" ? (
                                <>
                                  <Shield className="h-3 w-3" /> Super Admin
                                </>
                              ) : (
                                <>
                                  <User className="h-3 w-3" /> Lab Admin
                                </>
                              )}
                            </Badge>
                            <Badge
                              className={
                                admin.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {admin.status === "active" ? "Active" : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">@{admin.username}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {admin.role === "lab_admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActionTarget(admin);
                              setActionType("promote");
                            }}
                            className="gap-1"
                          >
                            <Shield className="h-3.5 w-3.5" /> Promote
                          </Button>
                        )}
                        {canDemote(admin) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActionTarget(admin);
                              setActionType("demote");
                            }}
                            className="gap-1"
                          >
                            <ShieldOff className="h-3.5 w-3.5" /> Demote
                          </Button>
                        )}
                        {canDisable(admin) && admin.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActionTarget(admin);
                              setActionType("disable");
                            }}
                            className="gap-1 text-destructive hover:bg-destructive/10"
                          >
                            <Lock className="h-3.5 w-3.5" /> Disable
                          </Button>
                        )}
                        {admin.status === "disabled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActionTarget(admin);
                              setActionType("enable");
                            }}
                            className="gap-1"
                          >
                            <Unlock className="h-3.5 w-3.5" /> Enable
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" /> Permission Change History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No permission changes recorded yet.</div>
              ) : (
                <ul className="divide-y">
                  {auditLogs.map((log: any) => (
                    <li key={log.id} className="flex items-start gap-3 p-4">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{log.actor_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getActionDisplayName(log.action)}
                          </span>
                          <span className="font-medium">{log.target_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                        {log.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {log.reason}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!actionType} onOpenChange={(open) => !open && setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionLabel()}</AlertDialogTitle>
            <AlertDialogDescription>{getActionDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                promote.isPending ||
                demote.isPending ||
                disable.isPending ||
                enable.isPending
              }
              onClick={handleAction}
            >
              {promote.isPending ||
              demote.isPending ||
              disable.isPending ||
              enable.isPending
                ? "Processing..."
                : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getActionDisplayName(action: string): string {
  switch (action) {
    case "promote":
      return "promoted to Super Admin";
    case "demote":
      return "demoted to Lab Admin";
    case "disable":
      return "disabled";
    case "enable":
      return "enabled";
    default:
      return action;
  }
}
