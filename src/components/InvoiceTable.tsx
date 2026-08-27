import React, { useState } from 'react';
import { Search, FileText, ExternalLink, Calendar, DollarSign, Building2, CheckCircle2, Eye, FileSpreadsheet } from 'lucide-react';
import { InvoiceData } from '../types.js';

interface InvoiceTableProps {
  invoices: InvoiceData[];
  onSelectInvoice: (invoice: InvoiceData) => void;
  onOpenSheetViewer: () => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  onSelectInvoice,
  onOpenSheetViewer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    return (
      inv.vendorName.toLowerCase().includes(q) ||
      inv.fileName.toLowerCase().includes(q) ||
      inv.totalInvoiceAmount.toLowerCase().includes(q) ||
      inv.dueDate.toLowerCase().includes(q) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
      {/* Header & Filter bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100">Cataloged Invoices</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {invoices.length} Extracted
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Structured records parsed by Gemini 3.5 Flash and synced to Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-invoices"
              type="text"
              placeholder="Search vendor, amount, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <button
            id="btn-open-live-sheet"
            onClick={onOpenSheetViewer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sheet Ledger</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {filteredInvoices.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-1">
              {searchTerm ? 'No invoices matched your filter' : 'No invoices cataloged yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {searchTerm
                ? 'Try searching with a different vendor name, invoice amount, or date.'
                : 'Upload an invoice document into the "Incoming Invoices" Google Drive folder or click "Upload Invoice to Drive" above to run Gemini extraction.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Vendor Name</th>
                <th className="py-3 px-4 font-semibold">Total Amount</th>
                <th className="py-3 px-4 font-semibold">Due Date</th>
                <th className="py-3 px-4 font-semibold hidden md:table-cell">Invoice #</th>
                <th className="py-3 px-4 font-semibold hidden lg:table-cell">Source File</th>
                <th className="py-3 px-4 font-semibold hidden sm:table-cell">Cataloged At</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-800/40 transition group cursor-pointer"
                  onClick={() => onSelectInvoice(inv)}
                >
                  {/* Vendor Name */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100 text-sm group-hover:text-emerald-400 transition">
                          {inv.vendorName}
                        </div>
                        {inv.summary && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 max-w-[200px]">
                            {inv.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Total Invoice Amount */}
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold text-xs">
                      {inv.totalInvoiceAmount}
                    </span>
                  </td>

                  {/* Due Date */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{inv.dueDate}</span>
                    </div>
                  </td>

                  {/* Invoice # */}
                  <td className="py-3 px-4 hidden md:table-cell font-mono text-slate-400">
                    {inv.invoiceNumber || '-'}
                  </td>

                  {/* Source File */}
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-slate-400 max-w-[180px] truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{inv.fileName}</span>
                    </div>
                  </td>

                  {/* Cataloged Timestamp */}
                  <td className="py-3 px-4 hidden sm:table-cell text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{inv.processedAt}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        title="View Gemini Extraction Details"
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {inv.driveViewLink && (
                        <a
                          href={inv.driveViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open original file in Google Drive"
                          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
