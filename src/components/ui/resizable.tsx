"use client"

import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"
import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) => (
  <ResizablePrimitive.Panel
    className={cn(
      "transition-all duration-100 ease-in-out",
      className
    )}
    {...props}
  />
)

const ResizableHandle = ({
  className,
  withHandle = false,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "group relative flex w-1.5 items-center justify-center bg-border transition-all duration-150",
      "hover:bg-primary hover:w-2",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
      "data-[panel-group-direction=vertical]:h-1.5 data-[panel-group-direction=vertical]:w-full",
      "[&[data-panel-resize-handle-active]]:bg-primary [&[data-panel-resize-handle-active]]:w-2",
      "[&[data-panel-resize-handle-active]]:data-[panel-group-direction=vertical]:h-2",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-4 items-center justify-center rounded-sm border bg-border group-hover:bg-primary">
        <GripVertical className="h-2.5 w-2.5 text-muted-foreground group-hover:text-white" />
      </div>
    )}
    <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-transparent group-hover:bg-primary group-hover:opacity-20 data-[panel-group-direction=vertical]:left-0 data-[panel-group-direction=vertical]:h-1 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:-translate-y-1/2 data-[panel-group-direction=vertical]:translate-x-0" />
  </ResizablePrimitive.PanelResizeHandle>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle } 