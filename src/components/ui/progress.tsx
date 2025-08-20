
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const progressValue = value || 0;
  const segmentCount = 7;
  const filledSegments = Math.floor((progressValue / 100) * segmentCount);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-transparent flex justify-between items-center gap-1",
        className
      )}
      {...props}
    >
      {Array.from({ length: segmentCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-full flex-1 rounded-sm transition-colors duration-300",
            i < filledSegments ? "bg-primary" : "bg-secondary"
          )}
        />
      ))}
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
