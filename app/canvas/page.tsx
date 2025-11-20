"use client"
import { useConvexAuth } from "convex/react"
import { CreateModal } from "./_components/create-modal"
import { Projects } from "./_components/projects"


export default function CanvasPage() {
  const { isAuthenticated } = useConvexAuth()


  return (
    <div>
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-2xl font-semibold">Your Projects</h1>
        <div>
          <CreateModal />
        </div>
        <Projects isAuthenticated={isAuthenticated} />
      </div>
    </div>
  )
}