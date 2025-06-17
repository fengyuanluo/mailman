'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DropdownProps {
    trigger: React.ReactNode
    children: React.ReactNode
    align?: 'left' | 'right'
    className?: string
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    return (
        <div className="relative" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>
            {isOpen && (
                <div
                    className={cn(
                        'absolute top-full z-50 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800',
                        align === 'right' ? 'right-0' : 'left-0',
                        className
                    )}
                    onClick={() => setIsOpen(false)}
                >
                    {children}
                </div>
            )}
        </div>
    )
}
