// src/components/ui/GlassPanel.tsx
import React from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'dark' | 'light';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  ...props 
}) => {
  const variants = {
    default: 'bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-2xl',
    dark: 'bg-black/60 backdrop-blur-xl border border-white/5 shadow-xl',
    light: 'bg-white/10 backdrop-blur-md border border-white/10 shadow-lg',
  };

  return (
    <div 
      className={`${variants[variant]} rounded-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
