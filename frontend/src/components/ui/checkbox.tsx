'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, ...props }, ref) => {
        return (
            <input
                type="checkbox"
                className={cn(
                    "h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }