import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

const Select = React.forwardRef(({ label, className, error, options, placeholder, ...props }, ref) => {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    ref={ref}
                    className={cn(
                        "flex w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all pr-10",
                        error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
                        className
                    )}
                    {...props}
                >
                    {placeholder && <option value="" disabled selected>{placeholder}</option>}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    );
});

Select.displayName = "Select";

export default Select;
