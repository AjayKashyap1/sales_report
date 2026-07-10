import React, { useState, useMemo, useEffect } from 'react';
import { SalesRecord } from '../types';
import { 
  Package, 
  ArrowUpDown, 
  Edit3, 
  Check, 
  Clipboard, 
  AlertCircle, 
  TrendingUp, 
  FileSpreadsheet, 
  ArrowDownToLine, 
  HelpCircle,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  ListRestart
} from 'lucide-react';

interface InventoryPlannerProps {
  records: SalesRecord[];
}

export default function InventoryPlanner({ records }: InventoryPlannerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<'productName' | 'avg3MonthUnits' | 'projected6MDemand' | 'currentStock' | 'shortfall' | 'status'>('shortfall');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load inventory from localStorage or initialize with demo values
  const [inventory, setInventory] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('ecommerce_current_inventory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved inventory', e);
      }
    }
    // Realistic default values for standard products
    return {
      'Wireless Pro Earbuds': 180,
      'Fitband Pulse Smartwatch': 65,
      'Premium Leather Wallet': 210,
      'Ergonomic Office Chair': 24,
      'Stainless Steel HydraBottle': 110
    };
  });

  // Save to localStorage whenever inventory changes
  useEffect(() => {
    localStorage.setItem('ecommerce_current_inventory', JSON.stringify(inventory));
  }, [inventory]);

  // Extract unique products and calculate rolling 3-month average units and 6-month demand
  const productCalculations = useMemo(() => {
    if (records.length === 0) return [];

    // Find the latest transaction date in records to anchor lookback
    const latestDate = new Date(Math.max(...records.map(r => r.date.getTime())));
    const latestYear = latestDate.getFullYear();
    const latestMonth = latestDate.getMonth();

    // Define the boundary for the last 3 months (Month indices: latestMonth, latestMonth-1, latestMonth-2)
    const boundary3M = new Date(latestYear, latestMonth - 2, 1);

    // Grouping by product name
    const grouped: Record<string, {
      productName: string;
      unitsLast3M: number;
    }> = {};

    // Get all unique products present in current records to ensure we include them
    const uniqueProductNames = Array.from(new Set(records.map(r => r.product)));

    uniqueProductNames.forEach(name => {
      grouped[name] = {
        productName: name,
        unitsLast3M: 0
      };
    });

    // Populate units sold in last 3 months
    records.forEach(r => {
      if (r.date >= boundary3M) {
        if (grouped[r.product]) {
          grouped[r.product].unitsLast3M += r.units;
        }
      }
    });

    // Compute forecasting metrics
    return uniqueProductNames.map(name => {
      const g = grouped[name];
      // Monthly Run Rate over last 3M (Total units divided by 3)
      const avg3MonthUnits = Math.round((g.unitsLast3M / 3) * 10) / 10;
      
      // Projected Demand for next 6 months
      const projected6MDemand = Math.round(avg3MonthUnits * 6);
      
      // Current inventory stock
      const currentStock = inventory[name] !== undefined ? inventory[name] : 0;
      
      // Shortfall: Net stock requirement to cover next 6 months
      const shortfall = Math.max(0, projected6MDemand - currentStock);

      // Determine stock status
      let status: 'CRITICAL' | 'UNDERSTOCK' | 'REORDER' | 'SUFFICIENT' = 'SUFFICIENT';
      if (currentStock === 0) {
        status = 'CRITICAL';
      } else if (currentStock < avg3MonthUnits * 1.5) {
        status = 'UNDERSTOCK'; // Less than 1.5 months of cover
      } else if (currentStock < projected6MDemand) {
        status = 'REORDER'; // Under 6-months requirement
      }

      return {
        productName: name,
        unitsLast3M: g.unitsLast3M,
        avg3MonthUnits,
        projected6MDemand,
        currentStock,
        shortfall,
        status
      };
    });
  }, [records, inventory]);

  // Handle single inventory change
  const handleInventoryChange = (productName: string, value: number) => {
    const cleanVal = Math.max(0, Math.floor(value));
    setInventory(prev => ({
      ...prev,
      [productName]: cleanVal
    }));
  };

  // Quick increment/decrement helpers
  const adjustStock = (productName: string, delta: number) => {
    const current = inventory[productName] !== undefined ? inventory[productName] : 0;
    handleInventoryChange(productName, current + delta);
  };

  // Flexible CSV/Text bulk inventory parser
  const handleBulkImport = () => {
    setBulkError(null);
    setBulkSuccess(null);

    if (!bulkInput.trim()) {
      setBulkError('कृपया इनपुट बॉक्स में कुछ इन्वेंटरी डेटा डालें। (Please enter some inventory data)');
      return;
    }

    const lines = bulkInput.split('\n');
    const updatedInventory = { ...inventory };
    let successCount = 0;
    const skippedLines: string[] = [];

    // Get list of known product names for case-insensitive partial match
    const knownProducts = productCalculations.map(p => p.productName);

    lines.forEach((line, idx) => {
      const cleanLine = line.trim();
      if (!cleanLine || idx === 0 && (cleanLine.toLowerCase().includes('product') || cleanLine.toLowerCase().includes('inventory') || cleanLine.toLowerCase().includes('stock'))) {
        // Skip empty lines or header rows
        return;
      }

      // Try parsing formats: 
      // 1) "Product Name, 150" (comma separated)
      // 2) "Product Name\t150" (tab separated)
      // 3) "Product Name 150" (space separated at the end)
      let matchedName = '';
      let qty = -1;

      // Check for Comma, Semicolon or Tab separators
      const separators = [',', ';', '\t'];
      let foundSeparator = false;
      for (const sep of separators) {
        if (cleanLine.includes(sep)) {
          const parts = cleanLine.split(sep);
          const rawQty = parts[parts.length - 1].trim();
          const parsedQty = parseInt(rawQty, 10);
          if (!isNaN(parsedQty)) {
            qty = parsedQty;
            matchedName = parts.slice(0, parts.length - 1).join(sep).trim();
            foundSeparator = true;
            break;
          }
        }
      }

      // Fallback: Match text followed by a number at the end
      if (!foundSeparator) {
        const spaceMatch = cleanLine.match(/(.+?)\s+(\d+)\s*$/);
        if (spaceMatch) {
          matchedName = spaceMatch[1].trim();
          qty = parseInt(spaceMatch[2], 10);
        }
      }

      if (matchedName && qty >= 0) {
        // Find best match in known products (case-insensitive exact, then partial)
        const exactMatch = knownProducts.find(
          kp => kp.toLowerCase() === matchedName.toLowerCase()
        );

        const partialMatch = exactMatch || knownProducts.find(
          kp => kp.toLowerCase().includes(matchedName.toLowerCase()) || matchedName.toLowerCase().includes(kp.toLowerCase())
        );

        if (partialMatch) {
          updatedInventory[partialMatch] = qty;
          successCount++;
        } else {
          // If product is not yet in sales list, still store it so it persists when product is loaded
          updatedInventory[matchedName] = qty;
          successCount++;
        }
      } else {
        if (cleanLine) {
          skippedLines.push(`Line ${idx + 1}: "${cleanLine}"`);
        }
      }
    });

    setInventory(updatedInventory);
    
    if (successCount > 0) {
      setBulkSuccess(`सफलतापूर्वक ${successCount} उत्पादों की इन्वेंटरी अपडेट कर दी गई है! 🎉`);
      setBulkInput('');
      setTimeout(() => {
        setIsBulkOpen(false);
        setBulkSuccess(null);
      }, 2500);
    } else {
      setBulkError('कोई मान्य उत्पाद मिलान नहीं मिला। कृपया प्रारूप की जांच करें (उदा: उत्पाद का नाम, मात्रा)');
    }
  };

  // Sorting Handler
  const requestSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sorted and Filtered Calculations
  const processedPlannerData = useMemo(() => {
    let filtered = productCalculations.filter(p =>
      p.productName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        // Numbers or Status Enums
        return sortDirection === 'asc'
          ? (valA as any) - (valB as any)
          : (valB as any) - (valA as any);
      }
    });

    return filtered;
  }, [productCalculations, searchQuery, sortField, sortDirection]);

  // Overall Inventory Stats
  const plannerStats = useMemo(() => {
    const total6MDemand = productCalculations.reduce((sum, p) => sum + p.projected6MDemand, 0);
    const totalCurrentStock = productCalculations.reduce((sum, p) => sum + p.currentStock, 0);
    const totalShortfall = productCalculations.reduce((sum, p) => sum + p.shortfall, 0);
    const criticalStockouts = productCalculations.filter(p => p.currentStock === 0).length;
    const underStockedCount = productCalculations.filter(p => p.status === 'UNDERSTOCK' || p.status === 'CRITICAL').length;

    return {
      total6MDemand,
      totalCurrentStock,
      totalShortfall,
      criticalStockouts,
      underStockedCount
    };
  }, [productCalculations]);

  // Export to CSV Function
  const exportForecastCSV = () => {
    const csvHeader = 'Product Name,Last 3M Monthly Avg Sales (Units),Projected 6M Demand (Units),Current Available Inventory,Stock Requirement (Shortfall),Status\n';
    const rows = productCalculations.map(p => {
      const statusText = p.status === 'CRITICAL' ? 'CRITICAL STOCKOUT' : 
                         p.status === 'UNDERSTOCK' ? 'UNDER-STOCKED' : 
                         p.status === 'REORDER' ? 'REORDER REQUIRED' : 'STOCK SUFFICIENT';
      
      const escapedName = p.productName.includes(',') ? `"${p.productName.replace(/"/g, '""')}"` : p.productName;
      return `${escapedName},${p.avg3MonthUnits},${p.projected6MDemand},${p.currentStock},${p.shortfall},${statusText}`;
    }).join('\n');

    const blob = new Blob([csvHeader + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `6_month_stock_requirement_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="inventory-planner-section" className="bg-white border border-slate-200 rounded-lg p-5 md:p-6 space-y-6 shadow-sm">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 font-mono">
            Forecasting & Replenishment (पूर्वानुमान एवं पुनःपूर्ति)
          </span>
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2 mt-1 uppercase tracking-wide">
            <Package size={20} className="text-emerald-600" />
            6-Month Stock Requirement Planner (यूनिट-आधारित स्टॉक आवश्यकता नियोजक)
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            यह प्रणाली पिछले <strong>3 महीनों की औसत यूनिट बिक्री (Monthly Average Units sold)</strong> की गणना करती है और उसके आधार पर अगले <strong>6 महीनों के स्टॉक की आवश्यकता (6-Month Projected Demand)</strong> का अनुमान लगाती है। अपने पास की वर्तमान इन्वेंट्री दर्ज करें ताकि आवश्यक खरीद स्टॉक की जानकारी मिल सके।
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0 self-start md:self-center">
          <button
            id="btn-toggle-bulk-paste"
            onClick={() => { setIsBulkOpen(!isBulkOpen); setBulkError(null); setBulkSuccess(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              isBulkOpen 
                ? 'bg-slate-800 border-slate-900 text-white shadow-sm' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <Clipboard size={14} />
            {isBulkOpen ? 'Close Bulk Importer' : 'Bulk Copy-Paste Inventory'}
          </button>

          <button
            id="btn-export-forecast-report"
            onClick={exportForecastCSV}
            disabled={productCalculations.length === 0}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowDownToLine size={14} />
            Export Forecast CSV
          </button>
        </div>
      </div>

      {/* KPI METRICS INSIDE INVENTORY PLANNER */}
      <div id="planner-kpis-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total 6-Month Demand</span>
          <h5 className="text-xl font-bold font-mono text-slate-800 mt-1">{plannerStats.total6MDemand.toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-400">units</span></h5>
          <span className="text-[9px] text-slate-400 font-medium block mt-1.5 uppercase">Estimated units to be sold</span>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Current Stock Available</span>
          <h5 className="text-xl font-bold font-mono text-slate-800 mt-1">{plannerStats.totalCurrentStock.toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-400">units</span></h5>
          <span className="text-[9px] text-slate-400 font-medium block mt-1.5 uppercase">Your aggregate inventory on hand</span>
        </div>

        <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-lg shadow-2xs">
          <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">Total Net Stock Required</span>
          <h5 className="text-xl font-bold font-mono text-rose-700 mt-1">{plannerStats.totalShortfall.toLocaleString('en-IN')} <span className="text-xs font-medium text-rose-500">units</span></h5>
          <span className="text-[9px] text-rose-500 font-bold block mt-1.5 uppercase">Shortfall to purchase immediately</span>
        </div>

        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg shadow-2xs">
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">Critical & Low Stock</span>
          <h5 className="text-xl font-bold font-mono text-amber-800 mt-1">{plannerStats.underStockedCount} <span className="text-xs font-medium text-amber-600">products</span></h5>
          <span className="text-[9px] text-amber-600 font-bold block mt-1.5 uppercase">
            {plannerStats.criticalStockouts} out of stock (0 inventory)
          </span>
        </div>

      </div>

      {/* BULK TEXTAREA COPY-PASTER */}
      {isBulkOpen && (
        <div id="bulk-inventory-importer-box" className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-md border border-slate-200">
            <HelpCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">बल्क इन्वेंटरी अपलोड गाइड (Bulk Paste Guide):</p>
              <p className="mt-1">
                आप सीधे एक्सेल या गूगल शीट से दो कॉलम (Product Name, Current Inventory) को कॉपी करके यहाँ पेस्ट कर सकते हैं।
                प्रत्येक उत्पाद एक नई लाइन में होना चाहिए। उदाहरण:
              </p>
              <pre className="mt-2 p-1.5 bg-slate-50 font-mono text-[10px] text-slate-500 rounded border border-slate-150 inline-block">
                Wireless Pro Earbuds, 120{"\n"}
                Fitband Pulse Smartwatch, 45{"\n"}
                Ergonomic Office Chair, 12
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Paste Product Inventory Lines (उत्पाद सूची पंक्तियाँ पेस्ट करें):</label>
            <textarea
              id="textarea-bulk-inventory"
              rows={4}
              placeholder="E.g.&#10;Wireless Pro Earbuds, 150&#10;Fitband Pulse Smartwatch, 50"
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {bulkError && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium rounded-lg flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <p>{bulkError}</p>
            </div>
          )}

          {bulkSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium rounded-lg flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <p>{bulkSuccess}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              id="btn-submit-bulk-inventory"
              onClick={handleBulkImport}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Parse & Update Inventory
            </button>
            <button
              id="btn-cancel-bulk"
              onClick={() => { setBulkInput(''); setIsBulkOpen(false); setBulkError(null); }}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SEARCH PRODUCT PLANNER BAR */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Search size={14} />
        </span>
        <input
          id="input-planner-search"
          type="text"
          placeholder="Filter planner by product name (उत्पाद के नाम से खोजें)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* PLANNER TABLE */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 transition-colors"
                onClick={() => requestSort('productName')}
              >
                <div className="flex items-center gap-1.5">
                  Product Description
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-slate-800 transition-colors"
                onClick={() => requestSort('avg3MonthUnits')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  3-Month Avg Sales/Month (L3M)
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-slate-800 transition-colors"
                onClick={() => requestSort('projected6MDemand')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  6-Month Projected Sales
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center cursor-pointer hover:text-slate-800 transition-colors w-48"
                onClick={() => requestSort('currentStock')}
              >
                <div className="flex items-center justify-center gap-1.5">
                  Current Inventory (Stock on Hand)
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-slate-800 transition-colors"
                onClick={() => requestSort('shortfall')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  Stock Required (Shortfall)
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center cursor-pointer hover:text-slate-800 transition-colors"
                onClick={() => requestSort('status')}
              >
                <div className="flex items-center justify-center gap-1.5">
                  Status
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedPlannerData.length > 0 ? (
              processedPlannerData.map((row) => {
                return (
                  <tr key={row.productName} className="hover:bg-slate-50/50 transition-colors">
                    {/* PRODUCT NAME */}
                    <td className="p-3 text-xs font-semibold text-slate-800 max-w-xs truncate">
                      {row.productName}
                    </td>

                    {/* 3M MONTHLY AVERAGE SALES */}
                    <td className="p-3 text-xs font-bold text-right font-mono text-slate-700">
                      {row.avg3MonthUnits.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">pcs/mo</span>
                    </td>

                    {/* 6M PROJECTED SALES */}
                    <td className="p-3 text-xs font-bold text-right font-mono text-blue-600">
                      {row.projected6MDemand.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">pcs</span>
                    </td>

                    {/* INTERACTIVE CURRENT STOCK ON HAND INPUT */}
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => adjustStock(row.productName, -10)}
                          title="Decrease by 10"
                          className="p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded transition-colors cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        
                        <input
                          id={`input-stock-${row.productName.replace(/\s+/g, '-').toLowerCase()}`}
                          type="number"
                          min="0"
                          className="w-16 bg-white border border-slate-150 rounded text-center text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-emerald-500 p-0.5"
                          value={row.currentStock}
                          onChange={(e) => handleInventoryChange(row.productName, parseInt(e.target.value, 10) || 0)}
                        />

                        <button
                          type="button"
                          onClick={() => adjustStock(row.productName, 10)}
                          title="Increase by 10"
                          className="p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded transition-colors cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>

                    {/* SHORTFALL STOCK REQUIRED */}
                    <td className="p-3 text-right">
                      {row.shortfall > 0 ? (
                        <span className="text-xs font-extrabold text-rose-600 font-mono">
                          +{row.shortfall.toLocaleString('en-IN')} <span className="text-[9px] uppercase tracking-wide">units required</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 font-mono flex items-center justify-end gap-1">
                          <Check size={14} /> Sufficient
                        </span>
                      )}
                    </td>

                    {/* STATUS BADGE */}
                    <td className="p-3 text-center">
                      {row.status === 'CRITICAL' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold text-rose-700 bg-rose-100 border border-rose-200 rounded-full uppercase tracking-wider font-mono animate-pulse">
                          ⚠️ Stockout
                        </span>
                      )}
                      {row.status === 'UNDERSTOCK' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-100 border border-amber-200 rounded-full uppercase tracking-wider font-mono">
                          ⚡ Under-stocked
                        </span>
                      )}
                      {row.status === 'REORDER' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold text-orange-700 bg-orange-100 border border-orange-200 rounded-full uppercase tracking-wider font-mono">
                          📦 Reorder Req
                        </span>
                      )}
                      {row.status === 'SUFFICIENT' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full uppercase tracking-wider font-mono">
                          ✅ Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-slate-400 font-medium">
                  {records.length === 0 ? 'कृपया विश्लेषण के लिए पहले बिक्री डेटा लोड करें।' : 'कोई मिलान उत्पाद नहीं मिला।'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
