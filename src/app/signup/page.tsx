"use client";

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


export default function SignupForm() {
    const { signUp } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signUp(email, password);
            toast({
                title: "Signup Successful",
                description: "You have been successfully signed up. Please login.",
            })
            router.push("/login");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Signup Failed",
                description: error.message,
            })
            console.error("Failed to sign up:", error);
        } finally {
            setLoading(false);
        }
    }


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="mx-auto max-w-sm">
        <CardHeader>
            <CardTitle className="text-xl">Sign Up</CardTitle>
            <CardDescription>
            Enter your information to create an account
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                id="password" 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create an account
            </Button>
            </form>
            <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
                Sign in
            </Link>
            </div>
        </CardContent>
        </Card>
    </div>
  )
}
