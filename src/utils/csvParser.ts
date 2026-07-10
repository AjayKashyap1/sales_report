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

function extractFromProductName(productName: string): { quality: string; size: string; colour: string } {
  const lower = productName.toLowerCase();
  
  // Quality detection
  let quality = 'Standard';
  if (lower.includes('premium') || lower.includes('best') || lower.includes('pro') || lower.includes('high quality')) quality = 'Premium';
  else if (lower.includes('economy') || lower.includes('low') || lower.includes('cheap')) quality = 'Economy';
  else if (lower.includes('deluxe') || lower.includes('luxury') || lower.includes('ultra')) quality = 'Deluxe';
  else if (lower.includes('standard') || lower.includes('regular') || lower.includes('normal')) quality = 'Standard';
  else if (lower.includes('classic') || lower.includes('vintage')) quality = 'Classic';

  // Size detection
  let size = 'M';
  if (lower.includes('large') || lower.includes('big') || lower.includes(' l ') || lower.endsWith(' l') || lower.includes('xl')) {
    if (lower.includes('xxl') || lower.includes('xx-large')) size = 'XXL';
    else if (lower.includes('xl') || lower.includes('x-large')) size = 'XL';
    else size = 'L';
  } else if (lower.includes('small') || lower.includes('tiny') || lower.includes(' s ') || lower.endsWith(' s')) {
    if (lower.includes('xs') || lower.includes('x-small')) size = 'XS';
    else size = 'S';
  } else if (lower.includes('medium') || lower.includes(' m ') || lower.endsWith(' m')) {
    size = 'M';
  }

  // Colour detection
  let colour = 'Default';
  const colors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'gold', 'silver', 'grey', 'gray', 'pink', 'purple', 'orange', 'brown'];
  for (const c of colors) {
    if (lower.includes(c)) {
      colour = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  return { quality, size, colour };
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
  let qualityIdx = -1;
  let sizeIdx = -1;
  let colourIdx = -1;
  let imageLinkIdx = -1;

  headers.forEach((header, idx) => {
    if (header.includes('date') || header.includes('order') || header.includes('tarikh') || header.includes('time') || header.includes('din') || header.includes('packed on')) {
      if (dateIdx === -1) dateIdx = idx;
    } else if (header.includes('portal') || header.includes('channel') || header.includes('platform') || header.includes('website') || header.includes('source') || header.includes('source_name')) {
      if (portalIdx === -1) portalIdx = idx;
    } else if (header.includes('product') || header.includes('item') || header.includes('sku') || header.includes('name') || header.includes('title') || header.includes('simplified') || header.includes('simpiled') || header.includes('column c') || header.includes('column_c') || header === 'c') {
      if (productIdx === -1) productIdx = idx;
    } else if (header.includes('amount') || header.includes('revenue') || header.includes('sales') || header.includes('price') || header.includes('total') || header.includes('value') || header.includes('inr') || header.includes('rupee')) {
      if (amountIdx === -1) amountIdx = idx;
    } else if (header.includes('unit') || header.includes('qty') || header.includes('quantity') || header.includes('count') || header.includes('pieces') || header.includes('pcs') || header.includes('sum qty')) {
      if (unitsIdx === -1) unitsIdx = idx;
    } else if (header.includes('quality') || header.includes('grade') || header.includes('level') || header.includes('type')) {
      if (qualityIdx === -1) qualityIdx = idx;
    } else if (header.includes('size') || header.includes('dimension') || header.includes('length')) {
      if (sizeIdx === -1) sizeIdx = idx;
    } else if (header.includes('colour') || header.includes('color') || header.includes('shade') || header.includes('tint')) {
      if (colourIdx === -1) colourIdx = idx;
    } else if (header.includes('image link') || header.includes('imagelink') || header.includes('image') || header.includes('photo') || header.includes('pic') || header.includes('img') || header.includes('link')) {
      if (imageLinkIdx === -1) imageLinkIdx = idx;
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

      // Quality, Size, Colour parsing or extraction
      let quality = '';
      let size = '';
      let colour = '';
      let imageLink = '';

      if (qualityIdx !== -1 && cells[qualityIdx]) {
        quality = cells[qualityIdx].trim();
      }
      if (sizeIdx !== -1 && cells[sizeIdx]) {
        size = cells[sizeIdx].trim();
      }
      if (colourIdx !== -1 && cells[colourIdx]) {
        colour = cells[colourIdx].trim();
      }
      if (imageLinkIdx !== -1 && cells[imageLinkIdx]) {
        imageLink = cells[imageLinkIdx].trim();
      }

      // If any is missing, extract from product description
      const extracted = extractFromProductName(product);
      if (!quality) quality = extracted.quality;
      if (!size) size = extracted.size;
      if (!colour) colour = extracted.colour;
      
      // Fallback for imageLink if not supplied in CSV
      if (!imageLink) {
        const lowerProd = product.toLowerCase();
        if (lowerProd.includes('earbud') || lowerProd.includes('headphone') || lowerProd.includes('wireless pro')) {
          imageLink = 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';
        } else if (lowerProd.includes('watch') || lowerProd.includes('fitband')) {
          imageLink = 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';
        } else if (lowerProd.includes('wallet') || lowerProd.includes('leather')) {
          imageLink = 'https://images.unsplash.com/photo-1627124765135-56c2f90a905a?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';
        } else if (lowerProd.includes('chair') || lowerProd.includes('office')) {
          imageLink = 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';
        } else if (lowerProd.includes('bottle') || lowerProd.includes('hydra')) {
          imageLink = 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';
        } else {
          imageLink = `https://picsum.photos/seed/${encodeURIComponent(product)}/150/150`;
        }
      }

      records.push({
        id: `csv_row_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        date,
        portal,
        product,
        amount,
        units,
        quality,
        size,
        colour,
        imageLink
      });
    } catch (err) {
      console.warn(`Error parsing CSV row ${i}:`, err);
    }
  }

  return { records, warning };
}

// Convert a set of records back to a simple CSV downloadable string (for mail/export simulation)
export function exportToCSVString(records: SalesRecord[]): string {
  const header = 'Packed On,Simplified,sum Qty,Portal,Product Quality,Size,Colour,Image Link\n';
  const rows = records.map(r => {
    const formattedDate = r.date.toLocaleDateString('en-IN');
    // Escape quotes in portal and product
    const escapedPortal = r.portal.includes(',') ? `"${r.portal.replace(/"/g, '""')}"` : r.portal;
    const escapedProduct = r.product.includes(',') ? `"${r.product.replace(/"/g, '""')}"` : r.product;
    const quality = r.quality || 'Standard';
    const size = r.size || 'M';
    const colour = r.colour || 'Default';
    const imageLink = r.imageLink || '';
    return `${formattedDate},${escapedProduct},${r.units},${escapedPortal},${quality},${size},${colour},${imageLink}`;
  }).join('\n');
  return header + rows;
}
