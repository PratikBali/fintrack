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
import { ReportsView } from "@/components/reports/reports-view";
import { useConsumePendingInvite } from "@/lib/groups";
import {
  QuickAddProvider,
  useQuickAddAction,
} from "@/lib/quick-add";
import { UserMenu } from "@/components/user-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const NAV_ITEMS = [
  { value: "dashboard", label: "Dashboard", icon: Activity },
  { value: "ledger", label: "Ledger", icon: Landmark },
  { value: "groups", label: "Groups", icon: Users },
  { value: "budgets", label: "Budgets", icon: CreditCard },
  { value: "reports", label: "Reports", icon: File },
] as const;

function QuickAddButton({ mode }: { mode: "header" | "fab" }) {
  const action = useQuickAddAction();

  if (mode === "header") {
    const cls =
      "gap-1 hidden md:flex bg-accent hover:bg-accent/90 text-accent-foreground";
    return action ? (
      <Button size="sm" className={cls} onClick={action.run}>
        <PlusCircle className="h-4 w-4" />
        {action.label}
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

  const fabCls =
    "h-14 w-14 rounded-full shadow-lg bg-accent hover:bg-accent/90 text-accent-foreground [&_svg]:size-6";
  return action ? (
    <Button
      size="icon"
      className={fabCls}
      onClick={action.run}
      aria-label={action.label}
    >
      <PlusCircle />
      <span className="sr-only">{action.label}</span>
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
        <QuickAddButton mode="header" />
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
            <TabsList className="grid h-auto w-full grid-cols-5 md:inline-flex md:h-10 md:w-auto">
              {NAV_ITEMS.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex flex-col gap-1 px-1 py-1.5 text-[11px] leading-tight md:flex-row md:gap-0 md:px-3 md:text-sm"
                >
                  <item.icon className="h-5 w-5 md:mr-2 md:h-4 md:w-4" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="dashboard" className="space-y-4">
            <StatsCards />
            <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 min-w-0 overflow-hidden">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6">
                  <OverviewChart />
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
            <Card>
              <CardHeader>
                <CardTitle>Budgets</CardTitle>
                <CardDescription>
                  Set and track your monthly spending budgets.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Budgeting feature coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports">
            <ReportsView />
          </TabsContent>
        </Tabs>
      </main>
      <div className="fixed bottom-4 right-4 z-40 md:hidden">
        <QuickAddButton mode="fab" />
      </div>
    </div>
    </QuickAddProvider>
  );
}

export default Home;
