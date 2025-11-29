import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export interface ProcessedDocument {
  text: string;
  tables: any[];
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    sheetCount?: number;
  };
}

export async function processDocument(
  buffer: Buffer,
  fileName: string,
  fileType: string
): Promise<ProcessedDocument> {
  switch (fileType) {
    case 'pdf':
      return await processPDF(buffer, fileName);
    case 'xlsx':
      return processExcel(buffer, fileName);
    case 'csv':
      return processCSV(buffer, fileName);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function processPDF(buffer: Buffer, fileName: string): Promise<ProcessedDocument> {
  const data = await pdfParse(buffer);
  
  return {
    text: data.text,
    tables: [],
    metadata: {
      fileName,
      fileType: 'pdf',
      pageCount: data.numpages
    }
  };
}

function processExcel(buffer: Buffer, fileName: string): ProcessedDocument {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  let text = '';
  const tables: any[] = [];
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    tables.push({
      sheetName,
      data: sheetData
    });
    
    const sheetText = XLSX.utils.sheet_to_csv(worksheet);
    text += `\n\n=== ${sheetName} ===\n${sheetText}`;
  });
  
  return {
    text,
    tables,
    metadata: {
      fileName,
      fileType: 'xlsx',
      sheetCount: workbook.SheetNames.length
    }
  };
}

function processCSV(buffer: Buffer, fileName: string): ProcessedDocument {
  const csvText = buffer.toString('utf-8');
  const records = csvParse(csvText, {
    skip_empty_lines: true,
    trim: true
  });
  
  return {
    text: csvText,
    tables: [{ data: records }],
    metadata: {
      fileName,
      fileType: 'csv'
    }
  };
}
