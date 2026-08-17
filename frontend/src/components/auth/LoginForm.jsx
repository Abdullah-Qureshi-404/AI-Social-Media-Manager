import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Sparkles, AlertTriangle } from 'lucide-react';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import { useAuthStore } from '../../store/authStore';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginForm({ onToggleSignup, onToggleForgotPassword, onFocusField, onTogglePasswordShow }) {
  const { login, loginAsDemo, isLoading, error } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    await login(data.email, data.password);
  };

  const showDemoLogin = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome Back</h2>
        <p className="text-xs text-stone-400">
          Sign in to manage your AI-powered social media posts and automation.
        </p>
      </div>

      {/* Top API Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-2"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <AuthInput
          label="Email Address"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="owner@restaurant.com"
          register={register}
          error={errors.email}
          onFocus={() => onFocusField && onFocusField('email')}
          onBlur={() => onFocusField && onFocusField(null)}
          required
        />

        <div className="space-y-1">
          <AuthInput
            label="Password"
            icon={Lock}
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            register={register}
            error={errors.password}
            onFocus={() => onFocusField && onFocusField('password')}
            onBlur={() => onFocusField && onFocusField(null)}
            onTogglePasswordShow={onTogglePasswordShow}
            required
          />
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onToggleForgotPassword}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <AuthButton
          type="submit"
          variant="primary"
          isLoading={isLoading}
          loadingText="Logging in..."
        >
          Sign In to Dashboard
        </AuthButton>
      </form>

      {/* Environment-Gated Demo Login Button */}
      {showDemoLogin && (
        <div className="space-y-3 pt-2 border-t border-stone-800/80">
          <AuthButton
            type="button"
            variant="secondary"
            icon={Sparkles}
            isLoading={isLoading}
            onClick={loginAsDemo}
          >
            Try Demo Account (1-Click)
          </AuthButton>
        </div>
      )}

      {/* Switch to Signup Toggle Link */}
      <div className="text-center pt-2">
        <p className="text-xs text-stone-400">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onToggleSignup}
            className="font-bold text-amber-400 hover:text-amber-300 transition underline underline-offset-4 cursor-pointer"
          >
            Create Your Account
          </button>
        </p>
      </div>
    </div>
  );
}
