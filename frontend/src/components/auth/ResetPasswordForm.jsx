import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import { useAuthStore } from '../../store/authStore';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ResetPasswordForm({ token, onBackToLogin, onFocusField, onTogglePasswordShow }) {
  const { resetPassword, isLoading } = useAuthStore();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data) => {
    setServerError(null);
    if (!token) {
      setServerError('Missing or invalid reset token.');
      return;
    }
    const res = await resetPassword(token, data.newPassword);
    if (res.success) {
      setSuccess(true);
    } else {
      setServerError(res.error || 'Failed to reset password.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h2>
        <p className="text-xs text-stone-400">
          Set a new strong password for your account.
        </p>
      </div>

      {success ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 space-y-4 shadow-xl text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <div>
            <h4 className="font-bold text-white text-base">Password Reset Successfully</h4>
            <p className="text-zinc-300 mt-1 text-xs">
              Your account password has been updated. You can now log in with your new credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs shadow-lg transition flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </button>
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
            label="New Password"
            icon={Lock}
            type="password"
            name="newPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            register={register}
            error={errors.newPassword}
            onFocus={() => onFocusField && onFocusField('password')}
            onBlur={() => onFocusField && onFocusField(null)}
            onTogglePasswordShow={onTogglePasswordShow}
            required
          />

          <AuthInput
            label="Confirm New Password"
            icon={Lock}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            register={register}
            error={errors.confirmPassword}
            onFocus={() => onFocusField && onFocusField('password')}
            onBlur={() => onFocusField && onFocusField(null)}
            onTogglePasswordShow={onTogglePasswordShow}
            required
          />

          <AuthButton
            type="submit"
            variant="primary"
            isLoading={isLoading}
            loadingText="Resetting Password..."
          >
            Reset Password
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
