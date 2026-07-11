import React, { useState, useMemo, useEffect } from 'react';
import { SalesRecord, RollingAverageRow } from '../types';
import { Search, ArrowUpDown, ShieldAlert, BarChart3, TrendingUp, Info, ShoppingBag, Landmark, ArrowDownToLine } from 'lucide-react';

interface AnalyticsTableProps {
  records: SalesRecord[];
}

type GroupSegment = 'PORTAL' | 'PRODUCT';

export default function AnalyticsTable({ records }: AnalyticsTableProps) {
  const [activeTab, setActiveTab] = useState<GroupSegment>('PORTAL');
  const [searchQuery, setSearchQuery] = useState('');
  const metricMode = 'UNITS';
  
  const [sortField, setSortField] = useState<keyof RollingAverageRow>('avg3Month');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Compute rolling averages based on latest record date
  const rollingAverages = useMemo(() => {
    if (records.length === 0) return [];

    // Find the latest record date to anchor lookback
    const latestDate = new Date(Math.max(...records.map(r => r.date.getTime())));
    const latestYear = latestDate.getFullYear();
    const latestMonth = latestDate.getMonth();

    // Define boundary dates
    // 3 Months lookup: Month index: latestMonth, latestMonth-1, latestMonth-2
    const boundary3M = new Date(latestYear, latestMonth - 2, 1);
    // 6 Months lookup: latestMonth down to latestMonth-5
    const boundary6M = new Date(latestYear, latestMonth - 5, 1);
    // 12 Months lookup: latestMonth down to latestMonth-11
    const boundary12M = new Date(latestYear, latestMonth - 11, 1);

    // Grouping container
    const groupings: Record<string, {
      name: string;
      sum3M: number;
      sum6M: number;
      sum12M: number;
      totalSales: number;
      totalUnits: number;
    }> = {};

    records.forEach(r => {
      const groupKey = activeTab === 'PORTAL' ? r.portal : r.product;
      
      if (!groupings[groupKey]) {
        groupings[groupKey] = {
          name: groupKey,
          sum3M: 0,
          sum6M: 0,
          sum12M: 0,
          totalSales: 0,
          totalUnits: 0
        };
      }

      const recDate = r.date;
      groupings[groupKey].totalSales += r.amount;
      groupings[groupKey].totalUnits += r.units;

      // Add to corresponding buckets based on active metricMode
      const valueToAdd = metricMode === 'UNITS' ? r.units : r.amount;

      if (recDate >= boundary3M) {
        groupings[groupKey].sum3M += valueToAdd;
      }
      if (recDate >= boundary6M) {
        groupings[groupKey].sum6M += valueToAdd;
      }
      if (recDate >= boundary12M) {
        groupings[groupKey].sum12M += valueToAdd;
      }
    });

    // Translate to RollingAverageRow list with calculations
    return Object.values(groupings).map(g => ({
      name: g.name,
      type: activeTab,
      avg3Month: Math.round(g.sum3M / 3 * 10) / 10,
      avg6Month: Math.round(g.sum6M / 6 * 10) / 10,
      avg12Month: Math.round(g.sum12M / 12 * 10) / 10,
      totalSales: g.totalSales,
      totalUnits: g.totalUnits
    }));

  }, [records, activeTab, metricMode]);

  // Filtering & Sorting
  const processedData = useMemo(() => {
    let filtered = rollingAverages.filter(row =>
      row.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        // Numbers
        return sortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

    return filtered;
  }, [rollingAverages, searchQuery, sortField, sortDirection]);

  // Handle Header Sort Click
  const requestSort = (field: keyof RollingAverageRow) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatNumber = (val: number) => {
    if (metricMode === 'UNITS') {
      return `${val.toLocaleString('en-IN')} units`;
    }
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleExport = (format: 'CSV' | 'PDF') => {
    import('../utils/exporter').then(exp => {
      const filename = activeTab === 'PORTAL' ? 'portal_rolling_run_rates' : 'product_rolling_run_rates';
      if (format === 'CSV') {
        exp.exportRunRateToCSV(processedData, activeTab, `${filename}.csv`);
      } else {
        exp.exportRunRateToPDF(processedData, activeTab, `${filename}.pdf`);
      }
    });
  };

  return (
    <div id="analytics-table-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 md:p-6 space-y-5 shadow-sm">
      {/* Table Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wide">
            <BarChart3 size={18} className="text-blue-600" />
            Rolling Run Rates (Unit-Based 3M, 6M, 12M Averages)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Standardized monthly sales performance over rolling month blocks</p>
        </div>

        {/* Filters and Metric Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          {/* Group Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              id="btn-tab-portal"
              onClick={() => { setActiveTab('PORTAL'); setSearchQuery(''); }}
              className={`px-3.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'PORTAL'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-600 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Marketplace Portal
            </button>
            <button
              id="btn-tab-product"
              onClick={() => { setActiveTab('PRODUCT'); setSearchQuery(''); }}
              className={`px-3.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'PRODUCT'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-600 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Column C (Simpiled)
            </button>
          </div>

          {/* Table Export Options */}
          <div className="flex bg-white dark:bg-slate-850 rounded-lg border border-blue-200 dark:border-blue-900 overflow-hidden shadow-2xs">
            <span className="px-2.5 py-1.5 text-[10px] bg-blue-50 dark:bg-blue-950/40 font-bold border-r border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 uppercase font-mono flex items-center gap-1">
              <ArrowDownToLine size={12} />
              Export
            </span>
            <button
              onClick={() => handleExport('CSV')}
              className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 border-r border-slate-150 dark:border-slate-700 transition-colors cursor-pointer"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport('PDF')}
              className="px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Info panel explaining how averages are calculated */}
      <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 rounded-lg flex gap-2.5 items-start text-xs text-slate-600 dark:text-slate-400">
        <Info size={14} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200">Calculation logic:</span> The latest month in the dataset determines the anchor. Last 3M, 6M, and 12M averages represents total <strong>units sold</strong> inside those rolling month blocks divided by 3, 6, and 12 months respectively, giving the standardized monthly run rate.
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Search size={14} />
        </span>
        <input
          id="input-table-search"
          type="text"
          placeholder={`Search ${activeTab === 'PORTAL' ? 'portals (e.g. Amazon)' : 'products (e.g. Earbuds)'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-800 dark:hover:text-slate-250 transition-colors"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center gap-1.5">
                  {activeTab === 'PORTAL' ? 'Marketplace Portal' : 'Column C (Simpiled)'}
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-250 transition-colors"
                onClick={() => requestSort('avg3Month')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  3-Month Avg (Qty)
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-250 transition-colors"
                onClick={() => requestSort('avg6Month')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  6-Month Avg (Qty)
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-250 transition-colors"
                onClick={() => requestSort('avg12Month')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  12-Month Avg (Qty)
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
              <th 
                className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-250 transition-colors"
                onClick={() => requestSort('totalUnits')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  Total Units Sold
                  <ArrowUpDown size={12} className="text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {processedData.length > 0 ? (
              processedData.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-xs font-semibold text-slate-800 dark:text-slate-200 font-sans">
                    {row.name}
                  </td>
                  <td className="p-3 text-xs font-bold text-right font-mono text-blue-600 dark:text-blue-400">
                    {formatNumber(row.avg3Month)}
                  </td>
                  <td className="p-3 text-xs font-bold text-right font-mono text-emerald-700 dark:text-emerald-400">
                    {formatNumber(row.avg6Month)}
                  </td>
                  <td className="p-3 text-xs font-bold text-right font-mono text-amber-700 dark:text-amber-400">
                    {formatNumber(row.avg12Month)}
                  </td>
                  <td className="p-3 text-xs text-slate-500 dark:text-slate-400 text-right font-mono">
                    {row.totalUnits.toLocaleString('en-IN')} units
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                  No matching entries found for "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
