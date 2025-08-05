import {
  File,
  Landmark,
  PlusCircle,
  Users,
  Wallet,
  Activity,
  CreditCard,
  Search,
} from "lucide-react";
import Image from "next/image";

import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { StatsCards } from "@/components/dashboard/stats-cards";
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

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">FinTrack Pro</h1>
        </div>

        <div className="relative ml-auto flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full rounded-lg bg-card pl-8 md:w-[200px] lg:w-[320px]"
          />
        </div>
        <AddExpenseDialog>
          <Button size="sm" className="gap-1 hidden sm:flex bg-accent hover:bg-accent/90 text-accent-foreground">
            <PlusCircle className="h-4 w-4" />
            Add Transaction
          </Button>
        </AddExpenseDialog>
        <Avatar>
          <AvatarImage src="https://placehold.co/40x40" alt="User Avatar" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Tabs defaultValue="dashboard">
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="dashboard">
                <Activity className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="ledger">
                <Landmark className="h-4 w-4 mr-2" />
                Ledger
              </TabsTrigger>
              <TabsTrigger value="groups">
                <Users className="h-4 w-4 mr-2" />
                Groups
              </TabsTrigger>
              <TabsTrigger value="budgets">
                <CreditCard className="h-4 w-4 mr-2" />
                Budgets
              </TabsTrigger>
              <TabsTrigger value="reports">
                <File className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="dashboard" className="space-y-4">
            <StatsCards />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <OverviewChart />
                </CardContent>
              </Card>
              <Card className="col-span-4 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>
                    You made 25 transactions this month.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentTransactions />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="ledger">
            <Card>
              <CardHeader>
                <CardTitle>Customer & Supplier Ledger</CardTitle>
                <CardDescription>
                  Manage your credit and debit with customers and suppliers.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Ledger feature coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Group Expenses</CardTitle>
                <CardDescription>
                  Split bills with friends and family.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Group expense splitting feature coming soon.
                </p>
              </CardContent>
            </Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>
                  Generate detailed financial reports.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Reporting feature coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <div className="sm:hidden fixed bottom-4 right-4">
        <AddExpenseDialog>
            <Button size="icon" className="rounded-full h-14 w-14 shadow-lg bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="h-6 w-6" />
                <span className="sr-only">Add Transaction</span>
            </Button>
        </AddExpenseDialog>
      </div>
    </div>
  );
}
