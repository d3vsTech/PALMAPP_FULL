import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[11px] text-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-action text-white hover:bg-action-hover dark:text-accent-foreground [&_svg]:text-accent dark:[&_svg]:text-accent-foreground",
        primary: "bg-action text-white hover:bg-action-hover dark:text-accent-foreground [&_svg]:text-accent dark:[&_svg]:text-accent-foreground",
        accent: "bg-accent text-accent-foreground shadow-xs hover:bg-accent/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-card text-foreground hover:bg-muted",
        secondary: "bg-muted text-foreground hover:bg-muted-strong",
        ghost: "text-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 has-[>svg]:px-3.5",
        md: "h-10 px-4 has-[>svg]:px-3.5",
        sm: "h-8 rounded-[9px] gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-5 text-[15px]",
        icon: "size-9 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
      isLoading?: boolean;
    }
>(({ className, variant, size, asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Cargando...</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
