"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "./utils";

/** En celular la ventana se convierte en un panel que sube desde abajo. */
export const PANEL_MOVIL =
  "max-md:top-auto! max-md:bottom-0! max-md:left-0! max-md:translate-x-0! max-md:translate-y-0! max-md:w-full! max-md:max-w-none! max-md:max-h-[92dvh]! max-md:overflow-y-auto max-md:rounded-b-none! max-md:rounded-t-[20px]! max-md:border-x-0 max-md:border-b-0 max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-md:duration-300 max-md:data-[state=open]:zoom-in-100 max-md:data-[state=closed]:zoom-out-100 max-md:data-[state=open]:slide-in-from-bottom-full max-md:data-[state=closed]:slide-out-to-bottom-full";

/** Arrastrar la manija hacia abajo cierra el panel, como en una app. */
function ManijaPanel() {
  const inicio = React.useRef<number | null>(null);
  const panel = (el: Element) => el.closest<HTMLElement>('[data-slot="dialog-content"]');
  const soltar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (inicio.current === null) return;
    const recorrido = e.clientY - inicio.current;
    inicio.current = null;
    const el = panel(e.currentTarget);
    if (!el) return;
    if (recorrido > 90) el.querySelector<HTMLElement>("[data-cerrar-panel]")?.click();
    el.style.transform = "";
  };
  return (
    <div
      aria-hidden
      className="-mt-4 flex h-6 touch-none items-center justify-center md:hidden"
      onPointerDown={(e) => {
        inicio.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (inicio.current === null) return;
        const el = panel(e.currentTarget);
        if (el) el.style.transform = `translateY(${Math.max(0, e.clientY - inicio.current)}px)`;
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
    </div>
  );
}

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

const DialogTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>(({ ...props }, ref) => {
  return <DialogPrimitive.Trigger ref={ref} data-slot="dialog-trigger" {...props} />;
});
DialogTrigger.displayName = "DialogTrigger";

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
});
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { centradoEnMovil?: boolean }
>(({ className, children, centradoEnMovil, ...props }, ref) => {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        aria-describedby={undefined}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[90dvh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border p-6 shadow-md duration-200 sm:max-w-lg",
          !centradoEnMovil && PANEL_MOVIL,
          className,
        )}
        {...props}
      >
        {!centradoEnMovil && <ManijaPanel />}
        {children}
        <DialogPrimitive.Close data-cerrar-panel className="max-md:top-2 max-md:right-2 max-md:flex max-md:size-11 max-md:items-center max-md:justify-center ring-offset-background focus:ring-ring data-[state=open]:bg-muted data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = "DialogContent";

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
});
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Description
      ref={ref}
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};