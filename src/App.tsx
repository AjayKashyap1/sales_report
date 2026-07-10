import React, { useState, useEffect, useCallback } from 'react';
import { SalesRecord, UserRole, AlertThreshold, SystemAlert, GoogleSheetConfig } from './types';
import { generateDemoData, initialThresholds } from './utils/demoData';
import { parseCSVText } from './utils/csvParser';
import RoleSelector from './components/RoleSelector';
import CSVImport from './components/CSVImport';
import SalesCharts from './components/SalesCharts';
import AnalyticsTable from './components/AnalyticsTable';
import InventoryPlanner from './components/InventoryPlanner';
import AlertManager from './components/AlertManager';
import EmailExporter from './components/EmailExporter';
import { BarChart3, Bell, TrendingUp, Mail, AlertTriangle, CloudRain, RotateCw, RefreshCw, Layers, Package } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(initialThresholds);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'RUN_RATE' | 'STOCK_PLANNER'>('DASHBOARD');
  
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

        {/* SECURITY ROLE DELEGATOR */}
        <RoleSelector
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          userEmail="ajay741900@gmail.com"
        />

        {/* TABS NAVIGATION BAR */}
        <div id="navigation-tabs-bar" className="flex flex-wrap border border-slate-200 bg-white p-1 rounded-xl shadow-xs gap-1 relative z-15">
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
            <span>Sales Dashboard & Trends (बिक्री डैशबोर्ड)</span>
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
            <span>Rolling Run Rates (रोलिंग रन रेट)</span>
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
            <span>6-Month Stock Planner (स्टॉक नियोजक)</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        
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
            {records.length > 0 ? (
              <SalesCharts records={records} />
            ) : (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-400 font-medium font-sans">
                कृपया विश्लेषण के लिए पहले बिक्री डेटा लोड करें। (Please load sales data to view trend charts.)
              </div>
            )}

            {/* SYSTEM THRESHOLDS GUARD & ALERT FEED */}
            <AlertManager
              currentRole={currentRole}
              records={records}
              thresholds={thresholds}
              onAddThreshold={handleAddThreshold}
              onToggleThreshold={handleToggleThreshold}
              onDeleteThreshold={handleDeleteThreshold}
              systemAlerts={systemAlerts}
              onClearAlerts={handleClearAlerts}
            />

            {/* SECURE TELEMETRY EMAIL EXPORTER */}
            {records.length > 0 && (
              <EmailExporter 
                currentRole={currentRole}
                records={records}
              />
            )}
          </div>
        )}

        {/* 2. ROLLING RUN RATES */}
        {activeTab === 'RUN_RATE' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 font-mono">Statistical Run Rates (सांख्यिकीय विश्लेषण)</span>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2 mt-1 uppercase tracking-wide">
                <BarChart3 size={18} className="text-blue-600" />
                Rolling Run Rate Performance (रोलिंग रन रेट प्रदर्शन)
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                यह अनुभाग उत्पादों और बिक्री चैनलों की <strong>3-महीने (3M), 6-महीने (6M), और 12-महीने (12M)</strong> की अवधि में औसत बिक्री का विस्तृत विवरण प्रस्तुत करता है।
                इससे आप रुझान (trends) और मांग के पैटर्न को समझ सकते हैं।
              </p>
            </div>
            
            {records.length > 0 ? (
              <AnalyticsTable records={records} />
            ) : (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-400 font-medium font-sans">
                कृपया पहले बिक्री डैशबोर्ड टैब में डेटा लोड करें। (Please load sales data in the Sales Dashboard tab first.)
              </div>
            )}
          </div>
        )}

        {/* 3. 6-MONTH STOCK PLANNER */}
        {activeTab === 'STOCK_PLANNER' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {records.length > 0 ? (
              <InventoryPlanner records={records} />
            ) : (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-400 font-medium font-sans">
                कृपया पहले बिक्री डैशबोर्ड टैब में डेटा लोड करें। (Please load sales data in the Sales Dashboard tab first.)
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
