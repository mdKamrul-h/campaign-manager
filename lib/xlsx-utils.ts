// Server-only utility for Excel file processing
// This file should only be imported in API routes (server-side)
import 'server-only';

export async function parseExcelFile(arrayBuffer: ArrayBuffer) {
  // Dynamic import to avoid bundling issues
  const XLSX = await import('xlsx');
  const xlsxLib = (XLSX as any).default || XLSX;
  
  const workbook = xlsxLib.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsxLib.utils.sheet_to_json(worksheet) as any[];
  
  return data;
}





