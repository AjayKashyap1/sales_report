import { SalesRecord } from '../types';

// Robust CSV Line parser that respects quotes
export function parseCSVLine(line: string, separator: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parses Indian / UK date format (DD/MM/YYYY or DD-MM-YYYY) or standard dates
export function parseFlexibleDate(dateStr: string): Date {
  const cleanStr = dateStr.trim();
  
  // Standard format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Indian/UK format DD-MM-YYYY or DD/MM/YYYY
  const indianDateRegex = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/;
  const match = cleanStr.match(indianDateRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Try fallback standard browser parser
  const fallbackDate = new Date(cleanStr);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }
  
  return new Date(); // Return current date as fallback instead of throwing
}

export function parseCSVText(csvText: string): { records: SalesRecord[]; warning: string | null } {
  const records: SalesRecord[] = [];
  let warning: string | null = null;

  if (!csvText || csvText.trim() === '') {
    return { records: [], warning: 'CSV text is empty' };
  }

  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    return { records: [], warning: 'CSV must contain at least a header row and one data row' };
  }

  // Determine separator (comma or semicolon)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  
  const headers = parseCSVLine(firstLine, separator).map(h => h.toLowerCase().replace(/["']/g, '').trim());

  // Detect indices
  let dateIdx = -1;
  let portalIdx = -1;
  let productIdx = -1;
  let amountIdx = -1;
  let unitsIdx = -1;

  headers.forEach((header, idx) => {
    if (header.includes('date') || header.includes('order') || header.includes('tarikh') || header.includes('time') || header.includes('din')) {
      if (dateIdx === -1) dateIdx = idx;
    } else if (header.includes('portal') || header.includes('channel') || header.includes('platform') || header.includes('website') || header.includes('source') || header.includes('source_name')) {
      if (portalIdx === -1) portalIdx = idx;
    } else if (header.includes('product') || header.includes('item') || header.includes('sku') || header.includes('name') || header.includes('title')) {
      if (productIdx === -1) productIdx = idx;
    } else if (header.includes('amount') || header.includes('revenue') || header.includes('sales') || header.includes('price') || header.includes('total') || header.includes('value') || header.includes('inr') || header.includes('rupee')) {
      if (amountIdx === -1) amountIdx = idx;
    } else if (header.includes('unit') || header.includes('qty') || header.includes('quantity') || header.includes('count') || header.includes('pieces') || header.includes('pcs')) {
      if (unitsIdx === -1) unitsIdx = idx;
    }
  });

  // Safe mapping fallbacks if headers are not explicitly named
  if (dateIdx === -1) dateIdx = 0;
  if (portalIdx === -1) portalIdx = Math.min(1, headers.length - 1);
  if (productIdx === -1) productIdx = Math.min(2, headers.length - 1);
  if (amountIdx === -1) amountIdx = Math.min(3, headers.length - 1);
  if (unitsIdx === -1) unitsIdx = Math.min(4, headers.length - 1);

  const missingCols = [];
  if (dateIdx === -1 || dateIdx >= headers.length) missingCols.push('Date');
  if (portalIdx === -1 || portalIdx >= headers.length) missingCols.push('Portal');
  if (productIdx === -1 || productIdx >= headers.length) missingCols.push('Product');
  if (amountIdx === -1 || amountIdx >= headers.length) missingCols.push('Amount');
  if (unitsIdx === -1 || unitsIdx >= headers.length) missingCols.push('Units');

  if (missingCols.length > 0) {
    warning = `Could not perfectly map headers. Assumed columns: Date (col ${dateIdx+1}), Portal (col ${portalIdx+1}), Product (col ${productIdx+1}), Amount (col ${amountIdx+1}), Units (col ${unitsIdx+1}).`;
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;

    const cells = parseCSVLine(line, separator);
    if (cells.length <= Math.max(dateIdx, portalIdx, productIdx, amountIdx, unitsIdx)) {
      // Row doesn't have enough columns, skip or flag
      continue;
    }

    try {
      const dateRaw = cells[dateIdx];
      const portalRaw = cells[portalIdx] || 'Unknown';
      const productRaw = cells[productIdx] || 'Unknown';
      const amountRaw = cells[amountIdx] || '0';
      const unitsRaw = cells[unitsIdx] || '1';

      const date = parseFlexibleDate(dateRaw);
      const portal = portalRaw.trim() || 'Unknown Portal';
      const product = productRaw.trim() || 'Unknown Product';
      
      // Clean amount: strip spaces, quotes, currency symbols (₹, $), commas
      const cleanAmountStr = amountRaw.replace(/[₹$,\s"]/g, '');
      const amount = parseFloat(cleanAmountStr) || 0;

      // Clean units
      const cleanUnitsStr = unitsRaw.replace(/[^0-9]/g, '');
      const units = parseInt(cleanUnitsStr, 10) || 1;

      records.push({
        id: `csv_row_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        date,
        portal,
        product,
        amount,
        units
      });
    } catch (err) {
      console.warn(`Error parsing CSV row ${i}:`, err);
    }
  }

  return { records, warning };
}

// Convert a set of records back to a simple CSV downloadable string (for mail/export simulation)
export function exportToCSVString(records: SalesRecord[]): string {
  const header = 'Date,Portal,Product,Amount (₹),Units\n';
  const rows = records.map(r => {
    const formattedDate = r.date.toLocaleDateString('en-IN');
    // Escape quotes in portal and product
    const escapedPortal = r.portal.includes(',') ? `"${r.portal.replace(/"/g, '""')}"` : r.portal;
    const escapedProduct = r.product.includes(',') ? `"${r.product.replace(/"/g, '""')}"` : r.product;
    return `${formattedDate},${escapedPortal},${escapedProduct},${r.amount},${r.units}`;
  }).join('\n');
  return header + rows;
}
