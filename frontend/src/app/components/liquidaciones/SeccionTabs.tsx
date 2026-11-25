import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../ui/utils';

/** Pestañas subrayadas del módulo: texto con borde inferior primary en la activa. */
export function SeccionTabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <TabsPrimitive.List
        className={cn('flex min-w-max gap-6 border-b border-border', className)}
        {...props}
      />
    </div>
  );
}

export function SeccionTabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        '-mb-px whitespace-nowrap border-b-2 border-transparent pb-3 pt-1 text-sm font-medium text-muted-foreground transition-colors',
        'hover:text-foreground focus-visible:outline-none focus-visible:text-foreground',
        'data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-foreground',
        className
      )}
      {...props}
    />
  );
}
