import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthIllustration from './AuthIllustration';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isPasswordShow, setIsPasswordShow] = useState(false);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none">
      {/* Background Subtle Ambient Glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Main Split Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1020px] min-h-[620px] rounded-3xl glass-card border border-stone-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10"
      >
        {/* Left Side Interactive Illustration (5 cols = ~42-45%) */}
        <div className="lg:col-span-5 flex">
          <AuthIllustration focusedField={focusedField} isPasswordShow={isPasswordShow} />
        </div>

        {/* Right Side Form Container (7 cols = ~55-58%) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-stone-900/60 backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {isSignup ? (
              <motion.div
                key="signup-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <SignupForm
                  onToggleLogin={() => setIsSignup(false)}
                  onFocusField={setFocusedField}
                  onTogglePasswordShow={setIsPasswordShow}
                />
              </motion.div>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <LoginForm
                  onToggleSignup={() => setIsSignup(true)}
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
