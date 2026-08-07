import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function AuthInput({
  label,
  icon: Icon,
  type = 'text',
  placeholder,
  error,
  register,
  name,
  disabled = false,
  required = false,
  onFocus,
  onBlur,
  onTogglePasswordShow,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const handleTogglePassword = () => {
    const nextState = !showPassword;
    setShowPassword(nextState);
    if (onTogglePasswordShow) {
      onTogglePasswordShow(nextState);
    }
  };

  const registeredProps = register ? register(name) : {};

  return (
    <div className="space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-semibold text-stone-300">
          {label}
          {required && <span className="text-amber-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          {...registeredProps}
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={(e) => {
            if (registeredProps.onFocus) registeredProps.onFocus(e);
            if (onFocus) onFocus(name);
          }}
          onBlur={(e) => {
            if (registeredProps.onBlur) registeredProps.onBlur(e);
            if (onBlur) onBlur();
          }}
          className={`w-full ${
            Icon ? 'pl-10' : 'pl-4'
          } ${isPassword ? 'pr-10' : 'pr-4'} py-2.5 bg-stone-900 border ${
            error ? 'border-rose-500/80 focus:border-rose-500' : 'border-stone-700 focus:border-amber-500'
          } rounded-xl text-white text-sm placeholder-stone-500 transition-colors outline-none disabled:opacity-50`}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleTogglePassword}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white transition p-1 cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center space-x-1 text-xs text-rose-400 pt-0.5"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error.message || error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
