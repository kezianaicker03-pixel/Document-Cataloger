import React from 'react';
import { Play, Pause, RefreshCw, UploadCloud, RotateCcw, Clock, ShieldCheck } from 'lucide-react';

interface MonitorControlsProps {
  isPolling: boolean;
  onTogglePolling: () => void;
  pollingIntervalSec: number;
  onChangePollingInterval: (sec: number) => void;
  onScanNow: () => void;
  isScanning: boolean;
  onOpenUpload: () => void;
  onResetCache: () => void;
  countdown: number;
  catalogedCount: number;
  pendingCount: number;
}

export const MonitorControls: React.FC<MonitorControlsProps> = ({
  isPolling,
  onTogglePolling,
  pollingIntervalSec,
  onChangePollingInterval,
  onScanNow,
  isScanning,
  onOpenUpload,
  onResetCache,
  countdown,
  catalogedCount,
  pendingCount,
}) => {
  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      {/* Left: Auto-monitoring toggle & interval */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          id="btn-toggle-auto-monitor"
          onClick={onTogglePolling}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            isPolling
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
          }`}
        >
          {isPolling ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Monitoring Active ({countdown}s)</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Start Auto-Monitor</span>
            </>
          )}
        </button>

        {isPolling && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Poll every:</span>
            <select
              id="select-poll-interval"
              value={pollingIntervalSec}
              onChange={(e) => onChangePollingInterval(Number(e.target.value))}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value={15} className="bg-slate-900 text-slate-100">15s</option>
              <option value={30} className="bg-slate-900 text-slate-100">30s</option>
              <option value={60} className="bg-slate-900 text-slate-100">60s</option>
            </select>
          </div>
        )}

        <div className="text-xs text-slate-400 hidden lg:flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>Syncs new uploads automatically</span>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
        <button
          id="btn-upload-invoice-modal"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-indigo-600/20"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Invoice to Drive</span>
        </button>

        <button
          id="btn-scan-and-catalog"
          onClick={onScanNow}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-600/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Extracting with Gemini...' : 'Scan & Catalog Now'}</span>
        </button>

        <button
          id="btn-reset-cache"
          onClick={onResetCache}
          title="Reset local catalog cache to re-inspect all files in folder"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
