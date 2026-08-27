import { google } from 'googleapis';
import { Readable } from 'stream';

export interface WorkspaceContext {
  folderId: string;
  folderName: string;
  folderWebViewLink: string;
  sheetId: string;
  sheetTitle: string;
  sheetWebViewLink: string;
}

export function createGoogleClients(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });
  const oauth2 = google.oauth2({ version: 'v2', auth });

  return { auth, drive, sheets, oauth2 };
}

export async function getUserProfile(accessToken: string): Promise<{ email?: string; name?: string; picture?: string }> {
  try {
    const { oauth2 } = createGoogleClients(accessToken);
    const userInfo = await oauth2.userinfo.get();
    return {
      email: userInfo.data.email || undefined,
      name: userInfo.data.name || undefined,
      picture: userInfo.data.picture || undefined,
    };
  } catch (err) {
    console.warn('Could not fetch user profile from token:', err);
    return {};
  }
}

/**
 * Searches for a folder named 'Incoming Invoices' in the user's Google Drive.
 * If not found, creates it.
 */
export async function getOrCreateIncomingInvoicesFolder(
  accessToken: string,
  folderName = 'Incoming Invoices'
): Promise<{ id: string; name: string; webViewLink: string }> {
  const { drive } = createGoogleClients(accessToken);

  // Search for active folder by name
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const response = await drive.files.list({
    q: query,
    spaces: 'drive',
    fields: 'files(id, name, webViewLink)',
    pageSize: 1,
  });

  if (response.data.files && response.data.files.length > 0) {
    const folder = response.data.files[0];
    return {
      id: folder.id!,
      name: folder.name || folderName,
      webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
    };
  }

  // Folder doesn't exist, create it
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Directory for Document Cataloger incoming invoice documents to be cataloged by Gemini AI.',
    },
    fields: 'id, name, webViewLink',
  });

  return {
    id: createRes.data.id!,
    name: createRes.data.name || folderName,
    webViewLink: createRes.data.webViewLink || `https://drive.google.com/drive/folders/${createRes.data.id}`,
  };
}

/**
 * Lists all files inside the specified Google Drive folder.
 */
export async function listFilesInFolder(
  accessToken: string,
  folderId: string
): Promise<Array<{ id: string; name: string; mimeType: string; size?: number; createdTime?: string; webViewLink?: string }>> {
  const { drive } = createGoogleClients(accessToken);

  const query = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
  const response = await drive.files.list({
    q: query,
    spaces: 'drive',
    fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  });

  return (response.data.files || []).map((f) => ({
    id: f.id!,
    name: f.name || 'Untitled File',
    mimeType: f.mimeType || 'application/octet-stream',
    size: f.size ? parseInt(f.size, 10) : undefined,
    createdTime: f.createdTime || undefined,
    webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
  }));
}

/**
 * Downloads a file binary content from Google Drive as a Buffer.
 */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string
): Promise<Buffer> {
  const { drive } = createGoogleClients(accessToken);

  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Uploads a file directly into the 'Incoming Invoices' Google Drive folder.
 */
export async function uploadFileToFolder(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<{ id: string; name: string; webViewLink: string }> {
  const { drive } = createGoogleClients(accessToken);

  const readable = new Readable();
  readable.push(fileBuffer);
  readable.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: readable,
    },
    fields: 'id, name, webViewLink',
  });

  return {
    id: response.data.id!,
    name: response.data.name || fileName,
    webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
  };
}

const DEFAULT_SHEET_HEADERS = [
  'Vendor Name',
  'Total Invoice Amount',
  'Due Date',
  'Invoice #',
  'File Name',
  'Summary',
  'Cataloged At',
  'Drive Link',
  'Status'
];

/**
 * Searches for or creates a Google Sheet named 'Invoice Tracker'.
 * Initializes the header row with formatting if creating or empty.
 */
export async function getOrCreateInvoiceTrackerSpreadsheet(
  accessToken: string,
  sheetTitle = 'Invoice Tracker'
): Promise<{ id: string; name: string; webViewLink: string; rowCount: number }> {
  const { drive, sheets } = createGoogleClients(accessToken);

  // Search for existing spreadsheet
  const query = `name = '${sheetTitle.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const response = await drive.files.list({
    q: query,
    spaces: 'drive',
    fields: 'files(id, name, webViewLink)',
    pageSize: 1,
  });

  let spreadsheetId: string;
  let webViewLink: string;
  let isNew = false;

  if (response.data.files && response.data.files.length > 0) {
    const sheetFile = response.data.files[0];
    spreadsheetId = sheetFile.id!;
    webViewLink = sheetFile.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  } else {
    // Create new spreadsheet
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: sheetTitle,
        },
        sheets: [
          {
            properties: {
              title: 'Invoices',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      },
    });

    spreadsheetId = createRes.data.spreadsheetId!;
    webViewLink = createRes.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    isNew = true;
  }

  // Ensure header row exists and check row count
  const sheetData = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:I1000',
  });

  const rows = sheetData.data.values || [];

  if (isNew || rows.length === 0) {
    // Set headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:I1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [DEFAULT_SHEET_HEADERS],
      },
    });

    // Apply header style formatting (dark navy header with white bold text)
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: DEFAULT_SHEET_HEADERS.length,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.12, green: 0.18, blue: 0.28 },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                      fontSize: 10,
                    },
                    horizontalAlignment: 'CENTER',
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
              },
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: DEFAULT_SHEET_HEADERS.length,
                },
              },
            },
          ],
        },
      });
    } catch (formatErr) {
      console.warn('Could not format sheet headers:', formatErr);
    }
  }

  return {
    id: spreadsheetId,
    name: sheetTitle,
    webViewLink,
    rowCount: rows.length > 0 ? rows.length : 1,
  };
}

/**
 * Appends a structured invoice record as a row to the 'Invoice Tracker' Google Sheet.
 */
export async function appendInvoiceToTracker(
  accessToken: string,
  spreadsheetId: string,
  data: {
    vendorName: string;
    totalInvoiceAmount: string;
    dueDate: string;
    invoiceNumber: string;
    fileName: string;
    summary: string;
    catalogedAt: string;
    driveLink: string;
    status: string;
  }
): Promise<void> {
  const { sheets } = createGoogleClients(accessToken);

  const row = [
    data.vendorName,
    data.totalInvoiceAmount,
    data.dueDate,
    data.invoiceNumber || '-',
    data.fileName,
    data.summary || '-',
    data.catalogedAt,
    data.driveLink,
    data.status,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A:I',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });
}

/**
 * Reads all rows from the 'Invoice Tracker' Google Sheet.
 */
export async function readInvoiceTrackerRows(
  accessToken: string,
  spreadsheetId: string
): Promise<{ headers: string[]; rows: string[][] }> {
  const { sheets } = createGoogleClients(accessToken);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:Z500',
  });

  const allRows = response.data.values || [];
  if (allRows.length === 0) {
    return { headers: DEFAULT_SHEET_HEADERS, rows: [] };
  }

  const headers = allRows[0];
  const rows = allRows.slice(1);

  return { headers, rows };
}
