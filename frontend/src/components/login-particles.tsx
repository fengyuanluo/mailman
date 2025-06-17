'use client';

import { useEffect, useRef } from 'react';

export default function LoginParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 设置画布大小
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // 粒子类
        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            opacity: number;
            color: string;

            constructor(canvasWidth: number, canvasHeight: number) {
                this.x = Math.random() * canvasWidth;
                this.y = Math.random() * canvasHeight;
                this.size = Math.random() * 3 + 1;
                this.speedX = Math.random() * 2 - 1;
                this.speedY = Math.random() * 2 - 1;
                this.opacity = Math.random() * 0.5 + 0.2;

                // 随机颜色（蓝色和紫色系）
                const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#6366F1'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update(canvasWidth: number, canvasHeight: number) {
                this.x += this.speedX;
                this.y += this.speedY;

                // 边界检测
                if (this.x > canvasWidth) this.x = 0;
                if (this.x < 0) this.x = canvasWidth;
                if (this.y > canvasHeight) this.y = 0;
                if (this.y < 0) this.y = canvasHeight;
            }

            draw() {
                if (!ctx) return;
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                // 添加发光效果
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
                ctx.fill();
                ctx.restore();
            }
        }

        // 创建粒子
        const particles: Particle[] = [];
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(canvas.width, canvas.height));
        }

        // 动画循环
        let animationId: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.update(canvas.width, canvas.height);
                particle.draw();
            });

            // 绘制连线
            particles.forEach((particle, i) => {
                particles.slice(i + 1).forEach(otherParticle => {
                    const distance = Math.sqrt(
                        Math.pow(particle.x - otherParticle.x, 2) +
                        Math.pow(particle.y - otherParticle.y, 2)
                    );

                    if (distance < 150) {
                        ctx.save();
                        ctx.globalAlpha = (1 - distance / 150) * 0.2;
                        ctx.strokeStyle = particle.color;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.stroke();
                        ctx.restore();
                    }
                });
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        // 清理
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: 0.3 }}
        />
    );
}
