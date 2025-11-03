"use client"

import React from "react"

import { Dock, DockIcon } from "@/components/ui/dock"
import Image from "next/image"
export type IconProps = React.HTMLAttributes<SVGElement>

export function DockDemo() {
  return (
    <div className="relative">
      <Dock iconMagnification={50} iconDistance={100} className="bg-black/10">
        <DockIcon className="bg-black/10 dark:bg-white/10">
          <Image src="/terminal.png" alt="Terminal" width={100} height={100} className="size-full"/>
        </DockIcon>
        <DockIcon className="bg-black/10 dark:bg-white/10">
          <Image src="/brain.png" alt="brain" width={100} height={100} className="size-full"/>
        </DockIcon>
        <DockIcon className="bg-black/10 dark:bg-white/10">
          <Image src="/settings.webp" alt="settings" width={100} height={100} />
        </DockIcon>
      </Dock>
    </div>
  )
}

