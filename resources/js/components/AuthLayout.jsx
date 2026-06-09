import React from 'react';
import Logo from './Logo';

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Form Area */}
      <div className="flex flex-col justify-center flex-1 px-6 py-12 lg:px-20 xl:px-24 bg-slate-950 border-r border-slate-900/60 z-10">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo / Title */}
          <div className="flex items-center space-x-3 mb-8">
            <Logo showText={true} className="w-9 h-9" textClassName="text-white text-xl" />
          </div>
          
          {children}
        </div>
      </div>

      {/* Hero Sidebar Area */}
      <div className="relative hidden w-0 flex-1 lg:block bg-slate-950">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_45%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.1),transparent_40%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>

        <div className="absolute inset-0 flex flex-col justify-between p-16">
          <div className="flex justify-between items-center text-sm font-semibold tracking-wide uppercase text-slate-400">
            <span>SaaS Fintech Platform</span>
            <span>Version 2.0</span>
          </div>

          <div className="max-w-xl">
            <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight font-display mb-6">
              Take complete control over your money with AI power.
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              Track incomes and expenses, establish goals, auto-generate real-time savings recommendations, and watch your financial health score rise.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold">JD</div>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold">AM</div>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold">OK</div>
            </div>
            <span className="text-sm text-slate-400 font-medium">Join thousands of smart spenders globally.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

