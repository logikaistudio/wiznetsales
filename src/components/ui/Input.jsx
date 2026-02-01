import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ label, className, error, ...props }, ref) => {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={cn(
                    "flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                    error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
                    className
                )}
                {...props}
            />
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    );
});

Input.displayName = "Input";

export default Input;
