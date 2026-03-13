import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full aria-[orientation=vertical]:flex-col", className)}
      {...props} />
  );
}

function ResizablePanel({
  ...props
}) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({ className, ...props }) {
  return (
    <ResizablePrimitive.Separator
      className={cn(
        "relative bg-zinc-800 transition-colors",
        "w-px hover:bg-zinc-600",
        "focus-visible:bg-blue-500",
        "focus-visible:ring-0 focus-visible:outline-none",
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
        className
      )}
      {...props}
    />
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
