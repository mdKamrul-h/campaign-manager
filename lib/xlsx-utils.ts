// Server-only utility for Excel and CSV file processing
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

export async function parseCSVFile(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Helper function to parse CSV line handling quoted fields
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  }
  
  // Parse header row
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
}





