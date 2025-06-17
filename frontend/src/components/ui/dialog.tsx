'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
    ({ open = false, onOpenChange, children }, ref) => {
        React.useEffect(() => {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape' && onOpenChange) {
                    onOpenChange(false)
                }
            }

            if (open) {
                document.addEventListener('keydown', handleEscape)
                return () => document.removeEventListener('keydown', handleEscape)
            }
        }, [open, onOpenChange])

        if (!open) return null

        return (
            <div ref={ref} className="fixed inset-0 z-50">
                <div
                    className="fixed inset-0 bg-black/50 dark:bg-black/80"
                    onClick={() => onOpenChange?.(false)}
                />
                {children}
            </div>
        )
    }
)
Dialog.displayName = 'Dialog'

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg dark:border-gray-700 dark:bg-gray-800",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight dark:text-white",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-gray-500 dark:text-gray-400", className)}
        {...props}
    />
))
DialogDescription.displayName = 'DialogDescription'

export {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
}