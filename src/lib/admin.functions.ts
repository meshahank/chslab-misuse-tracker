import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function assertSuperAdmin(context: any) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("role, status")
    .eq("id", context.userId)
    .single();
  if (error) throw new Error(error.message);
  if (data?.status !== "active") throw new Error("Forbidden: Account is disabled");
  if (data?.role !== "super_admin") throw new Error("Forbidden: Super Admin only");
}

async function recordAuditLog(
  supabase: any,
  actorId: string,
  targetUserId: string,
  action: "promote" | "demote" | "disable" | "enable",
  oldValue: string,
  newValue: string,
  reason?: string
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    target_user_id: targetUserId,
    action,
    old_value: oldValue,
    new_value: newValue,
    reason,
  });
  if (error) throw new Error(`Audit log failed: ${error.message}`);
}

async function getActiveSuperAdminCount(supabase: any) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

export const promoteToSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    // Get current user profile
    const { data: targetProfile, error: fetchError } = await context.supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user_id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    if (!targetProfile) throw new Error("User not found");

    // If already super admin, no-op
    if (targetProfile.role === "super_admin") {
      return { ok: true, changed: false };
    }

    // Update to super_admin
    const { error: updateError } = await context.supabase
      .from("profiles")
      .update({ role: "super_admin" })
      .eq("id", data.user_id);
    if (updateError) throw new Error(updateError.message);

    // Record audit log
    await recordAuditLog(
      context.supabase,
      context.userId,
      data.user_id,
      "promote",
      targetProfile.role,
      "super_admin"
    );

    return { ok: true, changed: true };
  });

export const demoteToLabAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    // Prevent demoting the last super admin
    const activeSuperAdminCount = await getActiveSuperAdminCount(context.supabase);
    if (activeSuperAdminCount <= 1) {
      throw new Error("Cannot demote the last Super Admin");
    }

    // Get current user profile
    const { data: targetProfile, error: fetchError } = await context.supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user_id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    if (!targetProfile) throw new Error("User not found");

    // If already lab_admin, no-op
    if (targetProfile.role === "lab_admin") {
      return { ok: true, changed: false };
    }

    // Update to lab_admin
    const { error: updateError } = await context.supabase
      .from("profiles")
      .update({ role: "lab_admin" })
      .eq("id", data.user_id);
    if (updateError) throw new Error(updateError.message);

    // Record audit log
    await recordAuditLog(
      context.supabase,
      context.userId,
      data.user_id,
      "demote",
      targetProfile.role,
      "lab_admin"
    );

    return { ok: true, changed: true };
  });

export const disableUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    // Prevent disabling the last super admin
    const { data: targetProfile, error: fetchError } = await context.supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user_id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    if (!targetProfile) throw new Error("User not found");

    if (targetProfile.role === "super_admin") {
      const activeSuperAdminCount = await getActiveSuperAdminCount(context.supabase);
      if (activeSuperAdminCount <= 1) {
        throw new Error("Cannot disable the last Super Admin");
      }
    }

    // If already disabled, no-op
    if (targetProfile.status === "disabled") {
      return { ok: true, changed: false };
    }

    // Update to disabled
    const { error: updateError } = await context.supabase
      .from("profiles")
      .update({ status: "disabled" })
      .eq("id", data.user_id);
    if (updateError) throw new Error(updateError.message);

    // Record audit log
    await recordAuditLog(
      context.supabase,
      context.userId,
      data.user_id,
      "disable",
      targetProfile.status,
      "disabled"
    );

    return { ok: true, changed: true };
  });

export const enableUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    // Get current user profile
    const { data: targetProfile, error: fetchError } = await context.supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user_id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    if (!targetProfile) throw new Error("User not found");

    // If already active, no-op
    if (targetProfile.status === "active") {
      return { ok: true, changed: false };
    }

    // Update to active
    const { error: updateError } = await context.supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", data.user_id);
    if (updateError) throw new Error(updateError.message);

    // Record audit log
    await recordAuditLog(
      context.supabase,
      context.userId,
      data.user_id,
      "enable",
      targetProfile.status,
      "active"
    );

    return { ok: true, changed: true };
  });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);

    // Get all profiles with their role and status
    const { data: profiles, error: profilesError } = await context.supabase
      .from("profiles")
      .select("id, username, full_name, created_at, role, status")
      .order("created_at", { ascending: true });
    if (profilesError) throw new Error(profilesError.message);

    return (profiles ?? []).map((p: any) => ({
      ...p,
    }));
  });

export const getAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);

    // Get all audit logs ordered by most recent
    const { data: logs, error } = await context.supabase
      .from("audit_logs")
      .select("id, actor_id, target_user_id, action, old_value, new_value, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    // Enrich with actor and target user names
    if (!logs || logs.length === 0) return [];

    const userIds = new Set<string>();
    (logs ?? []).forEach((log: any) => {
      userIds.add(log.actor_id);
      userIds.add(log.target_user_id);
    });

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, username")
      .in("id", Array.from(userIds));

    const profileMap = new Map(
      (profiles ?? []).map((p: any) => [p.id, p.username])
    );

    return (logs ?? []).map((log: any) => ({
      ...log,
      actor_name: profileMap.get(log.actor_id) ?? "Unknown",
      target_name: profileMap.get(log.target_user_id) ?? "Unknown",
    }));
  });
