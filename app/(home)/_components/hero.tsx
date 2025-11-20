import { PageActions, PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Hero() {
    return (
        <PageHeader>
            <PageHeaderHeading>Welcome to Canvas AI</PageHeaderHeading>
            <PageHeaderDescription>Your AI-powered canvas companion.</PageHeaderDescription>
            <PageActions>
                <Button asChild>
                    <Link href="/canvas">Get Started</Link>
                </Button>
                <Button variant="outline">Learn More</Button>
            </PageActions>
        </PageHeader>
    )
}