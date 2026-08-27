import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Wand2 } from 'lucide-react';
import { InvoiceData } from '../types.js';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  onSuccess: (invoice: InvoiceData) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const uploadSelectedFile = async (targetFile: File) => {
    setIsUploading(true);
    setError(null);
    setStatusMessage('Uploading to Google Drive "Incoming Invoices" folder...');

    try {
      const formData = new FormData();
      formData.append('file', targetFile);

      setStatusMessage('Uploaded to Drive! Analyzing with Gemini 3.5 Flash...');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to process and catalog invoice');
      }

      const result = await res.json();
      setStatusMessage('Extraction complete & appended to "Invoice Tracker" Google Sheet!');
      setTimeout(() => {
        onSuccess(result.invoice);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during upload and cataloging');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to create synthetic test invoice files (e.g. Acme Corporation, Global Logistics, Apex Cloud)
  const generateSampleInvoice = (vendor: string, amount: string, due: string, invNum: string) => {
    const sampleText = `=======================================================
                    TAX INVOICE
=======================================================
Vendor Name:    ${vendor}
Address:        100 Silicon Parkway, Suite 400
Tax ID / VAT:   US-84920491
Email:          billing@${vendor.toLowerCase().replace(/\s+/g, '')}.com

INVOICE DETAILS:
-------------------------------------------------------
Invoice Number: ${invNum}
Invoice Date:   August 25, 2026
Payment Terms:  Net 30 Days
Due Date:       ${due}

BILLED TO:
Client:         Apex Enterprise Solutions
Account ID:     ACC-77491

LINE ITEMS:
-------------------------------------------------------
1. Cloud Compute & AI Infrastructure (August)  : $2,800.00
2. Managed Storage & High-Speed Egress        : $450.00
3. Dedicated SLA & Support Tier                : $200.00
-------------------------------------------------------
Subtotal:                                       $3,450.00
Tax (Estimated 8.5%):                           $0.00
TOTAL INVOICE AMOUNT DUE:                      ${amount}
=======================================================
Payment Instructions: Wire Transfer to Account #992819481
Thank you for your business!
`;

    const sampleBlob = new Blob([sampleText], { type: 'text/plain' });
    const sampleFile = new File([sampleBlob], `invoice_${invNum.toLowerCase()}_${vendor.toLowerCase().replace(/\s+/g, '_')}.txt`, {
      type: 'text/plain',
    });
    setFile(sampleFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Upload Invoice to Drive</h3>
              <p className="text-xs text-slate-400">
                Adds file to <span className="text-slate-300 font-mono">Incoming Invoices</span> & catalogs to Sheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-500/10'
                : file
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-semibold text-slate-200 text-xs truncate max-w-xs">{file.name}</span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB &bull; Click or drop to replace
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-2 text-slate-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="font-medium text-slate-200 text-xs">
                  Drop invoice document here or <span className="text-indigo-400 underline">browse</span>
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Supports PDF, PNG, JPG, WEBP, TXT, CSV (up to 25MB)
                </span>
              </div>
            )}
          </div>

          {/* Preset Sample Invoices */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
              <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Or pick a sample invoice to test:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => generateSampleInvoice('Northstar Cloud Services', '$3,450.00', '2026-09-15', 'INV-9842')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition cursor-pointer"
              >
                <div className="font-semibold text-slate-200">Northstar Cloud</div>
                <div className="text-[11px] text-emerald-400 font-mono">$3,450.00 &bull; Due Sep 15</div>
              </button>
              <button
                type="button"
                onClick={() => generateSampleInvoice('Starlight Creative Agency', '$1,850.00', '2026-09-01', 'INV-2041')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition cursor-pointer"
              >
                <div className="font-semibold text-slate-200">Starlight Creative</div>
                <div className="text-[11px] text-emerald-400 font-mono">$1,850.00 &bull; Due Sep 01</div>
              </button>
            </div>
          </div>

          {/* Status / Error feedback */}
          {statusMessage && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs text-emerald-400">
              {isUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => file && uploadSelectedFile(file)}
            disabled={!file || isUploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/25"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Processing with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upload & Catalog</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
