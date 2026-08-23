"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

import { useFamily } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { AddPartnerDialog } from "./add-partner-dialog";

/** Sits beside the account avatar. Disappears once a family exists. */
export function AddPartnerButton() {
  const { family, loading } = useFamily();
  const [open, setOpen] = useState(false);

  if (loading || family) return null;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => setOpen(true)}
        aria-label="Add partner"
        title="Add partner"
      >
        <UserPlus className="h-4 w-4" />
      </Button>
      <AddPartnerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
