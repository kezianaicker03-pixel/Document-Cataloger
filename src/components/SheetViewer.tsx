import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ExternalLink, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';

interface SheetViewerProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
}

export const SheetViewer: React.FC<SheetViewerProps> = ({
  isOpen,
  onClose,
  accessToken,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    sheetTitle: string;
    webViewLink: string;
    headers: string[];
    rows: string[][];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSheetData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sheet-data', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to load Google Sheet data');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching sheet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSheetData();
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-100">
                  {data?.sheetTitle || 'Invoice Tracker'} (Live Google Sheet)
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct view of the rows synced by the Document Cataloger backend.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSheetData}
              disabled={loading}
              title="Refresh Sheet Rows"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {data?.webViewLink && (
              <a
                href={data.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sheet Content Area */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Fetching live rows from Google Sheets API...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-400 text-xs">
              {error}
            </div>
          ) : data && data.rows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              The 'Invoice Tracker' spreadsheet is currently initialized with header columns, but no invoices have been appended yet.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-x-auto shadow-inner bg-slate-950/60">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-800/90 text-slate-200 border-b border-slate-700">
                    <th className="py-2.5 px-3 w-10 text-center text-slate-500 font-semibold border-r border-slate-700">#</th>
                    {data?.headers.map((h, i) => (
                      <th key={i} className="py-2.5 px-3.5 font-semibold text-slate-300 border-r border-slate-700/80 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {data?.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2 px-3 text-center text-slate-500 border-r border-slate-800 bg-slate-950/40">
                        {rIdx + 2}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2 px-3.5 text-slate-300 border-r border-slate-800/50 whitespace-nowrap max-w-xs truncate">
                          {cell?.startsWith('http') ? (
                            <a
                              href={cell}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3 inline" />
                              <span>View File</span>
                            </a>
                          ) : (
                            cell || '-'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Total Rows in Sheet: <span className="font-semibold text-slate-200">{(data?.rows.length ?? 0) + 1}</span> (including header)
          </div>
          <div className="text-[11px] text-slate-500">
            Automated sync managed by Document Cataloger
          </div>
        </div>
      </div>
    </div>
  );
};
