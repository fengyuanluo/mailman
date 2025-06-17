import React from 'react'

interface IconProps {
    name: string
    className?: string
    size?: number
}

export const IconComponent: React.FC<IconProps> = ({ name, className = '', size = 16 }) => {
    // 简单的图标映射，使用 Unicode 符号
    const iconMap: { [key: string]: string } = {
        'user': '👤',
        'log-out': '🚪',
        'plus': '➕',
        'edit': '✏️',
        'trash': '🗑️',
        'refresh-cw': '🔄',
        'mail': '📧',
        'bell': '🔔',
        'bell-off': '🔕',
        'activity': '📊',
        'home': '🏠',
        'settings': '⚙️',
        'users': '👥',
        'folder': '📁',
        'search': '🔍',
        'download': '⬇️',
        'upload': '⬆️',
        'check': '✅',
        'x': '❌',
        'info': 'ℹ️',
        'warning': '⚠️',
        'error': '❌'
    }

    const icon = iconMap[name] || '❓'

    return (
        <span
            className={`inline-block ${className}`}
            style={{ fontSize: `${size}px` }}
            title={name}
        >
            {icon}
        </span>
    )
}

export default IconComponent
