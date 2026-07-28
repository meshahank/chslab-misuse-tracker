import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, startOfMonth, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { FileText, CalendarDays, CalendarRange, Star, Gavel, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MisuseReport } from "@/components/report-card";

export const Route = createFileRoute("/_authenticated/statistics")({
  component: StatsPage,
});

function StatsPage() {
  const { data: reports = [] } = useQuery({
    queryKey: ["reports", "all-for-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("misuse_reports" as any)
        .select("*").eq("is_deleted", false);
      if (error) throw error;
      return (data ?? []) as unknown as MisuseReport[];
    },
  });

  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now).getTime();
    const monthStart = startOfMonth(now).getTime();

    const total = reports.length;
    const todays = reports.filter((r) => new Date(r.incident_at).getTime() >= today).length;
    const monthly = reports.filter((r) => new Date(r.incident_at).getTime() >= monthStart).length;
    const important = reports.filter((r) => r.important).length;
    const punished = reports.filter((r) => r.status === "punished").length;

    const byReporter = new Map<string, number>();
    reports.forEach((r) => byReporter.set(r.reported_by_name, (byReporter.get(r.reported_by_name) ?? 0) + 1));
    const topReporter = [...byReporter.entries()].sort((a, b) => b[1] - a[1])[0];

    const misuseCounts = new Map<string, number>();
    reports.forEach((r) => {
      const key = r.description.trim().slice(0, 60);
      misuseCounts.set(key, (misuseCounts.get(key) ?? 0) + 1);
    });
    const commonMisuses = [...misuseCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Last 6 months chart
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(now, i));
      const next = startOfMonth(subMonths(now, i - 1));
      const count = reports.filter((r) => {
        const t = new Date(r.incident_at).getTime();
        return t >= monthDate.getTime() && t < next.getTime();
      }).length;
      months.push({ label: format(monthDate, "MMM"), count });
    }

    return { total, todays, monthly, important, punished, topReporter, commonMisuses, months };
  }, [reports]);

  const tiles = [
    { label: "Total Reports", value: stats.total, icon: FileText, tone: "text-primary", glow: "from-primary/25" },
    { label: "Today", value: stats.todays, icon: CalendarDays, tone: "text-[oklch(0.72_0.17_200)]", glow: "from-[oklch(0.72_0.17_200)]/25" },
    { label: "This Month", value: stats.monthly, icon: CalendarRange, tone: "text-[oklch(0.75_0.18_155)]", glow: "from-[oklch(0.75_0.18_155)]/25" },
    { label: "Important", value: stats.important, icon: Star, tone: "text-warning-foreground", glow: "from-warning/30" },
    { label: "Punished", value: stats.punished, icon: Gavel, tone: "text-destructive", glow: "from-destructive/25" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl transition-all hover:border-border">
            <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-2xl opacity-70`} />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.label}</p>
                <p className="font-display mt-2 text-3xl font-semibold tabular-nums tracking-tight">{t.value}</p>
              </div>
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hairline bg-background/40 ${t.tone}`}>
                <t.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>


      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Reports over the last 6 months</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.months}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-warning" /> Top reporting admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topReporter ? (
              <div>
                <p className="text-2xl font-semibold">{stats.topReporter[0]}</p>
                <p className="text-sm text-muted-foreground">
                  {stats.topReporter[1]} report{stats.topReporter[1] === 1 ? "" : "s"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Most common misuses</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.commonMisuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="divide-y">
              {stats.commonMisuses.map(([label, count]) => (
                <li key={label} className="flex items-center justify-between gap-3 py-3">
                  <span className="truncate text-sm">{label}</span>
                  <Badge variant="secondary">{count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
