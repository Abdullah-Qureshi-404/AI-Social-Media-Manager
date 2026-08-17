import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthIllustration from './AuthIllustration';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResetPasswordForm from './ResetPasswordForm';

export default function AuthPage() {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset'
  const [resetToken, setResetToken] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [isPasswordShow, setIsPasswordShow] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');

    if (path === '/reset-password' || tokenParam) {
      setAuthMode('reset');
      if (tokenParam) setResetToken(tokenParam);
    } else if (path === '/forgot-password') {
      setAuthMode('forgot');
    }
  }, []);

  const navigateTo = (mode, updateUrl = true) => {
    setAuthMode(mode);
    if (updateUrl) {
      let targetPath = '/';
      if (mode === 'forgot') targetPath = '/forgot-password';
      if (mode === 'reset') targetPath = resetToken ? `/reset-password?token=${resetToken}` : '/reset-password';
      window.history.pushState({}, document.title, targetPath);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none relative">
      {/* Background Warm Amber Radial Glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-amber-500/[0.04] rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Main Split Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1020px] min-h-[620px] rounded-3xl bg-[#1a1a1a]/90 border border-white/[0.08] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 backdrop-blur-md"
      >
        {/* Left Side Interactive Illustration */}
        <div className="lg:col-span-5 flex">
          <AuthIllustration focusedField={focusedField} isPasswordShow={isPasswordShow} />
        </div>

        {/* Right Side Form Container */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-[#0f0f0f]/60 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {authMode === 'signup' && (
              <motion.div
                key="signup-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <SignupForm
                  onToggleLogin={() => navigateTo('login')}
                  onFocusField={setFocusedField}
                  onTogglePasswordShow={setIsPasswordShow}
                />
              </motion.div>
            )}

            {authMode === 'forgot' && (
              <motion.div
                key="forgot-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <ForgotPasswordForm
                  onBackToLogin={() => navigateTo('login')}
                  onFocusField={setFocusedField}
                />
              </motion.div>
            )}

            {authMode === 'reset' && (
              <motion.div
                key="reset-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <ResetPasswordForm
                  token={resetToken}
                  onBackToLogin={() => navigateTo('login')}
                  onFocusField={setFocusedField}
                  onTogglePasswordShow={setIsPasswordShow}
                />
              </motion.div>
            )}

            {authMode === 'login' && (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <LoginForm
                  onToggleSignup={() => navigateTo('signup')}
                  onToggleForgotPassword={() => navigateTo('forgot')}
                  onFocusField={setFocusedField}
                  onTogglePasswordShow={setIsPasswordShow}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
