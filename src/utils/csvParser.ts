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

// Parses Indian / UK date format (DD/MM/YYYY or DD-MM-YYYY), verbal month names (DD September YYYY), or standard dates
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

  // Support verbal month names (e.g. "1 September 2024" or "1-September-2024" or "September 1, 2024")
  const words = cleanStr.split(/[\s\-.,/]+/);
  if (words.length === 3) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    let day = -1;
    let monthIdx = -1;
    let year = -1;
    
    const p1 = words[0].toLowerCase();
    const p2 = words[1].toLowerCase();
    const p3 = words[2];
    
    let m1 = months.indexOf(p1);
    if (m1 === -1) m1 = shortMonths.indexOf(p1.slice(0, 3));
    
    let m2 = months.indexOf(p2);
    if (m2 === -1) m2 = shortMonths.indexOf(p2.slice(0, 3));
    
    if (m1 !== -1) {
      monthIdx = m1;
      day = parseInt(p2, 10);
      year = parseInt(p3, 10);
    } else if (m2 !== -1) {
      monthIdx = m2;
      day = parseInt(p1, 10);
      year = parseInt(p3, 10);
    }
    
    if (monthIdx !== -1 && !isNaN(day) && !isNaN(year) && year > 1000) {
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime())) return d;
    }
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

  // Detect indices based on exact Google Sheet headers, new names, or column labels
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
    const h = header.trim().toLowerCase();
    
    // 1. Packed On / Order Date (Column A)
    if (h === 'packed on' || h === 'order date' || h.includes('packed on') || h.includes('order date') || h.includes('date') || h === 'a') {
      if (dateIdx === -1) dateIdx = idx;
    }
    // 2. Product Quality / Item (Column B)
    else if (h === 'item' || h === 'product quality' || h.includes('product quality') || h === 'quality' || h === 'b') {
      if (qualityIdx === -1) qualityIdx = idx;
    }
    // 3. Size (Column C)
    else if (h === 'size' || h === 'c') {
      if (sizeIdx === -1) sizeIdx = idx;
    }
    // 4. Colour / Color (Column D)
    else if (h === 'colour' || h === 'color' || h.includes('colour') || h.includes('color') || h === 'd') {
      if (colourIdx === -1) colourIdx = idx;
    }
    // 5. Product Name / Simplified (Column E)
    else if (h === 'product name' || h === 'simplified' || h.includes('product name') || h.includes('simplified') || h === 'product' || h === 'e') {
      if (productIdx === -1) productIdx = idx;
    }
    // 6. sum sum Qty / sum Qty / Units (Column F)
    else if (h === 'sum sum qty' || h === 'sum qty' || h === 'units' || h.includes('sum sum qty') || h.includes('sum qty') || h.includes('units') || h.includes('qty') || h === 'f') {
      if (unitsIdx === -1) unitsIdx = idx;
    }
    // 7. Portal / Portal Name (Column G)
    else if (h === 'portal' || h === 'portal name' || h.includes('portal name') || (h.includes('portal') && !h.includes('quality')) || h === 'g') {
      if (portalIdx === -1) portalIdx = idx;
    }
    // 8. Image Link (Column H)
    else if (h === 'image link' || h === 'imagelink' || h.includes('image link') || h.includes('imagelink') || h.includes('image') || h === 'h') {
      if (imageLinkIdx === -1) imageLinkIdx = idx;
    }
    // 9. Amount / Sales
    else if (h.includes('amount') || h.includes('revenue') || h.includes('sales') || h.includes('price') || h.includes('total') || h.includes('value')) {
      if (amountIdx === -1) amountIdx = idx;
    }
  });

  // Safe mapping position-based fallbacks (A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7)
  if (dateIdx === -1) dateIdx = 0;
  if (qualityIdx === -1) qualityIdx = headers.length > 1 ? 1 : -1;
  if (sizeIdx === -1) sizeIdx = headers.length > 2 ? 2 : -1;
  if (colourIdx === -1) colourIdx = headers.length > 3 ? 3 : -1;
  if (productIdx === -1) productIdx = headers.length > 4 ? 4 : (headers.length > 2 ? 2 : 0);
  if (unitsIdx === -1) unitsIdx = headers.length > 5 ? 5 : (headers.length > 3 ? 3 : 0);
  if (portalIdx === -1) portalIdx = headers.length > 6 ? 6 : (headers.length > 1 ? 1 : 0);
  if (imageLinkIdx === -1) imageLinkIdx = headers.length > 7 ? 7 : -1;

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
    // Be robust: require at least 3 columns to consider it a valid record
    if (cells.length < 3) {
      continue;
    }

    try {
      const dateRaw = dateIdx >= 0 && dateIdx < cells.length ? cells[dateIdx] : '';
      const portalRaw = portalIdx >= 0 && portalIdx < cells.length ? cells[portalIdx] : 'Unknown';
      const productRaw = productIdx >= 0 && productIdx < cells.length ? cells[productIdx] : 'Unknown';
      const amountRaw = amountIdx >= 0 && amountIdx < cells.length ? cells[amountIdx] : '0';
      const unitsRaw = unitsIdx >= 0 && unitsIdx < cells.length ? cells[unitsIdx] : '1';

      const date = parseFlexibleDate(dateRaw);
      const portal = portalRaw.trim() || 'Unknown Portal';
      const product = productRaw.trim() || 'Unknown Product';
      
      // Clean units
      const cleanUnitsStr = unitsRaw.replace(/[^0-9]/g, '');
      const units = parseInt(cleanUnitsStr, 10) || 1;

      // Clean amount: strip spaces, quotes, currency symbols (₹, $), commas
      const cleanAmountStr = amountRaw.replace(/[₹$,\s"]/g, '');
      let amount = parseFloat(cleanAmountStr) || 0;

      // If no amount is provided (or it is 0), generate highly realistic price based on product type
      if (amount === 0) {
        let basePrice = 1199;
        const lowerProd = product.toLowerCase();
        if (lowerProd.includes('newman')) basePrice = 1499;
        else if (lowerProd.includes('bostan')) basePrice = 999;
        else if (lowerProd.includes('jericho')) basePrice = 1899;
        else if (lowerProd.includes('kid')) basePrice = 799;
        else if (lowerProd.includes('luxury')) basePrice = 1999;
        amount = units * basePrice;
      }

      // Quality, Size, Colour parsing or extraction
      let quality = '';
      let size = '';
      let colour = '';
      let imageLink = '';

      if (qualityIdx !== -1 && qualityIdx < cells.length && cells[qualityIdx]) {
        quality = cells[qualityIdx].trim();
      }
      if (sizeIdx !== -1 && sizeIdx < cells.length && cells[sizeIdx]) {
        size = cells[sizeIdx].trim();
      }
      if (colourIdx !== -1 && colourIdx < cells.length && cells[colourIdx]) {
        colour = cells[colourIdx].trim();
      }
      if (imageLinkIdx !== -1 && imageLinkIdx < cells.length && cells[imageLinkIdx]) {
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
  const header = 'Order Date,Product Name,Units,Portal Name,Item,Size,Colour,Image Link\n';
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
