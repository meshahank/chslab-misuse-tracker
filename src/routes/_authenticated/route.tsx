import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });

    // Check if user is disabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", data.session.user.id)
      .single();

    if (profile?.status === "disabled") {
      // Sign out disabled users
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
