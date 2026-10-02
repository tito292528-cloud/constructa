import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 rtl:left-auto rtl:right-0 rtl:pl-0 rtl:pr-3">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`block w-full rounded-lg border text-sm transition-colors py-2 px-3
            bg-white dark:bg-stone-900 
            text-stone-900 dark:text-stone-100 
            border-stone-300 dark:border-stone-700 
            placeholder-stone-400 dark:placeholder-stone-500 
            focus:border-amber-500 dark:focus:border-amber-500 
            focus:ring-1 focus:ring-amber-500 dark:focus:ring-amber-500 
            focus:outline-none 
            ${icon ? 'pl-10 rtl:pl-3 rtl:pr-10' : ''} 
            ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''} 
            ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{helperText}</p>}
    </div>
  );
});
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  options,
  children,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={`block w-full rounded-lg border text-sm transition-colors py-2 px-3
          bg-white dark:bg-stone-900 
          text-stone-900 dark:text-stone-100 
          border-stone-300 dark:border-stone-700 
          focus:border-amber-500 dark:focus:border-amber-500 
          focus:ring-1 focus:ring-amber-500 dark:focus:ring-amber-500 
          focus:outline-none 
          ${error ? 'border-rose-500' : ''} 
          ${className}`}
        {...props}
      >
        {options ? options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        )) : children}
      </select>
      {error && <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';
