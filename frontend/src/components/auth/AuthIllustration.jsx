import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Instagram } from 'lucide-react';

export default function AuthIllustration({ focusedField }) {
  // Normalized mouse coordinates from -1.0 (left/top) to +1.0 (right/bottom)
  const [normMouse, setNormMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth) * 2 - 1; // -1 to +1
      const y = (e.clientY / innerHeight) * 2 - 1; // -1 to +1
      setNormMouse({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Compute pupil position (px offset relative to eye center)
  // PRIVACY RULE: Password field is completely invisible to character tracking.
  const getPupilOffset = (multiplierX = 8, multiplierY = 6) => {
    if (focusedField === 'password') {
      // Disable character eye tracking completely for password fields
      return { x: 0, y: 0 };
    }
    if (focusedField === 'email') {
      return { x: 7, y: 1 }; // Look right at form
    }
    if (focusedField === 'name' || focusedField === 'business') {
      return { x: 5, y: 1 }; // Look at non-sensitive form input
    }
    return {
      x: Math.max(-8, Math.min(8, normMouse.x * multiplierX)),
      y: Math.max(-6, Math.min(6, normMouse.y * multiplierY)),
    };
  };

  const pupil = getPupilOffset();

  // Character body tilt angle (degrees) tracking mouse & focus
  // PRIVACY RULE: Disable tracking / movement when password field is active.
  const getBodyRotation = (baseFactor = 6) => {
    if (focusedField === 'password') return 0;
    if (focusedField === 'email') return 8;
    if (focusedField === 'name' || focusedField === 'business') return 5;
    return normMouse.x * baseFactor;
  };

  // Character body X translation tracking mouse
  const getBodyX = (baseFactor = 10) => {
    if (focusedField === 'password') return 0;
    if (focusedField === 'email') return 12;
    if (focusedField === 'name' || focusedField === 'business') return 8;
    return normMouse.x * baseFactor;
  };

  return (
    <div className="relative w-full h-full bg-stone-950 overflow-hidden flex flex-col justify-between p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-stone-800/80 select-none">
      {/* Radial Glow Backdrops */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full filter blur-3xl pointer-events-none" />

      {/* Top Logo & Title */}
      <div className="relative z-20 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Coffee className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-base text-white leading-tight tracking-tight">AI Social Media Manager</h1>
          <p className="text-[11px] text-amber-500 font-semibold tracking-wide">Cafe & Restaurant Automation</p>
        </div>
      </div>

      {/* Center Character Canvas */}
      <div className="relative z-10 my-auto flex items-end justify-center h-[290px] sm:h-[330px] pb-2">
        {/* Floating Instagram Icon Pop when email field is focused */}
        <AnimatePresence>
          {focusedField === 'email' && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 15, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 22 }}
              className="absolute top-2 right-4 z-40 px-3 py-2 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 rounded-2xl shadow-xl shadow-rose-500/30 text-white flex items-center space-x-1.5"
            >
              <Instagram className="w-4 h-4" />
              <span className="text-[10px] font-bold">Auto Post Ready</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Group Character Layout */}
        <div className="relative flex items-end justify-center w-full max-w-[340px] h-[240px]">
          {/* ──────────────────────────────────────────────────────── */}
          {/* Character 1: Purple / Violet Tall Character (Back Left)   */}
          {/* ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ y: -250, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              rotate: getBodyRotation(8),
              x: getBodyX(8),
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 16,
              rotate: { type: 'spring', stiffness: 120, damping: 14 },
              x: { type: 'spring', stiffness: 120, damping: 14 },
            }}
            className="absolute left-[30px] bottom-0 w-[105px] h-[200px] bg-purple-600 border-2 border-purple-400/40 rounded-t-[36px] shadow-2xl flex flex-col items-center pt-6 z-10"
          >
            {/* Eye Sockets */}
            <div className="flex space-x-3 items-center">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-inner relative overflow-hidden">
                <motion.div
                  animate={{ x: pupil.x, y: pupil.y }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-3 h-3 bg-stone-950 rounded-full flex items-start justify-end p-0.5"
                >
                  <div className="w-1 h-1 bg-white rounded-full" />
                </motion.div>
              </div>

              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-inner relative overflow-hidden">
                <motion.div
                  animate={{ x: pupil.x, y: pupil.y }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-3 h-3 bg-stone-950 rounded-full flex items-start justify-end p-0.5"
                >
                  <div className="w-1 h-1 bg-white rounded-full" />
                </motion.div>
              </div>
            </div>

            {/* Mouth */}
            <div className="w-1.5 h-3.5 bg-stone-950 rounded-full mt-3" />
          </motion.div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* Character 2: Dark Charcoal Column (Middle Back Right)    */}
          {/* ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ y: -250, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              rotate: getBodyRotation(12),
              x: getBodyX(12),
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 16,
              delay: 0.15,
              rotate: { type: 'spring', stiffness: 140, damping: 14 },
              x: { type: 'spring', stiffness: 140, damping: 14 },
            }}
            className="absolute left-[130px] bottom-0 w-[70px] h-[145px] bg-stone-900 border-2 border-stone-700/80 rounded-t-[24px] shadow-2xl flex flex-col items-center pt-5 z-20"
          >
            {/* Eye Sockets */}
            <div className="flex space-x-2.5 items-center">
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-inner relative overflow-hidden">
                <motion.div
                  animate={{ x: pupil.x * 0.9, y: pupil.y * 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-2.5 h-2.5 bg-stone-950 rounded-full"
                />
              </div>

              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-inner relative overflow-hidden">
                <motion.div
                  animate={{ x: pupil.x * 0.9, y: pupil.y * 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-2.5 h-2.5 bg-stone-950 rounded-full"
                />
              </div>
            </div>
          </motion.div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* Character 3: Amber Orange Dome (Front Left)              */}
          {/* ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ y: -250, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              rotate: getBodyRotation(5),
              x: getBodyX(6),
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 16,
              delay: 0.05,
              rotate: { type: 'spring', stiffness: 120, damping: 14 },
              x: { type: 'spring', stiffness: 120, damping: 14 },
            }}
            className="absolute left-0 bottom-0 w-[150px] h-[120px] bg-gradient-to-br from-amber-600 to-orange-600 border-2 border-amber-400/50 rounded-t-[75px] shadow-2xl flex flex-col items-center pt-6 z-30"
          >
            {/* Eyes */}
            <div className="flex space-x-4 items-center">
              <div className="w-5 h-5 bg-stone-950 rounded-full flex items-center justify-center relative overflow-hidden">
                <motion.div
                  animate={{ x: pupil.x * 0.7, y: pupil.y * 0.7 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              </div>
              <div className="w-5 h-5 bg-stone-950 rounded-full flex items-center justify-center relative overflow-hidden">
                <motion.div
                  animate={{ x: pupil.x * 0.7, y: pupil.y * 0.7 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              </div>
            </div>

            {/* Smile Mouth */}
            <motion.div
              animate={{ scaleX: focusedField === 'email' ? 1.3 : 1 }}
              className="w-4 h-2 border-b-2 border-stone-950 rounded-full mt-2.5"
            />
          </motion.div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* Character 4: Yellow Sunshine Arch (Front Right)          */}
          {/* ──────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ y: -250, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              rotate: getBodyRotation(10),
              x: getBodyX(10),
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 16,
              delay: 0.25,
              rotate: { type: 'spring', stiffness: 130, damping: 14 },
              x: { type: 'spring', stiffness: 130, damping: 14 },
            }}
            className="absolute left-[185px] bottom-0 w-[85px] h-[115px] bg-amber-400 border-2 border-amber-300 rounded-t-[40px] shadow-2xl flex flex-col items-center pt-6 z-30"
          >
            {/* Eye */}
            <div className="w-4 h-4 bg-stone-950 rounded-full self-start ml-5 relative overflow-hidden flex items-center justify-center">
              <motion.div
                animate={{ x: pupil.x * 0.6, y: pupil.y * 0.6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-1.5 h-1.5 bg-white rounded-full"
              />
            </div>
            {/* Side Mouth Line */}
            <div className="w-4 h-0.5 bg-stone-950 rounded-full self-end mr-3 mt-3.5" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
