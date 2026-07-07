"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  Share2,
  User,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { smsLink, whatsappLink } from "@/lib/messaging";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const APP_URL = "https://hydra-fintrack.vercel.app";
const SHARE_TEXT = `Track expenses, split bills, and settle up with friends on FinTrack Pro: ${APP_URL}`;

export function UserMenu() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => router.push("/profile")}>
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4" />
            Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => signOut()}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Share FinTrack Pro</DialogTitle>
            <DialogDescription>
              Invite friends to track and split expenses together.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <a
                href={whatsappLink("", SHARE_TEXT)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShareOpen(false)}
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-[#25D366]" />
                Share via WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <a href={smsLink("", SHARE_TEXT)} onClick={() => setShareOpen(false)}>
                <MessageSquare className="h-4 w-4 shrink-0" />
                Share via SMS
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
