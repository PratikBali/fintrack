"use client";

import { useState } from "react";
import {
  File,
  Landmark,
  PlusCircle,
  Users,
  Wallet,
  Activity,
  CreditCard,
  Search,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";


import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import {
  RecentTransactions,
  TransactionHistory,
} from "@/components/dashboard/recent-transactions";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { LedgerView } from "@/components/ledger/ledger-view";
import { GroupsView } from "@/components/groups/groups-view";
import { BudgetsView } from "@/components/budgets/budgets-view";
import { ReportsView } from "@/components/reports/reports-view";
import { useConsumePendingInvite } from "@/lib/groups";
import {
  QuickAddProvider,
  useQuickAddAction,
} from "@/lib/quick-add";
import { UserMenu } from "@/components/user-menu";
import type { PeriodPreset } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MultiTab } from "@/components/ui/multi-tab";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "ledger", label: "Ledger", icon: Landmark },
  { id: "groups", label: "Groups", icon: Users },
  { id: "budgets", label: "Budgets", icon: CreditCard },
  { id: "reports", label: "Reports", icon: File },
] as const;

const ADD_BUTTON_TONE: Record<string, string> = {
  dashboard: "bg-red-600 text-white hover:bg-red-700",
  ledger: "bg-green-600 text-white hover:bg-green-700",
  groups: "bg-blue-600 text-white hover:bg-blue-700",
  budgets: "bg-yellow-400 text-black hover:bg-yellow-500",
};
const DEFAULT_ADD_TONE = "bg-accent text-accent-foreground hover:bg-accent/90";

function QuickAddButton({ mode, tab }: { mode: "header" | "fab"; tab: string }) {
  const action = useQuickAddAction();
  if (action && "hidden" in action) return null;
  const registered = action && "run" in action ? action : null;
  const tone = ADD_BUTTON_TONE[tab] ?? DEFAULT_ADD_TONE;

  if (mode === "header") {
    const cls = `gap-1 hidden md:flex ${tone}`;
    return registered ? (
      <Button size="sm" className={cls} onClick={registered.run}>
        <PlusCircle className="h-4 w-4" />
        {registered.label}
      </Button>
    ) : (
      <AddExpenseDialog>
        <Button size="sm" className={cls}>
          <PlusCircle className="h-4 w-4" />
          Add Transaction
        </Button>
      </AddExpenseDialog>
    );
  }

  const fabCls = `h-14 w-14 rounded-full shadow-lg ${tone} [&_svg]:size-6`;
  return registered ? (
    <Button
      size="icon"
      className={fabCls}
      onClick={registered.run}
      aria-label={registered.label}
    >
      <PlusCircle />
      <span className="sr-only">{registered.label}</span>
    </Button>
  ) : (
    <AddExpenseDialog>
      <Button size="icon" className={fabCls}>
        <PlusCircle />
        <span className="sr-only">Add Transaction</span>
      </Button>
    </AddExpenseDialog>
  );
}

function Home() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [dashboardPeriod, setDashboardPeriod] = useState<PeriodPreset>("month");
  useConsumePendingInvite();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <QuickAddProvider>
    <div className="flex min-h-screen w-full flex-col overflow-x-clip bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 sm:static sm:h-auto sm:gap-4 sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Wallet className="h-6 w-6 shrink-0 text-primary" />
          <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">FinTrack Pro</h1>
        </div>

        <div className="relative ml-auto hidden flex-1 md:block md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full rounded-lg bg-card pl-8 md:w-[200px] lg:w-[320px]"
          />
        </div>
        <QuickAddButton mode="header" tab={tab} />
        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.photoURL || "https://placehold.co/40x40"} alt="User Avatar" />
              <AvatarFallback>{user?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          <UserMenu />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-20 pt-4 sm:px-6 md:gap-8 md:py-0">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="sticky top-14 z-20 -mx-4 flex items-center bg-background px-4 py-2 sm:top-0 sm:-mx-6 sm:px-6">
            <MultiTab
              variant="primary"
              items={NAV_ITEMS}
              value={tab}
              onValueChange={setTab}
            />
          </div>
          <TabsContent value="dashboard" className="space-y-4">
            <StatsCards
              preset={dashboardPeriod}
              onPresetChange={setDashboardPeriod}
            />
            <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 min-w-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6">
                  <OverviewChart preset={dashboardPeriod} />
                </CardContent>
              </Card>
              <Card className="col-span-4 min-w-0 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>
                    Your most recent activity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentTransactions />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  Every transaction. Deleted ones stay here, greyed out.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionHistory />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ledger">
            <LedgerView />
          </TabsContent>
          <TabsContent value="groups">
            <GroupsView />
          </TabsContent>
          <TabsContent value="budgets">
            <BudgetsView />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsView />
          </TabsContent>
        </Tabs>
      </main>
      <div className="fixed bottom-4 right-4 z-40 md:hidden">
        <QuickAddButton mode="fab" tab={tab} />
      </div>
    </div>
    </QuickAddProvider>
  );
}

export default Home;
