"use client"
import { useConvexAuth } from "convex/react"
import { CreateModal } from "./_components/create-modal"
import { Projects } from "./_components/projects"
import { PageHeader, PageActions, PageHeaderHeading, PageHeaderDescription } from "@/components/heading"


export default function CanvasPage() {
  const { isAuthenticated } = useConvexAuth()

  return (
    <main className="px-6">
      <PageHeader>
        <PageHeaderHeading>Your Projects</PageHeaderHeading>
        <PageHeaderDescription>
          Create and manage your projects here.
        </PageHeaderDescription>
        <PageActions>
          <CreateModal />
        </PageActions>
      </PageHeader>
      <Projects isAuthenticated={isAuthenticated} />
    </main>
  )
}