import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { useMutation } from "convex/react"
import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function CreateModal() {

    const createProject = useMutation(api.generate.createProject)
    const router = useRouter()
    const projectId = crypto.randomUUID()
    const [projectName, setProjectName] = useState("")
    const [projectDescription, setProjectDescription] = useState("")

    const handleCreateProject = () => {
        if (!projectName || !projectDescription) {
            toast.error("Please fill in all fields")
            return
        }
        createProject({
            project_id: `project-${projectId}`,
            project_name: projectName,
            project_description: projectDescription
        })
        router.push(`/canvas/${projectId}`)
    }

    return (
        <Dialog>
            <form>
                <DialogTrigger asChild>
                    <Button>
                        <PlusIcon className="size-4" />
                        New Project
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create a new project</DialogTitle>
                        <DialogDescription>
                            Create a new project to start building your canvas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="name">Project Name</Label>
                            <Input id="name" name="name" autoFocus value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleCreateProject}>Create Project</Button>
                    </DialogFooter>
                </DialogContent>
            </form>
        </Dialog>
    )
}
