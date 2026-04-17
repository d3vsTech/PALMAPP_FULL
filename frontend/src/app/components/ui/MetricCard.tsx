import { LucideIcon } from 'lucide-react';
import { Card } from './card';
import { cn } from '../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {Icon && (
          <div className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center',
            trend === 'up' && 'bg-success/10 text-success',
            trend === 'down' && 'bg-destructive/10 text-destructive',
            (!trend || trend === 'neutral') && 'bg-muted text-muted-foreground',
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}