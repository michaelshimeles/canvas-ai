"use client"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
export default function CanvasPage() {
  const router = useRouter()
  const { id } = useParams()
  useEffect(() => {
    router.push(`/canvas/${id}`)
  }, [id])
  return <div>Canvas</div>
}