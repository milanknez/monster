import React, { useState, useEffect } from 'react';
import { cn } from '../../utils';

interface ResourceIconProps {
  id: string;
  config: {
    icon: string;
    hasCustomIcon?: boolean;
    customIcon?: string;
    color?: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ResourceIcon: React.FC<ResourceIconProps> = ({ id, config, size = 'md', className }) => {
  const [error, setError] = useState(false);

  // Use config-wide version if possible or a stable version
  const [v, setV] = useState(Date.now());

  // Update version on config change to potentially refresh stale images
  useEffect(() => {
    if (config?.hasCustomIcon) {
      setError(false);
      setV(Date.now());
    }
  }, [id, config?.hasCustomIcon, config?.customIcon]);

  const sizeClasses = {
    sm: 'size-6 text-sm',
    md: 'size-10 text-xl',
    lg: 'size-14 text-3xl',
    xl: 'size-20 text-5xl'
  };

  if (config?.hasCustomIcon && !error) {
    const fileName = config.customIcon || id;
    return (
      <img
        src={`/resources/${fileName}.png?v=${v}`}
        className={cn(sizeClasses[size], "object-contain", className)}
        alt={id}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className={cn(sizeClasses[size], "flex items-center justify-center", className)}>
      {config?.icon || '📦'}
    </div>
  );
};
