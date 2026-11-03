import * as React from "react";

import { cn } from "./utils";

/**
 * Campo de texto del sistema visual.
 *
 * El guardia de los campos numéricos no viene del diseño: evita que se escriba
 * `-`, `+` o notación científica en cantidades, y fija `min=0` cuando nadie lo
 * dice. Sin eso, una planilla admite gajos negativos.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onKeyDown, min, ...props }, ref) => {
    const esNumero = type === "number";
    const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (esNumero && (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E")) {
        e.preventDefault();
      }
      onKeyDown?.(e);
    };
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        min={esNumero && min === undefined ? 0 : min}
        onKeyDown={alTeclear}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-input-background border-input flex h-10 w-full min-w-0 rounded-[10px] border px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
