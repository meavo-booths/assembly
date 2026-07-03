import { google, type sheets_v4 } from "googleapis";

/** Tab that holds assembly rows (a.k.a. the Delivery Tracker). */
export const ASSEMBLY_SHEET_TAB = process.env.GOOGLE_SHEETS_TAB_NAME ?? "Deliveries";

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set");
  return id;
}

/**
 * Shared Sheets client. Uses the read/write `spreadsheets` scope so the same
 * service account can both import rows and append/update them. The spreadsheet
 * must be shared with the service account as an Editor for writes to succeed.
 */
export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");

  const credentials = JSON.parse(json) as {
    client_email: string;
    private_key: string;
  };

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}
