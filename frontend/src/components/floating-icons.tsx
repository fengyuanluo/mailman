'use client';

import { Mail, Send, Inbox, Archive, Star, MessageSquare } from 'lucide-react';

export default function FloatingIcons() {
    const icons = [
        { Icon: Mail, delay: 0, duration: 15, size: 24, color: 'text-blue-400' },
        { Icon: Send, delay: 2, duration: 18, size: 20, color: 'text-purple-400' },
        { Icon: Inbox, delay: 4, duration: 20, size: 22, color: 'text-indigo-400' },
        { Icon: Archive, delay: 6, duration: 16, size: 18, color: 'text-pink-400' },
        { Icon: Star, delay: 8, duration: 22, size: 16, color: 'text-yellow-400' },
        { Icon: MessageSquare, delay: 10, duration: 19, size: 20, color: 'text-green-400' },
    ];

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {icons.map((item, index) => {
                const { Icon, delay, duration, size, color } = item;
                return (
                    <div
                        key={index}
                        className={`absolute opacity-20 ${color}`}
                        style={{
                            left: `${10 + index * 15}%`,
                            animation: `float-icon ${duration}s ease-in-out ${delay}s infinite`,
                        }}
                    >
                        <Icon size={size} />
                    </div>
                );
            })}
            <style jsx>{`
                @keyframes float-icon {
                    0% {
                        transform: translateY(100vh) rotate(0deg);
                        opacity: 0;
                    }
                    10% {
                        opacity: 0.2;
                    }
                    90% {
                        opacity: 0.2;
                    }
                    100% {
                        transform: translateY(-100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
