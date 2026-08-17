import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export default function ForgotPasswordForm({ onBackToLogin, onFocusField }) {
  const { forgotPassword, isLoading } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    setServerError(null);
    const res = await forgotPassword(data.email);
    if (res.success) {
      setSubmitted(true);
    } else {
      setServerError(res.error || 'Failed to request password reset');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Forgot Password?</h2>
        <p className="text-xs text-stone-400">
          Enter your registered email address and we&apos;ll send you a password reset link.
        </p>
      </div>

      {submitted ? (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-3 shadow-xl">
          <div className="flex items-center space-x-2 font-bold text-amber-400 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Check Your Email</span>
          </div>
          <p className="leading-relaxed text-zinc-300">
            If an account exists for that email, a password reset link has been sent. Please check your inbox and follow the instructions.
          </p>
          <p className="text-[11px] text-zinc-400">
            Link expires in 30 minutes.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

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

          <AuthButton
            type="submit"
            variant="primary"
            isLoading={isLoading}
            loadingText="Sending link..."
          >
            Send Reset Link
          </AuthButton>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs font-semibold text-zinc-400 hover:text-amber-400 transition inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
