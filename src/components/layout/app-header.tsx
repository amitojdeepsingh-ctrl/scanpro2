'use client';

import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export function AppHeader() {
  const { view, setView, goBack, resetEditor } = useAppStore();
  const showBack = view === 'editor' || view === 'ocr';

  const handleBack = () => {
    if (view === 'editor') {
      resetEditor();
    }
    goBack();
  };

  const handleNavClick = (navView: 'home' | 'documents') => {
    if (view === 'editor' || view === 'ocr') {
      resetEditor();
    }
    setView(navView);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 w-full border-b border-border/50 glass"
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-9 w-9 rounded-xl"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                <line x1="7" y1="12" x2="17" y2="12"/>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="gradient-text">Scan</span>
              <span className="text-foreground">Pro</span>
            </span>
          </button>
        </div>

        {/* Center - Desktop Navigation Tabs */}
        <nav className="hidden sm:flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          {[
            { view: 'home' as const, label: 'Scan', icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg> },
            { view: 'documents' as const, label: 'Documents', icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
          ].map((item) => (
            <button
              key={item.view}
              onClick={() => handleNavClick(item.view)}
              className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                view === item.view
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {view === item.view && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-background shadow-sm"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Right - Theme Toggle handled by page */}
        <div className="w-9" /> {/* Spacer for balance */}
      </div>
    </motion.header>
  );
}
