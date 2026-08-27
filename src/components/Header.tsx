import React from 'react';
import { FileText, Sparkles, LogIn, LogOut, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface HeaderProps {
  isAuthenticated: boolean;
  userEmail: string | null;
  isLoading: boolean;
  onLogin: () => void;
  onLogout: () => void;
  isPolling: boolean;
  lastScannedTime: string | null;
  onManualScan: () => void;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isAuthenticated,
  userEmail,
  isLoading,
  onLogin,
  onLogout,
  isPolling,
  lastScannedTime,
  onManualScan,
  isScanning,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg tracking-tight text-white">Document Cataloger</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3 h-3" />
                Gemini 3.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Google Drive <span className="text-slate-300 font-mono">Incoming Invoices</span> monitor & Sheets cataloger
            </p>
          </div>
        </div>

        {/* Right side: Status & Auth */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
                <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-slate-300">
                  {isPolling ? 'Live Monitor Active' : 'Monitor Idle'}
                </span>
                {lastScannedTime && (
                  <span className="text-slate-500 text-[11px] border-l border-slate-700 pl-2">
                    Synced: {lastScannedTime}
                  </span>
                )}
              </div>

              <button
                id="btn-quick-sync"
                onClick={onManualScan}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50 shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-medium text-slate-200">{userEmail || 'Connected'}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> OAuth Active
                  </div>
                </div>
                <button
                  id="btn-sign-out"
                  onClick={onLogout}
                  title="Disconnect Google Account"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              id="btn-google-login"
              onClick={onLogin}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-sm transition shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>Connect Google Drive & Sheets</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
