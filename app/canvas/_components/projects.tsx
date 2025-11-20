import { api } from "@/convex/_generated/api"
import { useQuery } from "convex/react"
import Link from "next/link"

export function Projects({ isAuthenticated }: { isAuthenticated: boolean }) {
    const projects = useQuery(api.generate.getAllProjects, isAuthenticated ? {} : "skip")

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects?.map((project) => (
                <Link href={`/canvas/${project.project_id}`} key={project._id}>
                    <div className="border shadow-sm p-4 rounded-md">
                        <h2 className="text-lg font-bold">{project.project_name}</h2>
                        <p className="text-sm text-gray-500">{project.project_description}</p>
                    </div>
                </Link>
            ))}
        </div>
    )
}