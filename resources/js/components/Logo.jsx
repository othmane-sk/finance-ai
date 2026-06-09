import React from 'react';

export default function Logo({ className = "w-8 h-8", showText = false, textClassName = "text-indigo-950 dark:text-white" }) {
  return (
    <div className="flex items-center space-x-2.5">
      <div className={`${className} relative flex-shrink-0 flex items-center justify-center`}>
        {/* Modern Fintech AI Chevron Overlap Logo */}
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
          <defs>
            <linearGradient id="logo-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="logo-grad-secondary" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          {/* Main Left Pillar */}
          <path d="M25 15C25 12.2386 27.2386 10 30 10H50C66.5685 10 80 23.4315 80 40C80 56.5685 66.5685 70 50 70H35V85C35 87.7614 32.7614 90 30 90C27.2386 90 25 87.7614 25 85V15Z" fill="url(#logo-grad-primary)" />
          {/* Accent Chevron / Spark Line */}
          <path d="M45 45L65 25M65 25H50M65 25V40" stroke="url(#logo-grad-secondary)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          {/* AI Spark element */}
          <circle cx="65" cy="25" r="7" fill="#A3E635" className="animate-pulse" />
        </svg>
      </div>
      {showText && (
        <span className={`font-extrabold tracking-tight font-display text-lg ${textClassName}`}>
          Finance AI
        </span>
      )}
    </div>
  );
}
