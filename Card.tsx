import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800/80 rounded-xl shadow-xs p-5 transition-all duration-200 ${
        hoverEffect ? 'hover:border-amber-500/50 hover:shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'amber' | 'emerald' | 'blue' | 'rose' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
  color = 'amber',
  onClick
}) => {
  const colorSchemes = {
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-xs ${
        onClick ? 'cursor-pointer hover:border-amber-500/50 hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400">
            {title}
          </p>
          <h4 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            {value}
          </h4>
        </div>
        <div className={`p-2.5 rounded-xl border ${colorSchemes[color]} shrink-0`}>
          {icon}
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/60 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-stone-500 dark:text-stone-400 truncate">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`font-semibold shrink-0 ${
                trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'completed' | 'pending' | 'draft' | 'warning' | 'danger' | 'info' | 'gold';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  className = ''
}) => {
  const variants = {
    active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    completed: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    draft: 'bg-stone-500/15 text-stone-700 dark:text-stone-400 border-stone-500/30',
    warning: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
    danger: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
    gold: 'bg-amber-400/20 text-amber-800 dark:text-amber-300 border-amber-400/40 font-bold'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
