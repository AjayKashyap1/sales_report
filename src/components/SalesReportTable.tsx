import React, { useState, useMemo } from 'react';
import { SalesRecord } from '../types';
import { 
  Search, 
  ArrowUpDown, 
  Calendar, 
  Image as ImageIcon, 
  ShoppingBag, 
  Layers, 
  Tag, 
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  SlidersHorizontal,
  FolderTree
} from 'lucide-react';
import { exportRecordsToCSV, exportRecordsToPDF } from '../utils/exporter';

interface SalesReportTableProps {
  records: SalesRecord[];
}

export default function SalesReportTable({ records }: SalesReportTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<keyof SalesRecord>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Handle Header Sort Click
  const requestSort = (field: keyof SalesRecord) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // 1. Search and Filter
  const filteredData = useMemo(() => {
    return records.filter(row => {
      const sQuery = searchQuery.toLowerCase();
      const productMatch = row.product.toLowerCase().includes(sQuery);
      const portalMatch = row.portal.toLowerCase().includes(sQuery);
      const qualityMatch = row.quality?.toLowerCase().includes(sQuery) || false;
      const sizeMatch = row.size?.toLowerCase().includes(sQuery) || false;
      const colourMatch = row.colour?.toLowerCase().includes(sQuery) || false;
      return productMatch || portalMatch || qualityMatch || sizeMatch || colourMatch;
    });
  }, [records, searchQuery]);

  // 2. Sort Data
  const sortedData = useMemo(() => {
    const data = [...filteredData];
    data.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (valA instanceof Date && valB instanceof Date) {
        return sortDirection === 'asc' 
          ? valA.getTime() - valB.getTime() 
          : valB.getTime() - valA.getTime();
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      // Numbers
      return sortDirection === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });
    return data;
  }, [filteredData, sortField, sortDirection]);

  // 3. Paginate Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Stats Calculations for Bento Overview Cards
  const reportStats = useMemo(() => {
    const totalQty = sortedData.reduce((sum, r) => sum + r.units, 0);
    const uniqueProducts = new Set(sortedData.map(r => r.product)).size;
    const uniquePortals = new Set(sortedData.map(r => r.portal)).size;
    
    return {
      totalQty,
      uniqueProducts,
      uniquePortals,
      totalRows: sortedData.length
    };
  }, [sortedData]);

  const getPortalBadgeStyles = (portal: string) => {
    const p = portal.toLowerCase();
    if (p.includes('amazon')) {
      return 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
    } else if (p.includes('flipkart')) {
      return 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
    } else if (p.includes('meesho')) {
      return 'bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-800 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-900/50';
    }
    return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div id="sales-report-table-section" className="space-y-6">
      
      {/* 1. REPORT STATS OVERVIEW HEADER (BENTO GRID STYLE) */}
      <div id="report-bento-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Total Units</span>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {reportStats.totalQty.toLocaleString('en-IN')}
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">pcs</span>
            </h4>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
            <ShoppingBag size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Loaded Rows</span>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {reportStats.totalRows.toLocaleString('en-IN')}
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">items</span>
            </h4>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60">
            <Layers size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Unique Products</span>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {reportStats.uniqueProducts}
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">skus</span>
            </h4>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60">
            <Tag size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Active Portals</span>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {reportStats.uniquePortals}
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">channels</span>
            </h4>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
            <FolderTree size={18} />
          </div>
        </div>

      </div>

      {/* 2. MAIN DETAILED REPORT CONTROLLER BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 md:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            id="report-search-input"
            type="text"
            placeholder="Search report by Product Name, Portal Name, Item, Size..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white dark:bg-slate-800 dark:hover:bg-slate-750 focus:dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-colors"
          />
        </div>

        {/* Rows selector and download tools */}
        <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold font-mono">Rows per page:</span>
            <select
              id="report-rows-select"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-xs text-slate-750 dark:text-slate-250 py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            >
              <option value={10}>10 rows</option>
              <option value={15}>15 rows</option>
              <option value={30}>30 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>

          <div className="flex bg-white dark:bg-slate-850 rounded-lg border border-slate-250 dark:border-slate-700 overflow-hidden shadow-2xs">
            <span className="px-2.5 py-1.5 text-[10px] bg-slate-50 dark:bg-slate-900 font-bold border-r border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-mono flex items-center gap-1">
              <Download size={11} /> Export
            </span>
            <button
              onClick={() => exportRecordsToCSV(sortedData, 'detailed_sales_report.csv')}
              className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border-r border-slate-150 dark:border-slate-700 transition-colors cursor-pointer"
            >
              CSV
            </button>
            <button
              onClick={() => exportRecordsToPDF(sortedData, 'detailed_sales_report.pdf')}
              className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              PDF
            </button>
          </div>

        </div>

      </div>

      {/* 3. THE 8-COLUMN DETAILED SALES REPORT TABLE (FULL PAGE WIDTH) */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                {/* 1. IMAGE LINK */}
                <th className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono text-center w-24">
                  <div className="flex items-center justify-center gap-1 text-center">
                    <ImageIcon size={12} className="text-slate-400" />
                    Image Link
                  </div>
                </th>

                {/* 2. PACKED ON */}
                <th 
                  className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  onClick={() => requestSort('date')}
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-slate-400" />
                    Order Date
                    <ArrowUpDown size={12} className={sortField === 'date' ? 'text-blue-600' : 'text-slate-300'} />
                  </div>
                </th>

                {/* 3. SIMPLIFIED */}
                <th 
                  className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  onClick={() => requestSort('product')}
                >
                  <div className="flex items-center gap-1.5">
                    Product Name
                    <ArrowUpDown size={12} className={sortField === 'product' ? 'text-blue-600' : 'text-slate-300'} />
                  </div>
                </th>

                {/* 4. SUM QTY */}
                <th 
                  className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-right w-28"
                  onClick={() => requestSort('units')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Units
                    <ArrowUpDown size={12} className={sortField === 'units' ? 'text-blue-600' : 'text-slate-300'} />
                  </div>
                </th>

                {/* 5. PORTAL */}
                <th 
                  className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors w-36"
                  onClick={() => requestSort('portal')}
                >
                  <div className="flex items-center gap-1.5">
                    Portal Name
                    <ArrowUpDown size={12} className={sortField === 'portal' ? 'text-blue-600' : 'text-slate-300'} />
                  </div>
                </th>

                {/* 6. PRODUCT QUALITY */}
                <th 
                  className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors w-36"
                  onClick={() => requestSort('quality')}
                >
                  <div className="flex items-center gap-1.5">
                    Item
                    <ArrowUpDown size={12} className={sortField === 'quality' ? 'text-blue-600' : 'text-slate-300'} />
                  </div>
                </th>

                {/* 7. SIZE */}
                <th 
                  className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-center w-24"
                  onClick={() => requestSort('size')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    Size
                    <ArrowUpDown size={12} className={sortField === 'size' ? 'text-blue-600' : 'text-slate-300'} />
                  </div>
                </th>

                {/* 8. COLOUR */}
                <th 
                  className="p-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-center w-28"
                  onClick={() => requestSort('colour')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    Colour
                    <ArrowUpDown size={12} className={sortField === 'colour' ? 'text-blue-600' : 'text-slate-300'} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => {
                  const displayDate = row.date instanceof Date 
                    ? row.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : String(row.date);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* 1. IMAGE LINK DISPLAY */}
                      <td className="p-4 text-center">
                        {row.imageLink ? (
                          <div className="relative inline-block group">
                            <img 
                              src={row.imageLink} 
                              alt={row.product} 
                              referrerPolicy="no-referrer"
                              className="h-10 w-10 rounded-md border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 object-cover shadow-2xs transition-transform group-hover:scale-105 cursor-zoom-in"
                              onClick={() => setSelectedImage(row.imageLink || null)}
                              onError={(e) => {
                                // Simple fallback if URL breaks
                                (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(row.product)}/100/100`;
                              }}
                            />
                            <button 
                              onClick={() => setSelectedImage(row.imageLink || null)}
                              className="absolute -top-1 -right-1 h-4 w-4 bg-slate-900/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Zoom"
                            >
                              <Maximize2 size={8} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">No image</span>
                        )}
                      </td>

                      {/* 2. PACKED ON */}
                      <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 font-mono">
                        {displayDate}
                      </td>

                      {/* 3. SIMPLIFIED */}
                      <td className="p-4 text-xs font-black text-slate-800 dark:text-slate-200 max-w-sm">
                        {row.product}
                      </td>

                      {/* 4. SUM QTY */}
                      <td className="p-4 text-xs font-extrabold text-right font-mono text-blue-600 dark:text-blue-400">
                        {row.units.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">pcs</span>
                      </td>

                      {/* 5. PORTAL */}
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${getPortalBadgeStyles(row.portal)}`}>
                          {row.portal}
                        </span>
                      </td>

                      {/* 6. PRODUCT QUALITY */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold">
                          <span className={`h-2 w-2 rounded-full ${
                            row.quality?.toLowerCase() === 'premium' || row.quality?.toLowerCase() === 'deluxe'
                              ? 'bg-amber-400' 
                              : row.quality?.toLowerCase() === 'economy' 
                              ? 'bg-slate-400 dark:bg-slate-500' 
                              : 'bg-blue-400'
                          }`}></span>
                          {row.quality || 'Standard'}
                        </span>
                      </td>

                      {/* 7. SIZE */}
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono">
                          {row.size || 'M'}
                        </span>
                      </td>

                      {/* 8. COLOUR */}
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-md">
                          {row.colour || 'Default'}
                        </span>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 font-medium italic">
                    No matching sales records found. Adjust your search keywords or reload the source dataset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. FOOTER PAGINATION CONTROLLER */}
        {sortedData.length > 0 && (
          <div className="bg-slate-50/50 dark:bg-slate-850/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div>
              Showing <strong className="font-mono text-slate-800 dark:text-slate-200">{Math.min(sortedData.length, (currentPage - 1) * itemsPerPage + 1)}</strong> to{' '}
              <strong className="font-mono text-slate-800 dark:text-slate-200">{Math.min(sortedData.length, currentPage * itemsPerPage)}</strong> of{' '}
              <strong className="font-mono text-slate-800 dark:text-slate-200">{sortedData.length}</strong> total records
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-report-prev-page"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="font-mono px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-bold">
                Page {currentPage} of {totalPages || 1}
              </span>

              <button
                id="btn-report-next-page"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. IMAGE PREVIEW ZOOM MODAL */}
      {selectedImage && (
        <div 
          id="image-preview-modal" 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3 rounded-2xl shadow-2xl flex flex-col animate-in scale-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              id="btn-close-img-modal"
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md transition-transform hover:scale-105"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
            <img 
              src={selectedImage} 
              alt="High resolution preview" 
              referrerPolicy="no-referrer"
              className="w-full aspect-square object-cover rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/broken/500/500';
              }}
            />
            <div className="pt-3.5 pb-1 px-1 flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              <span>E-Commerce Asset Preview</span>
              <span>1:1 Aspect Cover</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
