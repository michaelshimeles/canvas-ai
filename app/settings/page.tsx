"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser } from "@clerk/nextjs"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const tab = searchParams.get("tab")
    const activeTab = tab || "profile"

    const onTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", value)
        router.push(`${pathname}?${params.toString()}`)
    }

    const { user } = useUser()
    console.log("user", user)

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="mb-8">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                                <AvatarFallback className="text-2xl">{user?.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-xl font-semibold">{user?.fullName}</h2>
                                <p className="text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
                            </div>
                        </div>

                        <div className="grid gap-4 max-w-xl">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={user?.fullName || ""}
                                    disabled
                                    className="bg-muted/50"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    value={user?.primaryEmailAddress?.emailAddress || ""}
                                    disabled
                                    className="bg-muted/50"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="id">User ID</Label>
                                <Input
                                    id="id"
                                    value={user?.id || ""}
                                    disabled
                                    className="font-mono text-xs bg-muted/50"
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="subscription">
                    <div className="p-4 border rounded-lg bg-muted/10">
                        <h3 className="text-lg font-medium mb-2">Subscription Plan</h3>
                        <p className="text-muted-foreground">Manage your subscription and billing details here.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}