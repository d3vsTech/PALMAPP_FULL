"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "./utils";

/**
 * Colorea automáticamente los asteriscos `*` que marcan campos obligatorios
 * en rojo (destructive). Aplica a todo el sistema con un solo componente:
 * cualquier `<Label>Mes *</Label>` sale con el `*` en rojo sin tocar cada uso.
 *
 * Recorre los children:
 *  - String → parte por " *" al final y renderiza el span rojo.
 *  - Array → hace lo mismo por cada string dentro (el `*` puede estar
 *    después de un nodo como un tooltip).
 *  - Otros elementos → los deja pasar tal cual.
 */
function highlightAsterisk(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    const match = node.match(/^(.*?)\s*\*\s*$/);
    if (!match) return node;
    return (
      <>
        {match[1]}
        <span className="text-destructive ml-0.5" aria-hidden="true">
          *
        </span>
      </>
    );
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={i}>{highlightAsterisk(child)}</React.Fragment>
    ));
  }
  return node;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    data-slot="label"
    className={cn(
      "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {highlightAsterisk(children)}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
