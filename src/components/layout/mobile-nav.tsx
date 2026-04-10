'use client';

import { motion } from 'framer-motion';
import { ScanLine, FolderOpen, FileText } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ViewType } from '@/lib/types';

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: 'home', label: 'Scan', icon: <ScanLine className="h-5 w-5" /> },
  { view: 'documents', label: 'Docs', icon: <FolderOpen className="h-5 w-5" /> },
];

export function MobileNav() {
  const { view, setView, resetEditor } = useAppStore();

  const handleNavClick = (navView: ViewType) => {
    if (view === 'editor' || view === 'ocr') {
      resetEditor();
    }
    setView(navView);
  };

  // Hide mobile nav on editor/ocr views
  if (view === 'editor' || view === 'ocr') return null;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 glass sm:hidden"
    >
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map((item) => {
          const isActive = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => handleNavClick(item.view)}
              className="relative flex flex-col items-center gap-1 rounded-xl px-6 py-2 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileNav"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className={`relative z-10 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.icon}
              </span>
              <span className={`relative z-10 text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
