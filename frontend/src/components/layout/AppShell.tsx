import { motion } from 'framer-motion';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Github } from 'lucide-react';
import { cn } from '../../lib/cn';
import { DemoControls } from '../demo/DemoControls';

export function AppShell() {
  return (
    <div className="relative min-h-screen bg-slate-100 text-slate-900">
      <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-orange-400" />

      <header className="relative z-50 border-b border-slate-200 bg-white/90 backdrop-blur pointer-events-auto">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <motion.div
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/40"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <span className="text-lg font-semibold text-emerald-500">✈</span>
            </motion.div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                FlightLens
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                Flight search demo
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-4 text-xs font-medium text-slate-600 md:flex">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3 py-1 transition-colors',
                    isActive ? 'bg-slate-900 text-slate-50' : 'hover:bg-slate-100'
                  )
                }
              >
                Demo
              </NavLink>
              <a
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-slate-600 hover:bg-slate-100"
              >
                <Github className="h-3.5 w-3.5" />
                <span>GitHub</span>
              </a>
            </nav>
            <DemoControls />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-1 flex-col px-4 pb-10 pt-4 md:px-6 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}

