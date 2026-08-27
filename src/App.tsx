import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleAuth } from './lib/useGoogleAuth.js';
import { Header } from './components/Header.js';
import { IntegrationCards } from './components/IntegrationCards.js';
import { MonitorControls } from './components/MonitorControls.js';
import { InvoiceTable } from './components/InvoiceTable.js';
import { SheetViewer } from './components/SheetViewer.js';
import { UploadModal } from './components/UploadModal.js';
import { InvoiceDetailModal } from './components/InvoiceDetailModal.js';
import { AuditLogView } from './components/AuditLogView.js';
import {
  InvoiceData,
  DriveFolderInfo,
  SheetsTrackerInfo,
  AuditLogEntry,
  CatalogerStatusResponse,
} from './types.js';
import {
  FileText,
  Sparkles,
  ArrowRight,
  HardDrive,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function App() {
  const {
    accessToken,
    isAuthenticated,
    isLoading: isAuthLoading,
    userEmail,
    error: authError,
    login,
    logout,
    setUserEmail,
  } = useGoogleAuth();

  // Application State
  const [folder, setFolder] = useState<DriveFolderInfo | null>(null);
  const [sheet, setSheet] = useState<SheetsTrackerInfo | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [catalogedCount, setCatalogedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastScannedTime, setLastScannedTime] = useState<string | null>(null);

  // Scanning & Polling State
  const [isScanning, setIsScanning] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [pollingIntervalSec, setPollingIntervalSec] = useState(30);
  const [countdown, setCountdown] = useState(30);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSheetViewerOpen, setIsSheetViewerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  const countdownRef = useRef<number>(30);

  // Fetch status from server
  const fetchStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/status', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to retrieve cataloger status');
      }

      const data: CatalogerStatusResponse = await res.json();
      setFolder(data.folder);
      setSheet(data.sheet);
      setCatalogedCount(data.catalogedCount);
      setPendingCount(data.pendingCount);
      if (data.userEmail) {
        setUserEmail(data.userEmail);
      }
      if (data.recentInvoices && data.recentInvoices.length > 0) {
        setInvoices((prev) => {
          const map = new Map<string, InvoiceData>();
          // Combine existing with incoming
          [...data.recentInvoices, ...prev].forEach((inv) => map.set(inv.id, inv));
          return Array.from(map.values());
        });
      }
      if (data.auditLogs) {
        setAuditLogs(data.auditLogs);
      }
      setErrorBanner(null);
    } catch (err: any) {
      console.error('Status fetch error:', err);
    }
  }, [accessToken, logout, setUserEmail]);

  // Trigger manual or automatic scan
  const triggerScan = useCallback(async () => {
    if (!accessToken || isScanning) return;
    setIsScanning(true);
    setErrorBanner(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Scan failed');
      }

      const result = await res.json();
      setLastScannedTime(new Date().toLocaleTimeString());

      if (result.invoices && result.invoices.length > 0) {
        setInvoices((prev) => {
          const map = new Map<string, InvoiceData>();
          [...result.invoices, ...prev].forEach((inv: InvoiceData) => map.set(inv.id, inv));
          return Array.from(map.values());
        });
      }

      // Refresh full status
      await fetchStatus();
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorBanner(err.message || 'Failed to scan and catalog files');
    } finally {
      setIsScanning(false);
      setCountdown(pollingIntervalSec);
      countdownRef.current = pollingIntervalSec;
    }
  }, [accessToken, isScanning, pollingIntervalSec, fetchStatus]);

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchStatus();
      // Run first scan
      triggerScan();
    }
  }, [isAuthenticated, accessToken]);

  // Polling timer
  useEffect(() => {
    if (!isAuthenticated || !isPolling) return;

    countdownRef.current = pollingIntervalSec;
    setCountdown(pollingIntervalSec);

    const interval = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);

      if (countdownRef.current <= 0) {
        countdownRef.current = pollingIntervalSec;
        setCountdown(pollingIntervalSec);
        triggerScan();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isPolling, pollingIntervalSec, triggerScan]);

  const handleResetCache = async () => {
    if (!accessToken) return;
    try {
      await fetch('/api/reset-cache', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      await triggerScan();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadSuccess = (newInvoice: InvoiceData) => {
    setInvoices((prev) => [newInvoice, ...prev.filter((i) => i.id !== newInvoice.id)]);
    fetchStatus();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Header */}
      <Header
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        isLoading={isAuthLoading}
        onLogin={login}
        onLogout={logout}
        isPolling={isPolling}
        lastScannedTime={lastScannedTime}
        onManualScan={triggerScan}
        isScanning={isScanning}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Banner */}
        {(errorBanner || authError) && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-3 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorBanner || authError}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-rose-400 hover:text-rose-200 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {!isAuthenticated ? (
          /* Unauthenticated Landing / Connect Hero */
          <div className="py-12 md:py-20 flex flex-col items-center text-center max-w-3xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              Autonomous Cloud Run Invoice Processor
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Catalog invoices from <span className="text-emerald-400 font-mono">Google Drive</span> into <span className="text-emerald-400 font-mono">Google Sheets</span> with Gemini
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Connect your Google Workspace. The backend automatically monitors your{' '}
                <strong className="text-slate-200 font-mono">Incoming Invoices</strong> folder, extracts{' '}
                <strong className="text-slate-200">Vendor Name</strong>, <strong className="text-slate-200">Total Amount</strong>, and{' '}
                <strong className="text-slate-200">Due Date</strong> using <strong className="text-emerald-300">Gemini 3.5 Flash</strong>, and appends structured rows to{' '}
                <strong className="text-slate-200 font-mono">Invoice Tracker</strong>.
              </p>
            </div>

            {/* Pipeline Architecture Diagram */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <HardDrive className="w-5 h-5" />
                  <span className="font-semibold text-xs text-slate-200">1. Drive Monitor</span>
                </div>
                <p className="text-xs text-slate-400">
                  Monitors the <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">Incoming Invoices</code> folder for newly uploaded receipts and invoice PDFs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold text-xs text-slate-200">2. Gemini 3.5 Flash</span>
                </div>
                <p className="text-xs text-slate-400">
                  Multimodal model extracts Vendor Name, Total Invoice Amount, Due Date, and reference details.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-semibold text-xs text-slate-200">3. Sheets Ledger</span>
                </div>
                <p className="text-xs text-slate-400">
                  Appends extracted details as structured rows directly to your <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">Invoice Tracker</code> spreadsheet.
                </p>
              </div>
            </div>

            {/* Login Action Button */}
            <div className="pt-4 flex flex-col items-center gap-3">
              <button
                id="btn-hero-google-login"
                onClick={login}
                disabled={isAuthLoading}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition shadow-xl shadow-emerald-500/25 cursor-pointer disabled:opacity-60"
              >
                <Zap className="w-4 h-4" />
                <span>Connect with Google to Start Cataloging</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-slate-500">
                Requires read/write access to your Drive and Sheets to create the folders and tracker ledger.
              </span>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="space-y-6">
            {/* Top Cards: Drive, Sheets & Gemini */}
            <IntegrationCards
              folder={folder}
              sheet={sheet}
              catalogedCount={catalogedCount}
              pendingCount={pendingCount}
              onOpenSheetViewer={() => setIsSheetViewerOpen(true)}
            />

            {/* Controls Bar: Polling, Scan Now, Upload Invoice */}
            <MonitorControls
              isPolling={isPolling}
              onTogglePolling={() => setIsPolling(!isPolling)}
              pollingIntervalSec={pollingIntervalSec}
              onChangePollingInterval={(sec) => setPollingIntervalSec(sec)}
              onScanNow={triggerScan}
              isScanning={isScanning}
              onOpenUpload={() => setIsUploadOpen(true)}
              onResetCache={handleResetCache}
              countdown={countdown}
              catalogedCount={catalogedCount}
              pendingCount={pendingCount}
            />

            {/* Invoices Table */}
            <InvoiceTable
              invoices={invoices}
              onSelectInvoice={(inv) => setSelectedInvoice(inv)}
              onOpenSheetViewer={() => setIsSheetViewerOpen(true)}
            />

            {/* Live Audit Log / Terminal Feed */}
            <AuditLogView logs={auditLogs} />
          </div>
        )}
      </main>

      {/* Modals */}
      {accessToken && (
        <>
          <UploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            accessToken={accessToken}
            onSuccess={handleUploadSuccess}
          />

          <SheetViewer
            isOpen={isSheetViewerOpen}
            onClose={() => setIsSheetViewerOpen(false)}
            accessToken={accessToken}
          />

          <InvoiceDetailModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        </>
      )}
    </div>
  );
}
