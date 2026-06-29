import { Slot } from "radix-ui"

import { cn } from "@shared/Utils/Cn"
import {
  badgeVariants,
  type BadgeVariantProps,
} from "@shared/Components/Reui/badgeVariants"

interface BadgeProps
  extends React.ComponentProps<"span">, BadgeVariantProps {
  asChild?: boolean
}

function Badge({
  className,
  variant,
  size,
  radius,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, radius, className }))}
      {...props}
    />
  )
}

export { Badge, type BadgeProps }
