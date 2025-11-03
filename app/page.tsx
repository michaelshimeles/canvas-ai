import Chat from "@/components/chatbot";
import { Button } from "@/components/ui/button";
import { PageActions, PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/heading";
import Link from "next/link";

export default function Home() {
  return (
    <main className="px-6">
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
      <Chat />
    </main>
  )
}