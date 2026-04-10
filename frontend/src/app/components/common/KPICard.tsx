import { Card } from '../ui/AppCard';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'default' | 'success' | 'warning' | 'info' | 'destructive';
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'default',
}: KPICardProps) {
  const iconBgClasses = {
    default: 'bg-primary/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    info: 'bg-info/10',
    destructive: 'bg-destructive/10',
  };

  const iconColorClasses = {
    default: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
    destructive: 'text-destructive',
  };

  return (
    <Card hover className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {title}
          </p>
          <p className="text-4xl font-bold text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
            iconBgClasses[color]
          )}>
            <Icon className={cn('w-7 h-7 icon-palmapp', iconColorClasses[color])} strokeWidth={2.5} />
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="flex items-center gap-2 mt-4">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-sm font-medium',
              trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
          <span className="text-xs text-muted-foreground">vs período anterior</span>
        </div>
      )}
    </Card>
  );
}
