import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building, Mail, Lock, AlertTriangle } from 'lucide-react';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import { useAuthStore } from '../../store/authStore';

const signupSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    businessName: z.string().min(1, 'Restaurant name is required'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function SignupForm({ onToggleLogin, onFocusField, onTogglePasswordShow }) {
  const { signup, isLoading, error } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      businessName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    await signup(data.email, data.password, data.fullName, data.businessName);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Create Your Account</h2>
        <p className="text-xs text-stone-400">
          Create beautiful restaurant content and manage your social presence effortlessly.
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <AuthInput
            label="Full Name"
            icon={User}
            name="fullName"
            placeholder="e.g. Abdullah Qureshi"
            register={register}
            error={errors.fullName}
            onFocus={() => onFocusField && onFocusField('name')}
            onBlur={() => onFocusField && onFocusField(null)}
            required
          />

          <AuthInput
            label="Restaurant Name"
            icon={Building}
            name="businessName"
            placeholder="e.g. Musafor Cafe"
            register={register}
            error={errors.businessName}
            onFocus={() => onFocusField && onFocusField('business')}
            onBlur={() => onFocusField && onFocusField(null)}
            required
          />
        </div>

        <AuthInput
          label="Email Address"
          icon={Mail}
          type="email"
          name="email"
          placeholder="owner@restaurant.com"
          register={register}
          error={errors.email}
          onFocus={() => onFocusField && onFocusField('email')}
          onBlur={() => onFocusField && onFocusField(null)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <AuthInput
            label="Password"
            icon={Lock}
            type="password"
            name="password"
            placeholder="••••••••"
            register={register}
            error={errors.password}
            onFocus={() => onFocusField && onFocusField('password')}
            onBlur={() => onFocusField && onFocusField(null)}
            onTogglePasswordShow={onTogglePasswordShow}
            required
          />

          <AuthInput
            label="Confirm Password"
            icon={Lock}
            type="password"
            name="confirmPassword"
            placeholder="••••••••"
            register={register}
            error={errors.confirmPassword}
            onFocus={() => onFocusField && onFocusField('password')}
            onBlur={() => onFocusField && onFocusField(null)}
            onTogglePasswordShow={onTogglePasswordShow}
            required
          />
        </div>

        <div className="pt-1">
          <AuthButton
            type="submit"
            variant="primary"
            isLoading={isLoading}
            loadingText="Creating account..."
          >
            Create Account & Get Started
          </AuthButton>
        </div>
      </form>

      {/* Switch to Login Toggle Link */}
      <div className="text-center pt-1">
        <p className="text-xs text-stone-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onToggleLogin}
            className="font-bold text-amber-400 hover:text-amber-300 transition underline underline-offset-4 cursor-pointer"
          >
            Sign In Here
          </button>
        </p>
      </div>
    </div>
  );
}
