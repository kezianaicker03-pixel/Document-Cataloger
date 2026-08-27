import React from 'react';
import { X, Building2, Calendar, DollarSign, FileText, ExternalLink, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { InvoiceData } from '../types.js';

interface InvoiceDetailModalProps {
  invoice: InvoiceData | null;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
}) => {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Invoice Extraction Details</h3>
              <p className="text-xs text-slate-400">
                Gemini 3.5 Flash structured output & Google Sheets record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-purple-400" /> Vendor Name
              </div>
              <div className="text-sm font-semibold text-slate-100">{invoice.vendorName}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-400" /> Total Invoice Amount
              </div>
              <div className="text-sm font-semibold text-emerald-400 font-mono">{invoice.totalInvoiceAmount}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" /> Due Date
              </div>
              <div className="text-sm font-semibold text-slate-200 font-mono">{invoice.dueDate}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-400" /> Invoice #
              </div>
              <div className="text-sm font-semibold text-slate-200 font-mono">{invoice.invoiceNumber || 'N/A'}</div>
            </div>
          </div>

          {/* Summary & Metadata */}
          {invoice.summary && (
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="text-[11px] text-slate-500 font-medium mb-1">Extracted Summary</div>
              <div className="text-slate-300 leading-relaxed">{invoice.summary}</div>
            </div>
          )}

          {/* Audit & File Info */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Source File:</span>
              <span className="font-mono text-slate-200 truncate max-w-[220px]">{invoice.fileName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Cataloged At:</span>
              <span className="text-slate-200">{invoice.processedAt}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Status:</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Appended to 'Invoice Tracker'
              </span>
            </div>
            {invoice.confidenceScore !== undefined && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Model Confidence:</span>
                <span className="text-purple-400 font-mono">
                  {Math.round(invoice.confidenceScore * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          {invoice.driveViewLink ? (
            <a
              href={invoice.driveViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium text-xs transition"
            >
              <span>Open in Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
