import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type CurrentUser = {
  user: User;
  profile: { id: string; username: string; full_name: string; role: string; status: string } | null;
  isSuperAdmin: boolean;
  isActive: boolean;
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

      // Get or create profile
      let { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.id)
        .maybeSingle();

      // If profile doesn't exist, create it with lab_admin role and active status
      if (!profile && !error) {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: session.id,
            username: session.user_metadata?.username || session.email?.split("@")[0] || "user",
            full_name: session.user_metadata?.full_name || "Lab User",
            role: "lab_admin",
            status: "active",
          })
          .select()
          .single();

        if (!createError) {
          profile = newProfile;
        }
      }

      return {
        user: session,
        profile: profile as any,
        isSuperAdmin: profile?.role === "super_admin",
        isActive: profile?.status === "active",
      };
    },
  });

  return { session, ...query };
}
