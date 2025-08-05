import { transactions } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function RecentTransactions() {
  return (
    <div className="space-y-8">
      {transactions.map((transaction) => (
        <div className="flex items-center" key={transaction.id}>
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={`https://placehold.co/40x40.png`}
              alt="Avatar"
              data-ai-hint="avatar"
            />
            <AvatarFallback>
              {transaction.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">
              {transaction.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {transaction.email}
            </p>
          </div>
          <div
            className={`ml-auto font-medium ${
              transaction.type === "income"
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {transaction.type === "income" ? "+" : "-"}$
            {transaction.amount.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
