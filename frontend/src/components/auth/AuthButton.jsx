import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function AuthButton({
  children,
  type = 'button',
  variant = 'primary',
  isLoading = false,
  loadingText,
  icon: Icon,
  disabled = false,
  onClick,
  className = '',
}) {
  const isPrimary = variant === 'primary';

  const baseStyles = 'w-full py-3 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = isPrimary
    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 shadow-lg shadow-amber-500/20 border border-amber-400/30'
    : 'bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700';

  return (
    <motion.button
      whileHover={disabled || isLoading ? {} : { scale: 1.015 }}
      whileTap={disabled || isLoading ? {} : { scale: 0.985 }}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{loadingText || 'Processing...'}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 text-current" />}
          <span>{children}</span>
        </>
      )}
    </motion.button>
  );
}
