export interface InvoiceData {
  id: string;
  fileName: string;
  vendorName: string;
  totalInvoiceAmount: string;
  dueDate: string;
  invoiceNumber?: string;
  summary?: string;
  confidenceScore?: number;
  driveFileId: string;
  driveViewLink?: string;
  processedAt: string;
  status: 'cataloged' | 'processing' | 'failed';
  errorDetails?: string;
  mimeType?: string;
  fileSize?: number;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink: string;
  fileCount: number;
}

export interface SheetsTrackerInfo {
  id: string;
  name: string;
  webViewLink: string;
  rowCount: number;
  headers: string[];
}

export interface CatalogerStatusResponse {
  authenticated: boolean;
  userEmail?: string;
  folder: DriveFolderInfo | null;
  sheet: SheetsTrackerInfo | null;
  catalogedCount: number;
  pendingCount: number;
  recentInvoices: InvoiceData[];
  auditLogs: AuditLogEntry[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
}

export interface SheetRow {
  rowNumber: number;
  values: string[];
}
