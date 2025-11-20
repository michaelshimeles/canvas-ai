"use client"
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
export default function Navbar() {
    const { user } = useUser()
    const { signOut } = useAuth()

    const firstName = user?.firstName
    return (
        <div className="flex justify-between items-center p-4 border-b">
            <Link href="/">
                <h1 className="text-xl font-semibold">Canvas AI</h1>
            </Link>
            <Authenticated>
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Avatar>
                            <AvatarImage src={user?.imageUrl} />
                            <AvatarFallback>{firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-50" align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/settings?tab=profile">
                            <DropdownMenuItem>Profile</DropdownMenuItem>
                        </Link>
                        <Link href="/settings?tab=subscription">
                            <DropdownMenuItem>Subscription</DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>Sign Out</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </Authenticated>
            <Unauthenticated>
                <SignInButton mode="modal">
                    <Button>
                        Sign In
                    </Button>
                </SignInButton>
            </Unauthenticated>
        </div>
    )
}