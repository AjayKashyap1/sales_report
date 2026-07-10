import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// General Helper to save CSV files
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 1. Export records/transactions to CSV
export function exportRecordsToCSV(records: any[], filename: string = 'sales_transactions.csv') {
  const headers = ['Packed On', 'Simplified', 'sum Qty', 'Portal', 'Product Quality', 'Size', 'Colour', 'Image Link'];
  const rows = records.map(r => [
    r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
    r.product,
    r.units,
    r.portal,
    r.quality || 'N/A',
    r.size || 'N/A',
    r.colour || 'N/A',
    r.imageLink || ''
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
  downloadCSV(csvContent, filename);
}

// 2. Export records/transactions to PDF
export function exportRecordsToPDF(records: any[], filename: string = 'sales_transactions.pdf') {
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Sales Transactions Report (Unit-Based)', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 21);
  doc.text(`Total Records: ${records.length}`, 14, 26);
  
  const headers = [['Packed On', 'Simplified', 'sum Qty', 'Portal', 'Product Quality', 'Size', 'Colour', 'Image Link']];
  const body = records.map(r => [
    r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
    r.product,
    String(r.units),
    r.portal,
    r.quality || 'N/A',
    r.size || 'N/A',
    r.colour || 'N/A',
    r.imageLink || ''
  ]);
  
  autoTable(doc, {
    head: headers,
    body: body,
    startY: 32,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 6: { halign: 'right' } }
  });
  
  doc.save(filename);
}

// 3. Export Rolling Run Rate Table to CSV
export function exportRunRateToCSV(rows: any[], segmentType: 'PORTAL' | 'PRODUCT', filename: string = 'rolling_run_rates.csv') {
  const nameHeader = segmentType === 'PORTAL' ? 'Marketplace Portal' : 'Column C (Simpiled)';
  const headers = [nameHeader, '3-Month Avg Units', '6-Month Avg Units', '12-Month Avg Units', 'Total Units Sold'];
  const dataRows = rows.map(r => [
    r.name,
    r.avg3Month,
    r.avg6Month,
    r.avg12Month,
    r.totalUnits
  ]);
  
  const csvContent = [headers.join(','), ...dataRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
  downloadCSV(csvContent, filename);
}

// 4. Export Rolling Run Rate Table to PDF
export function exportRunRateToPDF(rows: any[], segmentType: 'PORTAL' | 'PRODUCT', filename: string = 'rolling_run_rates.pdf') {
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const title = `Rolling Run Rates Report - ${segmentType === 'PORTAL' ? 'Portals' : 'Products'}`;
  doc.text(title, 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 21);
  
  const nameHeader = segmentType === 'PORTAL' ? 'Marketplace Portal' : 'Column C (Simpiled)';
  const headers = [[nameHeader, '3-Month Avg', '6-Month Avg', '12-Month Avg', 'Total Units']];
  const body = rows.map(r => [
    r.name,
    `${r.avg3Month} units`,
    `${r.avg6Month} units`,
    `${r.avg12Month} units`,
    `${r.totalUnits} units`
  ]);
  
  autoTable(doc, {
    head: headers,
    body: body,
    startY: 28,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });
  
  doc.save(filename);
}

// 5. Export Stock Planner Table to CSV
export function exportStockPlannerToCSV(rows: any[], filename: string = 'stock_planner.csv') {
  const headers = ['Column C (Simpiled)', '3M Run Rate Units', '6-Month Demand Projection', 'Current Stock Qty', 'Net Requirement Units', 'Status'];
  const dataRows = rows.map(r => [
    r.productName,
    r.runRate,
    r.projectedDemand,
    r.currentStock,
    r.netRequirement,
    r.status
  ]);
  
  const csvContent = [headers.join(','), ...dataRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
  downloadCSV(csvContent, filename);
}

// 6. Export Stock Planner Table to PDF
export function exportStockPlannerToPDF(rows: any[], filename: string = 'stock_planner.pdf') {
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('6-Month Stock Planner & Requirements Report', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 21);
  
  const headers = [['Column C (Simpiled)', '3M Run Rate', '6M Projected Demand', 'Current Stock', 'Net Req.', 'Status']];
  const body = rows.map(r => [
    r.productName,
    `${r.runRate} units/mo`,
    `${r.projectedDemand} units`,
    `${r.currentStock} units`,
    `${r.netRequirement} units`,
    r.status
  ]);
  
  autoTable(doc, {
    head: headers,
    body: body,
    startY: 28,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });
  
  doc.save(filename);
}
