import * as XLSX from 'xlsx';
import { ParsedTransaction, SourceFile } from './types';

/**
 * Client-side Excel/CSV parser for bank statements
 * Supports: Amex, Scotia Visa, Scotia Chequing, PC Financial Mastercard
 */

// Detect file type from filename
export function detectFileType(filename: string): SourceFile | null {
  const lowerName = filename.toLowerCase();
  
  // Amex files: Summary.xls or anything with 'amex' in the name
  if (lowerName.includes('amex') || (lowerName.includes('summary') && lowerName.endsWith('.xls'))) {
    return 'amex';
  }
  if (lowerName.includes('scene_visa') || lowerName.includes('visa_card')) {
    return 'scotia_visa';
  }
  if (lowerName.includes('preferred_package') || lowerName.includes('chequing')) {
    return 'scotia_chequing';
  }
  if (lowerName.includes('pc') || lowerName.includes('report') && lowerName.endsWith('.csv')) {
    return 'pc';
  }
  
  return null;
}

// Parse Excel file based on type
export async function parseExcelFile(
  file: File,
  fileType: SourceFile
): Promise<ParsedTransaction[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  
  switch (fileType) {
    case 'amex':
      return parseAmex(workbook);
    case 'scotia_visa':
      return parseScotiaVisa(workbook);
    case 'scotia_chequing':
      return parseScotiaChequing(workbook);
    case 'pc':
      return parsePC(workbook);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// Parse Amex Summary.xls
function parseAmex(workbook: XLSX.WorkBook): ParsedTransaction[] {
  const sheetName = 'Summary';
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) {
    throw new Error('Could not find Summary sheet in Amex file');
  }
  
  // Read all data as array of arrays
  const allData = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { 
    header: 1,
    raw: false,
    defval: ''
  });
  
  // Find the header row by looking for 'Date' and 'Amount' in the same row
  let headerRowIndex = -1;
  
  for (let i = 0; i < Math.min(allData.length, 20); i++) {
    const row = allData[i];
    if (!row) continue;
    
    const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
    
    // Look for header row with Date and Amount
    if (rowStr.includes('date') && rowStr.includes('amount') && rowStr.includes('description')) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex < 0) {
    throw new Error('Could not find header row in Amex file');
  }
  
  // Get headers and map column indices
  const headers = allData[headerRowIndex].map(h => String(h || '').toLowerCase().trim());
  const dateIdx = headers.findIndex(h => h === 'date');
  const descIdx = headers.findIndex(h => h === 'description');
  const amountIdx = headers.findIndex(h => h === 'amount');
  
  if (dateIdx < 0 || amountIdx < 0) {
    throw new Error('Could not find required columns (Date, Amount) in Amex file');
  }
  
  const transactions: ParsedTransaction[] = [];
  
  // Process data rows (after header)
  for (let i = headerRowIndex + 1; i < allData.length; i++) {
    const row = allData[i];
    if (!row || row.length === 0) continue;
    
    const dateCell = row[dateIdx];
    const amountCell = row[amountIdx];
    const descCell = row[descIdx];
    
    // Skip rows without date or amount
    if (!dateCell || !amountCell) continue;
    
    // Parse date
    const dateStr = String(dateCell);
    const date = parseDate(dateStr);
    if (!date) continue;
    
    // Parse amount - remove $, commas, and handle negatives
    let amountStr = String(amountCell).replace(/[$,\s]/g, '');
    
    // Handle case where amount might be in description cell (payment rows)
    if (!amountStr && descCell) {
      const descStr = String(descCell);
      if (descStr.startsWith('-$') || descStr.startsWith('$')) {
        amountStr = descStr.replace(/[$,\s]/g, '');
      }
    }
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) continue;
    
    // Get description
    let description = String(descCell || '').trim();
    
    // If description looks like an amount (payment row), generate a description
    if (!description || description.startsWith('-$') || description.startsWith('$')) {
      description = amount < 0 ? 'Payment - Thank You' : 'Amex Transaction';
    }
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type: amount < 0 ? 'credit' : 'debit',
      source: 'amex'
    });
  }
  
  return transactions;
}

// Parse Scotia Visa Excel file
function parseScotiaVisa(workbook: XLSX.WorkBook): ParsedTransaction[] {
  const sheetName = 'Transactions';
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) {
    throw new Error('Could not find Transactions sheet in Scotia Visa file');
  }
  
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: ''
  });
  
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rawData) {
    // Get date - clean any "!" characters
    const dateStr = String(row['Date'] || '').replace(/!/g, '');
    const date = parseDate(dateStr);
    if (!date) continue;
    
    // Get amount
    const amountVal = row['Amount'];
    const amount = typeof amountVal === 'number' ? amountVal : parseFloat(String(amountVal).replace(/[$,]/g, ''));
    if (isNaN(amount)) continue;
    
    // Get description
    const description = String(row['Description'] || '');
    const subDescription = String(row['Sub-description'] || '');
    
    // Determine transaction type
    const transType = String(row['Type of Transaction'] || '').toLowerCase();
    const isCredit = transType.includes('payment') || transType.includes('return') || amount < 0;
    
    transactions.push({
      date,
      description: description.trim(),
      sub_description: subDescription.trim(),
      amount: Math.abs(amount),
      type: isCredit ? 'credit' : 'debit',
      source: 'scotia_visa'
    });
  }
  
  return transactions;
}

// Parse Scotia Chequing Excel file
function parseScotiaChequing(workbook: XLSX.WorkBook): ParsedTransaction[] {
  const sheetName = 'Transactions';
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) {
    throw new Error('Could not find Transactions sheet in Scotia Chequing file');
  }
  
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: ''
  });
  
  const transactions: ParsedTransaction[] = [];
  
  // Check if we have separate Withdrawals/Deposits or single Amount column
  const hasWithdrawals = rawData.length > 0 && 'Withdrawals' in rawData[0];
  const hasDeposits = rawData.length > 0 && 'Deposits' in rawData[0];
  const hasAmount = rawData.length > 0 && 'Amount' in rawData[0];
  
  for (const row of rawData) {
    const dateStr = String(row['Date'] || '');
    const date = parseDate(dateStr);
    if (!date) continue;
    
    const description = String(row['Transaction Description'] || row['Description'] || '');
    
    let amount: number;
    let type: 'debit' | 'credit';
    
    if (hasWithdrawals && hasDeposits) {
      const withdrawal = parseFloat(String(row['Withdrawals'] || '0').replace(/[$,]/g, '')) || 0;
      const deposit = parseFloat(String(row['Deposits'] || '0').replace(/[$,]/g, '')) || 0;
      
      if (withdrawal > 0) {
        amount = withdrawal;
        type = 'debit';
      } else if (deposit > 0) {
        amount = deposit;
        type = 'credit';
      } else {
        continue;
      }
    } else if (hasAmount) {
      const amountVal = parseFloat(String(row['Amount'] || '0').replace(/[$,]/g, ''));
      if (isNaN(amountVal) || amountVal === 0) continue;
      
      amount = Math.abs(amountVal);
      type = amountVal < 0 ? 'debit' : 'credit';
    } else {
      continue;
    }
    
    transactions.push({
      date,
      description: description.trim(),
      amount,
      type,
      source: 'scotia_chequing'
    });
  }
  
  return transactions;
}

// Helper to find a column value case-insensitively
function getColumnValue(row: Record<string, unknown>, columnName: string): string {
  // Try exact match first
  if (row[columnName] !== undefined) {
    return String(row[columnName]);
  }
  
  // Try case-insensitive match
  const lowerName = columnName.toLowerCase();
  for (const key of Object.keys(row)) {
    // Clean the key (remove quotes, trim whitespace, handle BOM)
    const cleanKey = key.replace(/^[\ufeff"']+|["']+$/g, '').trim().toLowerCase();
    if (cleanKey === lowerName) {
      return String(row[key]);
    }
  }
  
  return '';
}

// Parse PC Financial Mastercard CSV file
function parsePC(workbook: XLSX.WorkBook): ParsedTransaction[] {
  // PC exports are CSV files, XLSX library reads them into a single sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) {
    throw new Error('Could not find data in PC Financial file');
  }
  
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: ''
  });
  
  if (rawData.length === 0) {
    throw new Error('No data rows found in PC Financial file');
  }
  
  // Debug: log first row keys to help diagnose issues
  console.log('PC CSV columns found:', Object.keys(rawData[0]));
  
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rawData) {
    // Get date - format is MM/DD/YYYY
    const dateStr = getColumnValue(row, 'Date');
    const date = parseDate(dateStr);
    if (!date) continue;
    
    // Get amount - negative values are purchases, positive are credits/payments
    const amountStr = getColumnValue(row, 'Amount').replace(/[$,\s"]/g, '');
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;
    
    // Get description
    const description = getColumnValue(row, 'Description').trim();
    if (!description) continue;
    
    // PC uses negative amounts for purchases (debits)
    // Positive amounts would be refunds/credits
    const isCredit = amount > 0;
    
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type: isCredit ? 'credit' : 'debit',
      source: 'pc'
    });
  }
  
  return transactions;
}

// Month name mapping
const MONTH_MAP: Record<string, number> = {
  'jan': 0, 'january': 0,
  'feb': 1, 'february': 1,
  'mar': 2, 'march': 2,
  'apr': 3, 'april': 3,
  'may': 4,
  'jun': 5, 'june': 5,
  'jul': 6, 'july': 6,
  'aug': 7, 'august': 7,
  'sep': 8, 'sept': 8, 'september': 8,
  'oct': 9, 'october': 9,
  'nov': 10, 'november': 10,
  'dec': 11, 'december': 11,
};

// Helper to parse various date formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Clean up the string
  const cleanStr = dateStr.trim();
  
  // Try ISO format first (2024-12-01)
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    const date = new Date(cleanStr);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try "DD Mon. YYYY" or "DD Mon YYYY" format (e.g., "28 Nov. 2025", "28 Nov 2025")
  const monthNameMatch = cleanStr.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/);
  if (monthNameMatch) {
    const day = parseInt(monthNameMatch[1], 10);
    const monthStr = monthNameMatch[2].toLowerCase().replace('.', '');
    const year = parseInt(monthNameMatch[3], 10);
    
    const month = MONTH_MAP[monthStr];
    if (month !== undefined && day >= 1 && day <= 31 && year >= 2000) {
      return new Date(year, month, day);
    }
  }
  
  // Try "Mon DD, YYYY" format (e.g., "Nov 28, 2025")
  const monthFirstMatch = cleanStr.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthFirstMatch) {
    const monthStr = monthFirstMatch[1].toLowerCase().replace('.', '');
    const day = parseInt(monthFirstMatch[2], 10);
    const year = parseInt(monthFirstMatch[3], 10);
    
    const month = MONTH_MAP[monthStr];
    if (month !== undefined && day >= 1 && day <= 31 && year >= 2000) {
      return new Date(year, month, day);
    }
  }
  
  // Try MM/DD/YYYY or DD/MM/YYYY or YYYY/MM/DD (also handles 2-digit years)
  const parts = cleanStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const nums = parts.map(p => parseInt(p, 10));
    if (nums.every(n => !isNaN(n))) {
      let [p1, p2, p3] = nums;
      
      // Convert 2-digit year to 4-digit (assuming 2000s for 00-99)
      const convertYear = (y: number) => {
        if (y >= 0 && y <= 99) {
          return y < 50 ? 2000 + y : 1900 + y;
        }
        return y;
      };
      
      let date: Date;
      if (p1 > 31) {
        // YYYY/MM/DD
        date = new Date(p1, p2 - 1, p3);
      } else if (p3 > 31) {
        // Year is last (4-digit year)
        if (p1 > 12) {
          // DD/MM/YYYY
          date = new Date(p3, p2 - 1, p1);
        } else if (p2 > 12) {
          // MM/DD/YYYY (day > 12)
          date = new Date(p3, p1 - 1, p2);
        } else {
          // Ambiguous - assume MM/DD/YYYY (US format)
          date = new Date(p3, p1 - 1, p2);
        }
      } else if (p3 >= 0 && p3 <= 99 && p1 <= 12 && p2 <= 31) {
        // Two-digit year at end: MM/DD/YY format
        const year = convertYear(p3);
        date = new Date(year, p1 - 1, p2);
      } else if (p3 >= 0 && p3 <= 99 && p2 <= 12 && p1 <= 31) {
        // Two-digit year at end: DD/MM/YY format
        const year = convertYear(p3);
        date = new Date(year, p2 - 1, p1);
      } else {
        // Can't determine year position
        return null;
      }
      
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // Last resort: try native Date parsing
  const date = new Date(cleanStr);
  if (!isNaN(date.getTime())) return date;
  
  return null;
}

// Format source for display
export function formatSource(source: SourceFile): string {
  switch (source) {
    case 'amex':
      return 'Amex';
    case 'scotia_visa':
      return 'Scotia Visa';
    case 'scotia_chequing':
      return 'Scotia Chequing';
    case 'pc':
      return 'PC Financial';
    case 'manual':
      return 'Manual Entry';
    default:
      return source;
  }
}
