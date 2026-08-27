import {
  getOrCreateIncomingInvoicesFolder,
  getOrCreateInvoiceTrackerSpreadsheet,
  listFilesInFolder,
  downloadDriveFile,
  uploadFileToFolder,
  appendInvoiceToTracker,
  readInvoiceTrackerRows,
  getUserProfile,
} from './googleWorkspaceService.js';
import { extractInvoiceData, ExtractedInvoice } from './geminiService.js';
import { InvoiceData, AuditLogEntry, CatalogerStatusResponse } from '../src/types.js';

// In-memory catalog cache and audit logs
const processedFileIds = new Set<string>();
const recentInvoices: InvoiceData[] = [];
const auditLogs: AuditLogEntry[] = [];

function addAuditLog(level: 'info' | 'success' | 'warning' | 'error', message: string, details?: Record<string, any>) {
  const entry: AuditLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 200) {
    auditLogs.pop();
  }
  console.log(`[Document Cataloger][${level.toUpperCase()}] ${message}`);
  return entry;
}

export function getAuditLogs(): AuditLogEntry[] {
  return auditLogs;
}

export function getRecentInvoices(): InvoiceData[] {
  return recentInvoices;
}

/**
 * Initializes/syncs folder and spreadsheet info, restoring cataloged file IDs from sheet history.
 */
export async function getCatalogerStatus(accessToken: string): Promise<CatalogerStatusResponse> {
  const user = await getUserProfile(accessToken);
  const folder = await getOrCreateIncomingInvoicesFolder(accessToken, 'Incoming Invoices');
  const sheet = await getOrCreateInvoiceTrackerSpreadsheet(accessToken, 'Invoice Tracker');

  // Sync processed files from sheet rows
  try {
    const sheetData = await readInvoiceTrackerRows(accessToken, sheet.id);
    for (const row of sheetData.rows) {
      // Row structure: [Vendor Name, Total Amount, Due Date, Invoice #, File Name, Summary, Cataloged At, Drive Link, Status]
      const fileName = row[4];
      const driveLink = row[7];
      if (driveLink) {
        // extract file id from drive link
        const match = driveLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          processedFileIds.add(match[1]);
        }
      }
      if (fileName) {
        processedFileIds.add(`name:${fileName}`);
      }
    }
  } catch (err) {
    console.warn('Could not sync processed files from sheet:', err);
  }

  // Get current file count in incoming folder
  const files = await listFilesInFolder(accessToken, folder.id);

  const pendingFiles = files.filter(
    (f) => !processedFileIds.has(f.id) && !processedFileIds.has(`name:${f.name}`)
  );

  return {
    authenticated: true,
    userEmail: user.email || 'Connected Google User',
    folder: {
      id: folder.id,
      name: folder.name,
      webViewLink: folder.webViewLink,
      fileCount: files.length,
    },
    sheet: {
      id: sheet.id,
      name: sheet.name,
      webViewLink: sheet.webViewLink,
      rowCount: sheet.rowCount,
      headers: [
        'Vendor Name',
        'Total Invoice Amount',
        'Due Date',
        'Invoice #',
        'File Name',
        'Summary',
        'Cataloged At',
        'Drive Link',
        'Status',
      ],
    },
    catalogedCount: files.length - pendingFiles.length,
    pendingCount: pendingFiles.length,
    recentInvoices: recentInvoices.slice(0, 20),
    auditLogs: auditLogs.slice(0, 30),
  };
}

/**
 * Scans the 'Incoming Invoices' Google Drive folder, processes any new invoice files with Gemini 3.5 Flash,
 * and appends structured rows to 'Invoice Tracker' Google Sheets.
 */
export async function scanAndCatalogFolder(accessToken: string): Promise<{
  scannedCount: number;
  newProcessedCount: number;
  invoices: InvoiceData[];
  errors: string[];
}> {
  addAuditLog('info', 'Starting folder scan on Google Drive: Incoming Invoices...');

  const folder = await getOrCreateIncomingInvoicesFolder(accessToken, 'Incoming Invoices');
  const sheet = await getOrCreateInvoiceTrackerSpreadsheet(accessToken, 'Invoice Tracker');
  const files = await listFilesInFolder(accessToken, folder.id);

  addAuditLog('info', `Found ${files.length} total file(s) in 'Incoming Invoices' folder.`);

  const newInvoices: InvoiceData[] = [];
  const errors: string[] = [];

  for (const file of files) {
    // Check if already processed
    if (processedFileIds.has(file.id) || processedFileIds.has(`name:${file.name}`)) {
      continue;
    }

    addAuditLog('info', `Processing new invoice file: "${file.name}" (ID: ${file.id})...`);

    try {
      // 1. Download file content from Google Drive
      const fileBuffer = await downloadDriveFile(accessToken, file.id);
      addAuditLog('info', `Downloaded "${file.name}" (${(fileBuffer.length / 1024).toFixed(1)} KB). Sending to Gemini 3.5 Flash...`);

      // 2. Extract structured invoice fields using Gemini
      const extracted: ExtractedInvoice = await extractInvoiceData(fileBuffer, file.mimeType, file.name);

      addAuditLog(
        'success',
        `Gemini extracted: Vendor: "${extracted.vendorName}" | Amount: ${extracted.totalInvoiceAmount} | Due: ${extracted.dueDate} (Confidence: ${Math.round((extracted.confidenceScore || 0.9) * 100)}%)`
      );

      // 3. Append to 'Invoice Tracker' Google Sheets
      const catalogedAt = new Date().toLocaleString();
      await appendInvoiceToTracker(accessToken, sheet.id, {
        vendorName: extracted.vendorName,
        totalInvoiceAmount: extracted.totalInvoiceAmount,
        dueDate: extracted.dueDate,
        invoiceNumber: extracted.invoiceNumber || '-',
        fileName: file.name,
        summary: extracted.summary || '-',
        catalogedAt,
        driveLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        status: 'Cataloged',
      });

      addAuditLog('success', `Appended structured row for "${extracted.vendorName}" to 'Invoice Tracker' Google Sheet.`);

      // Mark as processed
      processedFileIds.add(file.id);
      processedFileIds.add(`name:${file.name}`);

      const invoiceRecord: InvoiceData = {
        id: file.id,
        fileName: file.name,
        vendorName: extracted.vendorName,
        totalInvoiceAmount: extracted.totalInvoiceAmount,
        dueDate: extracted.dueDate,
        invoiceNumber: extracted.invoiceNumber,
        summary: extracted.summary,
        confidenceScore: extracted.confidenceScore,
        driveFileId: file.id,
        driveViewLink: file.webViewLink,
        processedAt: catalogedAt,
        status: 'cataloged',
        mimeType: file.mimeType,
        fileSize: file.size,
      };

      newInvoices.push(invoiceRecord);
      recentInvoices.unshift(invoiceRecord);
    } catch (err: any) {
      const errMsg = `Failed to catalog "${file.name}": ${err.message}`;
      console.error(errMsg, err);
      addAuditLog('error', errMsg);
      errors.push(errMsg);
    }
  }

  if (newInvoices.length > 0) {
    addAuditLog('success', `Batch complete: Successfully cataloged ${newInvoices.length} new invoice(s).`);
  } else {
    addAuditLog('info', 'Scan complete: All files in folder are already up to date.');
  }

  return {
    scannedCount: files.length,
    newProcessedCount: newInvoices.length,
    invoices: newInvoices,
    errors,
  };
}

/**
 * Uploads an invoice file directly to 'Incoming Invoices' folder on Google Drive,
 * triggers Gemini extraction, and appends to 'Invoice Tracker' Google Sheet.
 */
export async function uploadAndCatalogInvoice(
  accessToken: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<InvoiceData> {
  addAuditLog('info', `Uploading new file "${fileName}" directly to Google Drive 'Incoming Invoices'...`);

  const folder = await getOrCreateIncomingInvoicesFolder(accessToken, 'Incoming Invoices');
  const sheet = await getOrCreateInvoiceTrackerSpreadsheet(accessToken, 'Invoice Tracker');

  // 1. Upload to Drive folder
  const uploaded = await uploadFileToFolder(accessToken, folder.id, fileName, mimeType, buffer);
  addAuditLog('success', `Uploaded "${fileName}" to Google Drive (ID: ${uploaded.id}).`);

  // 2. Extract with Gemini
  addAuditLog('info', `Analyzing "${fileName}" with Gemini 3.5 Flash...`);
  const extracted = await extractInvoiceData(buffer, mimeType, fileName);

  addAuditLog(
    'success',
    `Extracted from "${fileName}": Vendor: "${extracted.vendorName}", Amount: "${extracted.totalInvoiceAmount}", Due: "${extracted.dueDate}"`
  );

  // 3. Append to Google Sheet
  const catalogedAt = new Date().toLocaleString();
  await appendInvoiceToTracker(accessToken, sheet.id, {
    vendorName: extracted.vendorName,
    totalInvoiceAmount: extracted.totalInvoiceAmount,
    dueDate: extracted.dueDate,
    invoiceNumber: extracted.invoiceNumber || '-',
    fileName,
    summary: extracted.summary || '-',
    catalogedAt,
    driveLink: uploaded.webViewLink,
    status: 'Cataloged',
  });

  addAuditLog('success', `Logged structured invoice row to 'Invoice Tracker' Google Sheet.`);

  processedFileIds.add(uploaded.id);
  processedFileIds.add(`name:${fileName}`);

  const invoiceRecord: InvoiceData = {
    id: uploaded.id,
    fileName,
    vendorName: extracted.vendorName,
    totalInvoiceAmount: extracted.totalInvoiceAmount,
    dueDate: extracted.dueDate,
    invoiceNumber: extracted.invoiceNumber,
    summary: extracted.summary,
    confidenceScore: extracted.confidenceScore,
    driveFileId: uploaded.id,
    driveViewLink: uploaded.webViewLink,
    processedAt: catalogedAt,
    status: 'cataloged',
    mimeType,
    fileSize: buffer.length,
  };

  recentInvoices.unshift(invoiceRecord);
  return invoiceRecord;
}

/**
 * Resets the in-memory cache so all files in the folder can be re-scanned if requested.
 */
export function resetProcessedCache() {
  processedFileIds.clear();
  addAuditLog('warning', 'Reset catalog cache. Next scan will inspect all files in Incoming Invoices.');
}
