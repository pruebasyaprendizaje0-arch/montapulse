import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

interface LikeFeedbackProps {
  x: number;
  y: number;
  onComplete: () => void;
}

export const LikeFeedback: React.FC<LikeFeedbackProps> = ({ x, y, onComplete }) => {
  const [particles, setParticles] = useState<{ id: number; angle: number; velocity: number; size: number }[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      angle: (i * 45 * Math.PI) / 180,
      velocity: 2 + Math.random() * 2,
      size: 4 + Math.random() * 4
    }));
    setParticles(newParticles);

    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="fixed z-[999] pointer-events-none"
      style={{ left: x, top: y }}
    >
      {/* Main Heart Pop */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 animate-like-pop">
        <Heart className="w-12 h-12 text-pink-500 fill-current drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
      </div>

      {/* Sparkles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full bg-pink-400 opacity-0 animate-like-particle"
          style={{
            '--angle': `${p.angle}rad`,
            '--velocity': p.velocity,
            '--size': `${p.size}px`,
            width: p.size,
            height: p.size,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
