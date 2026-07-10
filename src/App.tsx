import React, { useState, useEffect, useCallback } from 'react';
import { SalesRecord, UserRole, AlertThreshold, SystemAlert, GoogleSheetConfig } from './types';
import { generateDemoData, initialThresholds } from './utils/demoData';
import { parseCSVText } from './utils/csvParser';
import CSVImport from './components/CSVImport';
import SalesCharts from './components/SalesCharts';
import AnalyticsTable from './components/AnalyticsTable';
import InventoryPlanner from './components/InventoryPlanner';
import AlertManager from './components/AlertManager';
import EmailExporter from './components/EmailExporter';
import SalesReportTable from './components/SalesReportTable';
import { BarChart3, Bell, TrendingUp, Mail, AlertTriangle, CloudRain, RotateCw, RefreshCw, Layers, Package, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(initialThresholds);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'REPORT' | 'RUN_RATE' | 'STOCK_PLANNER'>('REPORT');
  
  // Advanced Multi-Select Filters States
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColours, setSelectedColours] = useState<string[]>([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>({
    url: '',
    isEnabled: false,
    refreshInterval: 10,
    lastFetched: null,
    status: 'IDLE',
    errorMessage: null
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  // Load initial beautiful mock dataset
  useEffect(() => {
    const initialRecords = generateDemoData();
    setRecords(initialRecords);
    showToast('🚀 System initialized with 15-month historical retail sales demo data.');
  }, [showToast]);

  // Derive unique filter values
  const filterOptions = React.useMemo(() => {
    const portals = new Set<string>();
    const qualities = new Set<string>();
    const sizes = new Set<string>();
    const colours = new Set<string>();

    records.forEach(r => {
      if (r.portal) portals.add(r.portal);
      if (r.quality) qualities.add(r.quality);
      if (r.size) sizes.add(r.size);
      if (r.colour) colours.add(r.colour);
    });

    return {
      portals: Array.from(portals).filter(Boolean).sort(),
      qualities: Array.from(qualities).filter(Boolean).sort(),
      sizes: Array.from(sizes).filter(Boolean).sort(),
      colours: Array.from(colours).filter(Boolean).sort()
    };
  }, [records]);

  // Apply filters to records
  const filteredRecords = React.useMemo(() => {
    return records.filter(r => {
      const matchesPortal = selectedPortals.length === 0 || selectedPortals.includes(r.portal);
      const matchesQuality = selectedQualities.length === 0 || (r.quality && selectedQualities.includes(r.quality));
      const matchesSize = selectedSizes.length === 0 || (r.size && selectedSizes.includes(r.size));
      const matchesColour = selectedColours.length === 0 || (r.colour && selectedColours.includes(r.colour));
      return matchesPortal && matchesQuality && matchesSize && matchesColour;
    });
  }, [records, selectedPortals, selectedQualities, selectedSizes, selectedColours]);

  const clearAllFilters = () => {
    setSelectedPortals([]);
    setSelectedQualities([]);
    setSelectedSizes([]);
    setSelectedColours([]);
    showToast('🧹 All dataset filters cleared.');
  };

  // Helper to calculate rolling averages for export
  const calculateRunRateRowsForExport = (segmentType: 'PORTAL' | 'PRODUCT') => {
    if (filteredRecords.length === 0) return [];
    
    const latestDate = new Date(Math.max(...filteredRecords.map(r => r.date.getTime())));
    const latestYear = latestDate.getFullYear();
    const latestMonth = latestDate.getMonth();
    
    const boundary3M = new Date(latestYear, latestMonth - 2, 1);
    const boundary6M = new Date(latestYear, latestMonth - 5, 1);
    const boundary12M = new Date(latestYear, latestMonth - 11, 1);

    const groupings: Record<string, {
      name: string;
      sum3M: number;
      sum6M: number;
      sum12M: number;
      totalUnits: number;
    }> = {};

    filteredRecords.forEach(r => {
      const groupKey = segmentType === 'PORTAL' ? r.portal : r.product;
      
      if (!groupings[groupKey]) {
        groupings[groupKey] = {
          name: groupKey,
          sum3M: 0,
          sum6M: 0,
          sum12M: 0,
          totalUnits: 0
        };
      }

      groupings[groupKey].totalUnits += r.units;

      if (r.date >= boundary3M) {
        groupings[groupKey].sum3M += r.units;
      }
      if (r.date >= boundary6M) {
        groupings[groupKey].sum6M += r.units;
      }
      if (r.date >= boundary12M) {
        groupings[groupKey].sum12M += r.units;
      }
    });

    return Object.values(groupings).map(g => ({
      name: g.name,
      type: segmentType,
      avg3Month: Math.round(g.sum3M / 3 * 10) / 10,
      avg6Month: Math.round(g.sum6M / 6 * 10) / 10,
      avg12Month: Math.round(g.sum12M / 12 * 10) / 10,
      totalUnits: g.totalUnits
    }));
  };

  // Helper to calculate stock planning rows for export
  const calculateStockPlannerRowsForExport = () => {
    if (filteredRecords.length === 0) return [];
    
    const latestDate = new Date(Math.max(...filteredRecords.map(r => r.date.getTime())));
    const latestYear = latestDate.getFullYear();
    const latestMonth = latestDate.getMonth();
    const boundary3M = new Date(latestYear, latestMonth - 2, 1);

    const inventory = (() => {
      const saved = localStorage.getItem('ecommerce_current_inventory');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
      return {
        'Wireless Pro Earbuds': 180,
        'Fitband Pulse Smartwatch': 65,
        'Premium Leather Wallet': 210,
        'Ergonomic Office Chair': 24,
        'Stainless Steel HydraBottle': 110
      };
    })();

    const uniqueProductNames: string[] = Array.from(new Set(filteredRecords.map(r => r.product)));
    const grouped: Record<string, { productName: string; unitsLast3M: number }> = {};

    uniqueProductNames.forEach((name: string) => {
      grouped[name] = { productName: name, unitsLast3M: 0 };
    });

    filteredRecords.forEach(r => {
      if (r.date >= boundary3M) {
        if (grouped[r.product]) {
          grouped[r.product].unitsLast3M += r.units;
        }
      }
    });

    return uniqueProductNames.map((name: string) => {
      const g = grouped[name];
      const runRate = Math.round((g.unitsLast3M / 3) * 10) / 10;
      const projectedDemand = Math.round(runRate * 6);
      const currentStock = inventory[name] !== undefined ? inventory[name] : 0;
      const netRequirement = Math.max(0, projectedDemand - currentStock);
      
      let status = 'SUFFICIENT';
      if (currentStock === 0) {
        status = 'CRITICAL';
      } else if (currentStock < runRate * 1.5) {
        status = 'UNDERSTOCK';
      } else if (currentStock < projectedDemand) {
        status = 'REORDER';
      }

      return {
        productName: name,
        runRate,
        projectedDemand,
        currentStock,
        netRequirement,
        status
      };
    });
  };

  const handleExportRecords = (format: 'CSV' | 'PDF') => {
    if (filteredRecords.length === 0) {
      showToast('⚠️ No records to export.');
      return;
    }
    
    import('./utils/exporter').then(exp => {
      if (format === 'CSV') {
        exp.exportRecordsToCSV(filteredRecords, 'filtered_sales_transactions.csv');
        showToast('📥 Downloaded filtered sales transactions CSV.');
      } else {
        exp.exportRecordsToPDF(filteredRecords, 'filtered_sales_transactions.pdf');
        showToast('📥 Downloaded filtered sales transactions PDF.');
      }
    });
  };

  const handleExportAverages = (format: 'CSV' | 'PDF') => {
    if (filteredRecords.length === 0) {
      showToast('⚠️ No records to process.');
      return;
    }
    
    const runRates = calculateRunRateRowsForExport('PRODUCT');
    
    import('./utils/exporter').then(exp => {
      if (format === 'CSV') {
        exp.exportRunRateToCSV(runRates, 'PRODUCT', 'product_rolling_run_rates.csv');
        showToast('📥 Downloaded product rolling run rates CSV.');
      } else {
        exp.exportRunRateToPDF(runRates, 'PRODUCT', 'product_rolling_run_rates.pdf');
        showToast('📥 Downloaded product rolling run rates PDF.');
      }
    });
  };

  const handleExportPlanner = (format: 'CSV' | 'PDF') => {
    if (filteredRecords.length === 0) {
      showToast('⚠️ No records to process.');
      return;
    }
    
    const stockRows = calculateStockPlannerRowsForExport();
    
    import('./utils/exporter').then(exp => {
      if (format === 'CSV') {
        exp.exportStockPlannerToCSV(stockRows, 'stock_planner_requirements.csv');
        showToast('📥 Downloaded stock planner requirements CSV.');
      } else {
        exp.exportStockPlannerToPDF(stockRows, 'stock_planner_requirements.pdf');
        showToast('📥 Downloaded stock planner requirements PDF.');
      }
    });
  };

  // Automated threshold breach scanner
  const scanThresholdsForBreaches = useCallback((currentRecords: SalesRecord[], currentThresholds: AlertThreshold[]) => {
    if (currentRecords.length === 0) return;

    // Find the latest month inside the active dataset
    const latestDate = new Date(Math.max(...currentRecords.map(r => r.date.getTime())));
    const targetYear = latestDate.getFullYear();
    const targetMonth = latestDate.getMonth();
    const monthLabel = latestDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Filter current month sales
    const currentMonthRecords = currentRecords.filter(r => 
      r.date.getFullYear() === targetYear && r.date.getMonth() === targetMonth
    );

    const activeThresholds = currentThresholds.filter(t => t.isActive);
    const newAlerts: SystemAlert[] = [];

    activeThresholds.forEach(t => {
      let segmentRecords = currentMonthRecords;
      if (t.targetType === 'PORTAL') {
        segmentRecords = currentMonthRecords.filter(r => r.portal.toLowerCase() === t.targetName.toLowerCase());
      } else if (t.targetType === 'PRODUCT') {
        segmentRecords = currentMonthRecords.filter(r => r.product.toLowerCase() === t.targetName.toLowerCase());
      }

      // Aggregate
      const totalRevenue = segmentRecords.reduce((sum, r) => sum + r.amount, 0);
      const totalUnits = segmentRecords.reduce((sum, r) => sum + r.units, 0);

      const metricValue = t.metric === 'REVENUE' ? totalRevenue : totalUnits;
      let isBreached = false;

      if (t.condition === 'LESS_THAN') {
        isBreached = metricValue < t.value;
      } else {
        isBreached = metricValue > t.value;
      }

      if (isBreached) {
        const formattedActual = t.metric === 'REVENUE' 
          ? `₹${metricValue.toLocaleString('en-IN')}` 
          : `${metricValue} units`;
        
        const formattedTarget = t.metric === 'REVENUE'
          ? `₹${t.value.toLocaleString('en-IN')}`
          : `${t.value} units`;

        const conditionText = t.condition === 'LESS_THAN' ? 'below target' : 'above safety limit';

        newAlerts.push({
          id: `alert_${t.id}_${Date.now()}`,
          thresholdId: t.id,
          title: `⚠️ Threshold Breach: ${t.targetName}`,
          message: `${t.targetName} monthly performance for ${monthLabel} is ${formattedActual}, which is ${conditionText} of ${formattedTarget}.`,
          severity: t.condition === 'LESS_THAN' ? 'CRITICAL' : 'WARNING',
          timestamp: new Date(),
          isRead: false,
          metricValue,
          thresholdValue: t.value,
          period: monthLabel
        });
      }
    });

    setSystemAlerts(newAlerts);
    if (newAlerts.length > 0) {
      showToast(`⚠️ ${newAlerts.length} threshold breach alerts triggered. Dispatching reports to ajay741900@gmail.com...`);
    }
  }, [showToast]);

  // Re-run scanning whenever data or thresholds change
  useEffect(() => {
    scanThresholdsForBreaches(records, thresholds);
  }, [records, thresholds, scanThresholdsForBreaches]);

  // Handle local CSV upload or Google Sheet parsed data
  const handleDataLoaded = useCallback((newRecords: SalesRecord[], source: 'LOCAL_UPLOAD' | 'GOOGLE_SHEET', sheetUrl?: string) => {
    setRecords(newRecords);
    
    if (source === 'LOCAL_UPLOAD') {
      showToast(`📁 Successfully imported ${newRecords.length} sales entries from uploaded CSV file.`);
    } else if (source === 'GOOGLE_SHEET') {
      showToast(`🔄 Real-time update success: synced ${newRecords.length} records from Google Sheet.`);
      setSheetConfig(prev => ({
        ...prev,
        url: sheetUrl || prev.url,
        status: 'SUCCESS',
        lastFetched: new Date().toISOString(),
        errorMessage: null
      }));
    }
  }, [showToast]);

  // Helper to convert standard Google Sheet URL to direct CSV export format
  const convertToCSVUrl = (inputUrl: string): string => {
    let cleanUrl = inputUrl.trim();
    
    try {
      const urlObj = new URL(cleanUrl);
      
      // Check if it's a google spreadsheet URL
      if (urlObj.hostname.includes('docs.google.com') && urlObj.pathname.includes('/spreadsheets/')) {
        
        // 1. Published to web URL pattern: /spreadsheets/d/e/...
        if (urlObj.pathname.includes('/spreadsheets/d/e/')) {
          // If pathname has /pubhtml, change to /pub
          if (urlObj.pathname.includes('/pubhtml')) {
            urlObj.pathname = urlObj.pathname.replace('/pubhtml', '/pub');
          }
          
          // Ensure output=csv is set
          urlObj.searchParams.set('output', 'csv');
          return urlObj.toString();
        }
        
        // 2. Standard edit URL pattern: /spreadsheets/d/<ID>/edit
        const match = urlObj.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1] && match[1] !== 'e') {
          const sheetId = match[1];
          const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/export`);
          
          // Copy existing search parameters
          urlObj.searchParams.forEach((val, key) => {
            exportUrl.searchParams.set(key, val);
          });
          
          // Extract gid from hash if present (e.g. #gid=12345)
          if (urlObj.hash) {
            const hashMatch = urlObj.hash.match(/gid=([0-9]+)/);
            if (hashMatch && hashMatch[1]) {
              exportUrl.searchParams.set('gid', hashMatch[1]);
            }
          }
          
          exportUrl.searchParams.set('format', 'csv');
          return exportUrl.toString();
        }
      }
    } catch (e) {
      // In case URL parsing fails, fall back to basic regex/string checks
    }
    
    // --- FALLBACK REGEX METHOD ---
    if (cleanUrl.includes('output=csv') || cleanUrl.includes('format=csv')) {
      return cleanUrl;
    }
    
    if (cleanUrl.includes('/spreadsheets/d/e/')) {
      if (cleanUrl.includes('/pubhtml')) {
        const withPub = cleanUrl.replace('/pubhtml', '/pub');
        return withPub.includes('?') ? `${withPub}&output=csv` : `${withPub}?output=csv`;
      }
      return cleanUrl.includes('?') ? `${cleanUrl}&output=csv` : `${cleanUrl}?output=csv`;
    }
    
    const match = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1] && match[1] !== 'e') {
      const sheetId = match[1];
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    }
    
    return cleanUrl;
  };

  // Fetch from Google Sheet CSV Web URL
  const fetchGoogleSheetData = useCallback(async (url: string) => {
    if (!url) return;
    
    const formattedUrl = convertToCSVUrl(url);

    setSheetConfig(prev => ({
      ...prev,
      status: 'FETCHING',
      errorMessage: null
    }));

    try {
      // Direct CORS-friendly fetch from Google Spreadsheet servers
      const response = await fetch(formattedUrl);
      if (!response.ok) {
        throw new Error(`HTTP network error ${response.status} - Sheet could be private or link is broken.`);
      }

      const text = await response.text();
      const { records: parsedRecords, warning } = parseCSVText(text);

      if (parsedRecords.length > 0) {
        handleDataLoaded(parsedRecords, 'GOOGLE_SHEET', url);
      } else {
        throw new Error(warning || 'Parsed Google Sheet returned 0 valid records. Check format.');
      }
    } catch (err: any) {
      console.error('Google Sheet Sync Error:', err);
      setSheetConfig(prev => ({
        ...prev,
        status: 'ERROR',
        errorMessage: err.message || 'Network fetch failed. Verify the sheet is published as Comma-Separated Values (CSV) to the Web and has public view sharing permissions.'
      }));
      showToast('❌ Google Sheet synchronization failed. Click help guide for details.');
    }
  }, [handleDataLoaded, showToast]);

  // Threshold Actions
  const handleAddThreshold = useCallback((newT: Omit<AlertThreshold, 'id' | 'createdAt'>) => {
    const threshold: AlertThreshold = {
      ...newT,
      id: `t-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setThresholds(prev => [...prev, threshold]);
  }, []);

  const handleToggleThreshold = useCallback((id: string) => {
    setThresholds(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
    showToast('⚙️ Threshold alert configuration updated.');
  }, [showToast]);

  const handleDeleteThreshold = useCallback((id: string) => {
    setThresholds(prev => prev.filter(t => t.id !== id));
    showToast('🗑️ Threshold rule deleted.');
  }, [showToast]);

  const handleClearAlerts = useCallback(() => {
    setSystemAlerts([]);
    showToast('🧹 Live breach notifications cleared.');
  }, [showToast]);

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-20 selection:bg-blue-500/20 selection:text-slate-900">
      
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-1/4 h-80 w-80 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* FLOATING TOAST BAR */}
      {toastMessage && (
        <div id="toast-notification" className="fixed bottom-6 right-6 z-50 bg-white border border-blue-200 text-xs font-bold text-blue-700 py-3.5 px-4 rounded-lg shadow-lg flex items-center gap-2.5 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          <p>{toastMessage}</p>
        </div>
      )}

      {/* DASHBOARD NAVBAR */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-md bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white shadow-md shadow-blue-600/10">
              <BarChart3 size={18} />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-800 font-sans">E-Commerce Sales Insights</h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">Live Sync & Multi-Marketplace Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sheetConfig.isEnabled && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Google Sync Active
              </span>
            )}
            
            <div className="text-right hidden md:block">
              <span className="text-[9px] text-slate-400 block font-mono font-bold uppercase tracking-wider">Telemetry Owner</span>
              <span className="text-xs font-bold text-slate-700 font-mono">ajay741900@gmail.com</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8 relative z-10">
        
        {/* WELCOME BANNER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 font-mono">Financial Workspace</span>
            <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">Sales Report Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl font-medium leading-relaxed">
              Portal-wise (Amazon, Flipkart) and Product-wise performance logs with rolling averages, automatic real-time Google Sheets fetching, and threshold breach dispatches.
            </p>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-mono shrink-0 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
            <Layers size={14} className="text-blue-600" />
            <span className="font-bold">Time Anchor: 10 July 2026</span>
          </div>
        </div>

        {/* TABS NAVIGATION BAR */}
        <div id="navigation-tabs-bar" className="flex flex-wrap border border-slate-200 bg-white p-1 rounded-xl shadow-xs gap-1 relative z-15">
          <button
            id="tab-report"
            onClick={() => setActiveTab('REPORT')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'REPORT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet size={15} />
            <span>Detailed Sales Report</span>
          </button>

          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'DASHBOARD'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <TrendingUp size={15} />
            <span>Sales Dashboard & Trends</span>
          </button>
          
          <button
            id="tab-run-rate"
            onClick={() => setActiveTab('RUN_RATE')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'RUN_RATE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <BarChart3 size={15} />
            <span>Rolling Run Rates</span>
          </button>

          <button
            id="tab-stock-planner"
            onClick={() => setActiveTab('STOCK_PLANNER')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'STOCK_PLANNER'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Package size={15} />
            <span>6-Month Stock Planner</span>
          </button>
        </div>

        {/* CONTROL CENTER */}
        {records.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Control Header */}
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Filters & Report Export Center</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Refine dataset across all metrics and export custom CSV or PDF files</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  id="btn-toggle-filters-expanded"
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isFiltersExpanded ? 'Hide Filter Controls' : 'Show Filter Controls'}
                </button>
                
                {(selectedPortals.length > 0 || selectedQualities.length > 0 || selectedSizes.length > 0 || selectedColours.length > 0) && (
                  <button
                    id="btn-clear-filters-global"
                    onClick={clearAllFilters}
                    className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    Clear Active Filters
                  </button>
                )}
              </div>
            </div>

            {/* Filter Content */}
            {isFiltersExpanded && (
              <div className="p-6 border-b border-slate-200/80 bg-slate-50/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Portal selection */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block font-mono">Marketplace Portal</span>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {filterOptions.portals.map(p => {
                      const isSelected = selectedPortals.includes(p);
                      return (
                        <label key={p} className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedPortals(prev =>
                                isSelected ? prev.filter(x => x !== p) : [...prev, p]
                              );
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 h-4 w-4"
                          />
                          <span className={isSelected ? 'font-bold text-slate-800' : ''}>{p}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Product Quality selection */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block font-mono">Product Quality</span>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {filterOptions.qualities.length > 0 ? (
                      filterOptions.qualities.map(q => {
                        const isSelected = selectedQualities.includes(q);
                        return (
                          <label key={q} className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedQualities(prev =>
                                  isSelected ? prev.filter(x => x !== q) : [...prev, q]
                                );
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 h-4 w-4"
                            />
                            <span className={isSelected ? 'font-bold text-slate-800' : ''}>{q}</span>
                          </label>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400 italic">No quality column loaded</span>
                    )}
                  </div>
                </div>

                {/* 3. Size selection */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block font-mono">Product Size</span>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {filterOptions.sizes.length > 0 ? (
                      filterOptions.sizes.map(s => {
                        const isSelected = selectedSizes.includes(s);
                        return (
                          <label key={s} className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedSizes(prev =>
                                  isSelected ? prev.filter(x => x !== s) : [...prev, s]
                                );
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 h-4 w-4"
                            />
                            <span className={isSelected ? 'font-bold text-slate-800' : ''}>{s}</span>
                          </label>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400 italic">No size column loaded</span>
                    )}
                  </div>
                </div>

                {/* 4. Colour selection */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block font-mono">Product Colour</span>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {filterOptions.colours.length > 0 ? (
                      filterOptions.colours.map(c => {
                        const isSelected = selectedColours.includes(c);
                        return (
                          <label key={c} className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedColours(prev =>
                                  isSelected ? prev.filter(x => x !== c) : [...prev, c]
                                );
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 h-4 w-4"
                            />
                            <span className={isSelected ? 'font-bold text-slate-800' : ''}>{c}</span>
                          </label>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400 italic">No colour column loaded</span>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Global Export Center Section */}
            <div className="bg-slate-50/50 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-5 border-t border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-bold text-slate-700">Active Filtered Records: <strong className="font-mono text-blue-600">{filteredRecords.length}</strong> / {records.length} total rows</span>
                </div>
                <p className="text-[11px] text-slate-500">Export filtered tables and planning metrics to your device instantly.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Transactions Export */}
                <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <span className="px-2.5 py-1.5 text-[10px] bg-slate-100 font-bold border-r border-slate-200 text-slate-500 uppercase font-mono flex items-center">Logs</span>
                  <button
                    onClick={() => handleExportRecords('CSV')}
                    className="px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 border-r border-slate-150 transition-colors cursor-pointer"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleExportRecords('PDF')}
                    className="px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    PDF
                  </button>
                </div>

                {/* 2. Run Rate Export */}
                <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <span className="px-2.5 py-1.5 text-[10px] bg-slate-100 font-bold border-r border-slate-200 text-slate-500 uppercase font-mono flex items-center">Averages</span>
                  <button
                    onClick={() => handleExportAverages('CSV')}
                    className="px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 border-r border-slate-150 transition-colors cursor-pointer"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleExportAverages('PDF')}
                    className="px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    PDF
                  </button>
                </div>

                {/* 3. Stock Planner Export */}
                <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <span className="px-2.5 py-1.5 text-[10px] bg-slate-100 font-bold border-r border-slate-200 text-slate-500 uppercase font-mono flex items-center">Planner</span>
                  <button
                    onClick={() => handleExportPlanner('CSV')}
                    className="px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 border-r border-slate-150 transition-colors cursor-pointer"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleExportPlanner('PDF')}
                    className="px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENTS */}
        
        {/* 0. DETAILED SALES REPORT */}
        {activeTab === 'REPORT' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* DATA CONNECTION CHANNELS (CSV & GOOGLE SHEET) */}
            <CSVImport
              currentRole={currentRole}
              onDataLoaded={handleDataLoaded}
              sheetConfig={sheetConfig}
              onSheetConfigChange={setSheetConfig}
              onFetchGoogleSheet={fetchGoogleSheetData}
              totalLoaded={records.length}
            />

            {filteredRecords.length > 0 ? (
              <SalesReportTable records={filteredRecords} />
            ) : (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-400 font-medium font-sans">
                No data matched selected filters. Adjust your filters or load data.
              </div>
            )}
          </div>
        )}

        {/* 1. SALES DASHBOARD & TRENDS */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* DATA CONNECTION CHANNELS (CSV & GOOGLE SHEET) */}
            <CSVImport
              currentRole={currentRole}
              onDataLoaded={handleDataLoaded}
              sheetConfig={sheetConfig}
              onSheetConfigChange={setSheetConfig}
              onFetchGoogleSheet={fetchGoogleSheetData}
              totalLoaded={records.length}
            />

            {/* RECHARTS DATA VISUALIZATION PANEL */}
            {filteredRecords.length > 0 ? (
              <SalesCharts records={filteredRecords} />
            ) : (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-400 font-medium font-sans">
                Please refine dataset filters or load sales data to view trend charts.
              </div>
            )}

            {/* SYSTEM THRESHOLDS GUARD & ALERT FEED */}
            <AlertManager
              currentRole={currentRole}
              records={filteredRecords}
              thresholds={thresholds}
              onAddThreshold={handleAddThreshold}
              onToggleThreshold={handleToggleThreshold}
              onDeleteThreshold={handleDeleteThreshold}
              systemAlerts={systemAlerts}
              onClearAlerts={handleClearAlerts}
            />

            {/* SECURE TELEMETRY EMAIL EXPORTER */}
            {filteredRecords.length > 0 && (
              <EmailExporter 
                currentRole={currentRole}
                records={filteredRecords}
              />
            )}
          </div>
        )}

        {/* 2. ROLLING RUN RATES */}
        {activeTab === 'RUN_RATE' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 font-mono">Statistical Run Rates</span>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2 mt-1 uppercase tracking-wide">
                <BarChart3 size={18} className="text-blue-600" />
                Rolling Run Rate Performance
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                This section presents a detailed breakdown of average sales for products and sales channels over periods of 3 months (3M), 6 months (6M), and 12 months (12M) to help you understand trends and demand patterns.
              </p>
            </div>
            
            {filteredRecords.length > 0 ? (
              <AnalyticsTable records={filteredRecords} />
            ) : (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-400 font-medium font-sans">
                No data matched selected filters. Adjust your filters or load data in the Sales Dashboard.
              </div>
            )}
          </div>
        )}

        {/* 3. 6-MONTH STOCK PLANNER */}
        {activeTab === 'STOCK_PLANNER' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {filteredRecords.length > 0 ? (
              <InventoryPlanner records={filteredRecords} />
            ) : (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-400 font-medium font-sans">
                No data matched selected filters. Adjust your filters or load data in the Sales Dashboard.
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
