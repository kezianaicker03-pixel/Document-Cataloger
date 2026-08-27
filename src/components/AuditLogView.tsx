import React, { useState } from 'react';
import { Terminal, CheckCircle2, AlertCircle, Info, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { AuditLogEntry } from '../types.js';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs shadow-inner">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-left hover:bg-slate-900 transition cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-slate-200">Autonomous Activity & Audit Console</span>
            <span className="text-[10px] text-slate-500 ml-2">({logs.length} events logged)</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[11px] hidden sm:inline text-slate-500">Live Drive & Gemini Pipeline</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Log Feed */}
      {isExpanded && (
        <div className="p-3 max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin">
          {logs.length === 0 ? (
            <div className="py-6 text-center text-slate-600 text-xs font-sans">
              Waiting for activity. Click "Scan & Catalog Now" or upload an invoice to start processing.
            </div>
          ) : (
            logs.map((log) => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              let icon = <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />;
              let textColor = 'text-slate-300';

              if (log.level === 'success') {
                icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
                textColor = 'text-emerald-300';
              } else if (log.level === 'error') {
                icon = <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />;
                textColor = 'text-rose-300';
              } else if (log.level === 'warning') {
                icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
                textColor = 'text-amber-300';
              }

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 py-1 px-2 rounded hover:bg-slate-900/60 transition text-[11px] leading-relaxed"
                >
                  <span className="text-slate-600 select-none shrink-0">[{time}]</span>
                  {icon}
                  <span className={`${textColor} break-all`}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
