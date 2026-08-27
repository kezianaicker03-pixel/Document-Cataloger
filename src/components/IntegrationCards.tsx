import React from 'react';
import { FolderCheck, Table, Sparkles, ExternalLink, HardDrive, FileSpreadsheet, Cpu, CheckCircle2 } from 'lucide-react';
import { DriveFolderInfo, SheetsTrackerInfo } from '../types.js';

interface IntegrationCardsProps {
  folder: DriveFolderInfo | null;
  sheet: SheetsTrackerInfo | null;
  catalogedCount: number;
  pendingCount: number;
  onOpenSheetViewer: () => void;
}

export const IntegrationCards: React.FC<IntegrationCardsProps> = ({
  folder,
  sheet,
  catalogedCount,
  pendingCount,
  onOpenSheetViewer,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Drive Folder Card */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4.5 flex flex-col justify-between hover:border-slate-700 transition">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Google Drive Source</h2>
                <div className="text-sm font-medium text-slate-100 font-mono">Incoming Invoices</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4 line-clamp-2">
            Monitoring new PDF and image files uploaded to this folder in your personal Drive.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Files:</span>
            <span className="font-semibold text-slate-200">{folder?.fileCount ?? 0}</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                {pendingCount} pending
              </span>
            )}
          </div>
          {folder?.webViewLink && (
            <a
              id="link-open-drive-folder"
              href={folder.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition"
            >
              <span>Open in Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Google Sheets Destination Card */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4.5 flex flex-col justify-between hover:border-slate-700 transition">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Google Sheets Ledger</h2>
                <div className="text-sm font-medium text-slate-100 font-mono">Invoice Tracker</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Synced
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4 line-clamp-2">
            Structured records appended directly with Vendor Name, Total Amount, Due Date & metadata.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Rows:</span>
            <span className="font-semibold text-slate-200">{sheet?.rowCount ?? 0}</span>
            <button
              id="btn-preview-sheet-modal"
              onClick={onOpenSheetViewer}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-1 cursor-pointer"
            >
              Preview
            </button>
          </div>
          {sheet?.webViewLink && (
            <a
              id="link-open-sheets-tracker"
              href={sheet.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              <span>Open in Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Gemini AI Extractor Card */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4.5 flex flex-col justify-between hover:border-slate-700 transition">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI Intelligence Engine</h2>
                <div className="text-sm font-medium text-slate-100 flex items-center gap-1.5">
                  <span>Gemini 3.5 Flash</span>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
              Multimodal
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4 line-clamp-2">
            Extracts Vendor Name, Total Invoice Amount, Due Date & Invoice ID from PDFs and receipts.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Extraction speed:</span>
            <span className="text-emerald-400 font-medium font-mono">~800ms</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Schema: JSON Strict</span>
        </div>
      </div>
    </div>
  );
};
