import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary/90 text-primary-foreground hover:bg-primary hover:shadow-lg hover:shadow-primary/20 shadow-sm rounded-md border border-primary/20 hover:-translate-y-[1px] transition-all",
        destructive:
          "bg-destructive/90 text-destructive-foreground hover:bg-destructive hover:shadow-lg hover:shadow-destructive/20 shadow-sm rounded-md border border-destructive/20 hover:-translate-y-[1px]",
        outline:
          "border border-input bg-background hover:bg-accent/50 hover:text-accent-foreground shadow-sm rounded-md hover:border-primary/30 transition-colors",
        secondary:
          "bg-secondary/90 text-secondary-foreground hover:bg-secondary hover:shadow-md shadow-sm rounded-md border border-secondary/20 hover:-translate-y-[1px]",
        ghost: "hover:bg-accent/50 hover:text-accent-foreground rounded-md transition-colors",
        link: "text-primary underline-offset-4 hover:underline",
        shimmer:
          "relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-violet-500/25 shadow-lg rounded-md border-0 hover:-translate-y-[1px] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-9 w-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
