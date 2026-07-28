import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type CurrentUser = {
  user: User;
  profile: { id: string; username: string; full_name: string } | null;
  roles: string[];
  isSuperAdmin: boolean;
};

export function useCurrentUser() {
  const qc = useQueryClient();
  const [session, setSession] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSession(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s?.user ?? null);
      qc.invalidateQueries({ queryKey: ["current-user"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const query = useQuery({
    queryKey: ["current-user", session?.id],
    enabled: !!session,
    queryFn: async (): Promise<CurrentUser | null> => {
      if (!session) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles" as any).select("*").eq("id", session.id).maybeSingle(),
        supabase.from("user_roles" as any).select("role").eq("user_id", session.id),
      ]);
      const roleList = (roles as any[] | null)?.map((r) => r.role) ?? [];
      return {
        user: session,
        profile: profile as any,
        roles: roleList,
        isSuperAdmin: roleList.includes("super_admin"),
      };
    },
  });

  return { session, ...query };
}
