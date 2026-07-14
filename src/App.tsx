import React, { useState, useEffect, useCallback } from 'react';
import { SalesRecord, UserRole, AlertThreshold, SystemAlert, GoogleSheetConfig } from './types';
import { generateDemoData, initialThresholds } from './utils/demoData';
import { parseCSVText } from './utils/csvParser';
import CSVImport from './components/CSVImport';
import AnalyticsTable from './components/AnalyticsTable';
import InventoryPlanner from './components/InventoryPlanner';
import SearchableDropdown from './components/SearchableDropdown';
import AISalesAnalyst from './components/AISalesAnalyst';
import RoleSelector from './components/RoleSelector';
import NotificationIntegrations from './components/NotificationIntegrations';
import { BarChart3, Bell, TrendingUp, Mail, AlertTriangle, CloudRain, RotateCw, RefreshCw, Layers, Package, FileSpreadsheet, MoreVertical, Menu, X, Sun, Moon, Calendar, Bot, Sparkles, ChevronDown, Settings } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [records, setRecords] = useState<SalesRecord[]>(() => generateDemoData());
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(initialThresholds);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'RUN_RATE' | 'STOCK_PLANNER' | 'INTEGRATIONS' | 'AI_ANALYST'>('RUN_RATE');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Theme Switching state - Locked to light mode by user request
  const theme = 'light';

  // Dynamic color presets for Accent Theme options
  const [accentTheme, setAccentTheme] = useState<'blue' | 'emerald' | 'purple' | 'rose' | 'amber' | 'cyan'>(() => {
    const saved = localStorage.getItem('accent_theme');
    if (saved === 'blue' || saved === 'emerald' || saved === 'purple' || saved === 'rose' || saved === 'amber' || saved === 'cyan') {
      return saved;
    }
    return 'blue';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const colors = {
      blue: {
        '50': '#eff6ff',
        '100': '#dbeafe',
        '500': '#3b82f6',
        '600': '#2563eb',
        '700': '#1d4ed8',
        '800': '#1e40af',
        '900': '#1e3a8a',
        '950': '#172554'
      },
      emerald: {
        '50': '#f0fdf4',
        '100': '#dcfce7',
        '500': '#10b981',
        '600': '#059669',
        '700': '#047857',
        '800': '#065f46',
        '900': '#064e3b',
        '950': '#022c22'
      },
      purple: {
        '50': '#faf5ff',
        '100': '#f3e8ff',
        '500': '#a855f7',
        '600': '#9333ea',
        '700': '#7e22ce',
        '800': '#6b21a8',
        '900': '#581c87',
        '950': '#3b0764'
      },
      rose: {
        '50': '#fff1f2',
        '100': '#ffe4e6',
        '500': '#f43f5e',
        '600': '#e11d48',
        '700': '#be123c',
        '800': '#9f1239',
        '900': '#881337',
        '950': '#4c0519'
      },
      amber: {
        '50': '#fdfbeb',
        '100': '#fef3c7',
        '500': '#f59e0b',
        '600': '#d97706',
        '700': '#b45309',
        '800': '#92400e',
        '900': '#78350f',
        '950': '#451a03'
      },
      cyan: {
        '50': '#ecfeff',
        '100': '#cffafe',
        '500': '#06b6d4',
        '600': '#0891b2',
        '700': '#0e7490',
        '800': '#155e75',
        '900': '#164e63',
        '950': '#083344'
      }
    };

    const selectedColors = colors[accentTheme];
    Object.entries(selectedColors).forEach(([shade, hex]) => {
      root.style.setProperty(`--accent-${shade}`, hex as string);
    });
    localStorage.setItem('accent_theme', accentTheme);
  }, [accentTheme]);

  // Advanced Multi-Select Filters States
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColours, setSelectedColours] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>({
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQaZ6A9O82NanD3WNLDnSOb2FIpNVPFnef3RN_DoeudGep31MAL6CQE5sUlbIDe-U7nxVBX0z2TVThw/pub?gid=1397264212&single=true&output=csv',
    isEnabled: true,
    refreshInterval: 60,
    lastFetched: null,
    status: 'IDLE',
    errorMessage: null
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  // Derive unique filter values
  const filterOptions = React.useMemo(() => {
    const portals = new Set<string>();
    const products = new Set<string>();
    const qualities = new Set<string>();
    const sizes = new Set<string>();
    const colours = new Set<string>();

    records.forEach(r => {
      if (r.portal) portals.add(r.portal);
      if (r.product) products.add(r.product);
      if (r.quality) qualities.add(r.quality);
      if (r.size) sizes.add(r.size);
      if (r.colour) colours.add(r.colour);
    });

    return {
      portals: Array.from(portals).filter(Boolean).sort(),
      products: Array.from(products).filter(Boolean).sort(),
      qualities: Array.from(qualities).filter(Boolean).sort(),
      sizes: Array.from(sizes).filter(Boolean).sort(),
      colours: Array.from(colours).filter(Boolean).sort()
    };
  }, [records]);

  // Cross-Filtered options for each dropdown to enable true Cross Filtering
  const crossFilterOptions = React.useMemo(() => {
    const getFilteredRecordsExcluding = (excludeKey?: 'portal' | 'product' | 'quality' | 'size' | 'colour') => {
      return records.filter(r => {
        const matchesPortal = excludeKey === 'portal' || selectedPortals.length === 0 || selectedPortals.includes(r.portal);
        const matchesProduct = excludeKey === 'product' || selectedProducts.length === 0 || selectedProducts.includes(r.product);
        const matchesQuality = excludeKey === 'quality' || selectedQualities.length === 0 || (r.quality && selectedQualities.includes(r.quality));
        const matchesSize = excludeKey === 'size' || selectedSizes.length === 0 || (r.size && selectedSizes.includes(r.size));
        const matchesColour = excludeKey === 'colour' || selectedColours.length === 0 || (r.colour && selectedColours.includes(r.colour));
        
        let matchesDate = true;
        if (startDate) {
          const sDate = new Date(startDate);
          sDate.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && r.date >= sDate;
        }
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && r.date <= eDate;
        }

        return matchesPortal && matchesProduct && matchesQuality && matchesSize && matchesColour && matchesDate;
      });
    };

    const portalRecords = getFilteredRecordsExcluding('portal');
    const productRecords = getFilteredRecordsExcluding('product');
    const qualityRecords = getFilteredRecordsExcluding('quality');
    const sizeRecords = getFilteredRecordsExcluding('size');
    const colourRecords = getFilteredRecordsExcluding('colour');

    const portals = new Set<string>();
    const products = new Set<string>();
    const qualities = new Set<string>();
    const sizes = new Set<string>();
    const colours = new Set<string>();

    portalRecords.forEach(r => r.portal && portals.add(r.portal));
    productRecords.forEach(r => r.product && products.add(r.product));
    qualityRecords.forEach(r => r.quality && qualities.add(r.quality));
    sizeRecords.forEach(r => r.size && sizes.add(r.size));
    colourRecords.forEach(r => r.colour && colours.add(r.colour));

    return {
      portals: Array.from(portals).filter(Boolean).sort(),
      products: Array.from(products).filter(Boolean).sort(),
      qualities: Array.from(qualities).filter(Boolean).sort(),
      sizes: Array.from(sizes).filter(Boolean).sort(),
      colours: Array.from(colours).filter(Boolean).sort()
    };
  }, [records, selectedPortals, selectedProducts, selectedQualities, selectedSizes, selectedColours, startDate, endDate]);

  // Apply filters to records
  const filteredRecords = React.useMemo(() => {
    return records.filter(r => {
      const matchesPortal = selectedPortals.length === 0 || selectedPortals.includes(r.portal);
      const matchesProduct = selectedProducts.length === 0 || selectedProducts.includes(r.product);
      const matchesQuality = selectedQualities.length === 0 || (r.quality && selectedQualities.includes(r.quality));
      const matchesSize = selectedSizes.length === 0 || (r.size && selectedSizes.includes(r.size));
      const matchesColour = selectedColours.length === 0 || (r.colour && selectedColours.includes(r.colour));
      
      let matchesDate = true;
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && r.date >= sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && r.date <= eDate;
      }

      return matchesPortal && matchesProduct && matchesQuality && matchesSize && matchesColour && matchesDate;
    });
  }, [records, selectedPortals, selectedProducts, selectedQualities, selectedSizes, selectedColours, startDate, endDate]);

  const clearAllFilters = () => {
    setSelectedPortals([]);
    setSelectedProducts([]);
    setSelectedQualities([]);
    setSelectedSizes([]);
    setSelectedColours([]);
    setStartDate(null);
    setEndDate(null);
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
      
      // Dynamic fallback from records' currentStock property if present
      const extracted: Record<string, number> = {};
      filteredRecords.forEach(r => {
        if (r.product && r.currentStock !== undefined && r.currentStock !== null) {
          if (extracted[r.product] === undefined) {
            extracted[r.product] = r.currentStock;
          }
        }
      });
      return extracted;
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
      showToast(`⚠️ ${newAlerts.length} threshold breach alerts triggered. Dispatching telemetry reports...`);
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

  // Load initial dataset (tries to sync default Google Sheet first, no demo fallback)
  useEffect(() => {
    const defaultSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQaZ6A9O82NanD3WNLDnSOb2FIpNVPFnef3RN_DoeudGep31MAL6CQE5sUlbIDe-U7nxVBX0z2TVThw/pub?gid=1397264212&single=true&output=csv';
    
    const initData = async () => {
      try {
        await fetchGoogleSheetData(defaultSheetUrl);
      } catch (err) {
        console.warn('Initial Google Sheet sync failed', err);
      }
    };
    
    initData();
  }, [fetchGoogleSheetData]);

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased pb-20 selection:bg-blue-500/20 selection:text-slate-900 transition-colors duration-200">
      
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-50 dark:from-blue-950/20 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-1/4 h-80 w-80 bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* FLOATING TOAST BAR */}
      {toastMessage && (
        <div id="toast-notification" className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 text-xs font-bold text-blue-700 dark:text-blue-300 py-3.5 px-4 rounded-lg shadow-lg flex items-center gap-2.5 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          <p>{toastMessage}</p>
        </div>
      )}

      {/* SIDEBAR PANEL (DRAWER) */}
      {isSidebarOpen && (
        <div id="sidebar-overlay" className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            id="sidebar-backdrop"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar Content Panel */}
          <div
            id="sidebar-panel-content"
            className="relative flex flex-col w-full max-w-xs bg-white dark:bg-slate-900 h-screen shadow-2xl border-r border-slate-200 dark:border-slate-800 z-10 p-6 overflow-y-auto animate-in slide-in-from-left duration-300"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-md bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white shadow-md shadow-blue-600/10">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Insights Panel</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-bold">System Analytics Console</p>
                </div>
              </div>
              
              <button
                id="btn-close-sidebar"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sidebar Navigation Pages */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono block mb-2.5 px-2">Workspace Pages</span>
              

              <button
                id="sidebar-tab-run-rate"
                onClick={() => {
                  setActiveTab('RUN_RATE');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'RUN_RATE'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <BarChart3 size={16} />
                <span>Rolling Run Rates</span>
              </button>

              <button
                id="sidebar-tab-stock-planner"
                onClick={() => {
                  setActiveTab('STOCK_PLANNER');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'STOCK_PLANNER'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Package size={16} />
                <span>Stock Requirement Planner</span>
              </button>

              <button
                id="sidebar-tab-ai-analyst"
                onClick={() => {
                  setActiveTab('AI_ANALYST');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'AI_ANALYST'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-750'
                }`}
              >
                <Bot size={16} className={activeTab === 'AI_ANALYST' ? 'text-white' : 'text-blue-500'} />
                <span className="flex items-center gap-1.5">
                  AI Sales Analyst
                  <span className="px-1 py-0.2 text-[8px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-black font-mono">BETA</span>
                </span>
              </button>

              <button
                id="sidebar-tab-integrations"
                onClick={() => {
                  setActiveTab('INTEGRATIONS');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'INTEGRATIONS'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Settings size={16} />
                <span>Integrations & Setup</span>
              </button>
            </div>

            {/* SYNC INFORMATION IN SIDE PANEL */}
            <div className="mt-auto border-t border-slate-150 pt-6 space-y-3.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono block px-2">Sync Status</span>
              
              <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${sheetConfig.isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-[11px] font-bold text-slate-700">Google Sheets Sync</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Automatic data refresh is configured. Access status updates in real-time.
                </p>
              </div>

              <div className="px-2 text-center text-[10px] text-slate-400 font-medium font-mono">
                Active Client Version 1.2
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD NAVBAR - AMAZON WAREHOUSE ANALYTICS BLACK/DARK SLATE THEME */}
      <header className="bg-[#131921] border-b border-[#232f3e] sticky top-0 z-40 shadow-md">
        <div className="max-w-full lg:px-12 px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* 3-DOTS SIDEBAR TOGGLE BUTTON */}
            <button
              id="btn-toggle-sidebar"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
              title="Open Workspace Menu"
            >
              <MoreVertical size={20} className="text-[#ff9900]" />
            </button>

            {/* Custom Logo & Title representing the screenshot perfectly */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-[#ff9900] flex items-center justify-center text-[#131921] shadow-lg">
                <Layers size={18} />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-white font-sans flex items-center gap-1.5 leading-tight">
                  Sales Dashboard
                </h1>
                <p className="text-[10px] text-[#ff9900] font-mono uppercase tracking-widest font-black block leading-none mt-0.5">
                  ANALYTICS DASHBOARD
                </p>
              </div>
            </div>
          </div>

          {/* Right hand buttons exactly styled like the screenshot options */}
          <div className="flex items-center gap-3">
            {/* Green and Red sheet indicators in a compact capsule */}
            <div className="hidden md:flex bg-slate-950 border border-slate-750 p-1 rounded-lg items-center gap-1 shrink-0">
              <div className="h-6 w-6 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center" title="CSV Data Connected">
                <FileSpreadsheet size={13} />
              </div>
              <div className="h-6 w-6 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center" title="Alert Dispatched Reports">
                <AlertTriangle size={13} />
              </div>
            </div>

            {/* Sync Sheet button */}
            <button
              id="btn-header-sync-sheet"
              onClick={async () => {
                await fetchGoogleSheetData(sheetConfig.url);
                showToast("🔄 Google Sheet synchronizing... Refreshing data channels.");
              }}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-black transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw size={13} className="text-[#ff9900]" />
              <span>Sync Sheet</span>
            </button>

            {/* Connect Sheet button */}
            <button
              id="btn-header-connect-sheet"
              onClick={() => {
                setActiveTab('INTEGRATIONS');
                showToast("🔗 Navigate to Integrations page. Paste spreadsheet URL to connect.");
              }}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-black transition-all cursor-pointer shadow-sm"
            >
              <Layers size={13} className="text-[#ff9900]" />
              <span>Connect Sheet</span>
            </button>

            {/* Template button */}
            <a
              id="btn-header-template"
              href="https://docs.google.com/spreadsheets/d/e/2PACX-1vQaZ6A9O82NanD3WNLDnSOb2FIpNVPFnef3RN_DoeudGep31MAL6CQE5sUlbIDe-U7nxVBX0z2TVThw/pub?gid=1397264212&single=true&output=csv"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-black transition-all cursor-pointer shadow-sm"
            >
              <FileSpreadsheet size={13} className="text-slate-400" />
              <span>Template</span>
            </a>

            {/* Upload CSV button - Orange highlight exactly as requested */}
            <button
              id="btn-header-upload-csv"
              onClick={() => {
                setActiveTab('INTEGRATIONS');
                showToast("📥 Ready for file import: Drop custom CSV in Integrations.");
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff9900] hover:bg-[#ffaa00] active:bg-[#e68a00] text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md select-none transform hover:scale-[1.02]"
            >
              <RefreshCw size={13} className="text-slate-950 duration-3000 shrink-0" />
              <span>Upload CSV</span>
            </button>


          </div>
        </div>
      </header>

      {/* SUB-HEADER TAB NAVIGATION & DATE SELECTORS - SCREENSHOT RECONSTRUCTION */}
      <div className="bg-slate-100 dark:bg-[#11161d] border-b border-slate-200 dark:border-slate-800 px-4 lg:px-12 py-1 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sticky top-16 z-30 shadow-xs">
        {/* Navigation tabs left side */}
        <div className="flex items-center overflow-x-auto scrollbar-none gap-1 py-1 md:py-0">
          {[
            { id: 'RUN_RATE', label: 'WAREHOUSE PERFORMANCE' },
            { id: 'STOCK_PLANNER', label: 'STOCK REQUIREMENT PLANNER' },
            { id: 'AI_ANALYST', label: 'AI SALES ANALYST' },
            { id: 'INTEGRATIONS', label: 'INTEGRATIONS' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  showToast(`📂 Opened page view: ${tab.label}`);
                }}
                className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 border-b-2 font-sans relative ${
                  isActive
                    ? 'border-[#ff9900] text-[#ff9900] dark:text-amber-400 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Date Filters right side with styled custom formatting */}
        <div className="flex flex-wrap items-center gap-2 pb-2 md:pb-0">
          {/* Custom Range select menu */}
          <div className="relative">
            <select
              id="header-range-selector"
              onChange={(e) => {
                const choice = e.target.value;
                if (choice === 'ALL') {
                  setStartDate(null);
                  setEndDate(null);
                  showToast("📅 Filter reset: Displaying all-time reports.");
                } else if (choice === 'LAST30') {
                  // Set range relative to max date
                  const maxD = records.length > 0 ? new Date(Math.max(...records.map(r => r.date.getTime()))) : new Date();
                  const startD = new Date(maxD.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setStartDate(startD.toISOString().split('T')[0]);
                  setEndDate(maxD.toISOString().split('T')[0]);
                  showToast("📅 Display range set: Last 30 days of data.");
                }
              }}
              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-slate-300 py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#ff9900] cursor-pointer appearance-none font-sans"
            >
              <option value="CUSTOM">CUSTOM RANGE</option>
              <option value="LAST30">LAST 30 DAYS</option>
              <option value="ALL">ALL DATA RANGE</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <ChevronDown size={11} />
            </div>
          </div>

          {/* Start Date input */}
          <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1 gap-2">
            <Calendar size={11} className="text-[#ff9900]" />
            <input
              id="header-start-date"
              type="date"
              value={startDate || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setStartDate(val);
                if (val) showToast(`📅 Filter start: ${val}`);
              }}
              className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-[#ff9900] border-none outline-none p-0 cursor-pointer w-24 font-mono focus:text-[#ff9900]"
              placeholder="Start Date"
            />
          </div>

          {/* End Date input */}
          <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1 gap-2">
            <Calendar size={11} className="text-[#ff9900]" />
            <input
              id="header-end-date"
              type="date"
              value={endDate || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setEndDate(val);
                if (val) showToast(`📅 Filter end: ${val}`);
              }}
              className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-[#ff9900] border-none outline-none p-0 cursor-pointer w-24 font-mono focus:text-[#ff9900]"
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <main className="max-w-full lg:px-12 px-4 md:px-8 pt-8 space-y-8 relative z-10">
        
        {/* CONTROL CENTER */}
        {activeTab !== 'INTEGRATIONS' && activeTab !== 'AI_ANALYST' && records.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-visible">
            {/* Control Header */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-700 dark:text-blue-300">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Refine Sales Dataset Filters</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Refine dataset across product name, marketplace portal, item, size, colour, and date range (Enabled with true relational Cross Filtering)</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  id="btn-toggle-filters-expanded"
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isFiltersExpanded ? 'Hide Filter Controls' : 'Show Filter Controls'}
                </button>
                
                {(selectedPortals.length > 0 || selectedProducts.length > 0 || selectedQualities.length > 0 || selectedSizes.length > 0 || selectedColours.length > 0 || startDate !== null || endDate !== null) && (
                  <button
                    id="btn-clear-filters-global"
                    onClick={clearAllFilters}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    Clear Active Filters
                  </button>
                )}
              </div>
            </div>

            {/* Filter Content */}
            {isFiltersExpanded && (
              <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-6 relative z-30">
                
                {/* 1. Simplified Product Name selection */}
                <SearchableDropdown
                  id="simplified"
                  label="Product Name"
                  options={crossFilterOptions.products}
                  selectedValues={selectedProducts}
                  onChange={setSelectedProducts}
                  placeholder="All Products"
                />

                {/* 2. Portal selection */}
                <SearchableDropdown
                  id="portal"
                  label="Portal Name"
                  options={crossFilterOptions.portals}
                  selectedValues={selectedPortals}
                  onChange={setSelectedPortals}
                  placeholder="All Portals"
                />

                {/* 3. Product Quality selection */}
                <SearchableDropdown
                  id="quality"
                  label="Item"
                  options={crossFilterOptions.qualities}
                  selectedValues={selectedQualities}
                  onChange={setSelectedQualities}
                  placeholder="All Items"
                />

                {/* 4. Size selection */}
                <SearchableDropdown
                  id="size"
                  label="Size"
                  options={crossFilterOptions.sizes}
                  selectedValues={selectedSizes}
                  onChange={setSelectedSizes}
                  placeholder="All Sizes"
                />

                {/* 5. Colour selection */}
                <SearchableDropdown
                  id="colour"
                  label="Colour"
                  options={crossFilterOptions.colours}
                  selectedValues={selectedColours}
                  onChange={setSelectedColours}
                  placeholder="All Colours"
                />

                {/* 6. Start Date selection */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">
                    Start Date
                  </label>
                  <div className="relative">
                    <input
                      id="filter-start-date"
                      type="date"
                      value={startDate || ''}
                      onChange={(e) => {
                        const val = e.target.value ? e.target.value : null;
                        setStartDate(val);
                        if (val) showToast(`📅 Filter start date: ${val}`);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 7. End Date selection */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">
                    End Date
                  </label>
                  <div className="relative">
                    <input
                      id="filter-end-date"
                      type="date"
                      value={endDate || ''}
                      onChange={(e) => {
                        const val = e.target.value ? e.target.value : null;
                        setEndDate(val);
                        if (val) showToast(`📅 Filter end date: ${val}`);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB CONTENTS */}
        
        {/* 0. INTEGRATIONS & DISPATCH CONFIG */}
        {activeTab === 'INTEGRATIONS' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-sm">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono">Integrations Hub</span>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-1 uppercase tracking-wide">
                <Settings size={18} className="text-blue-600" />
                System Integrations, Sheet Sync & Notifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Connect your live e-commerce Google Sheet, upload data reports in CSV format, or set up real-time Email, Telegram, and WhatsApp alerts for immediate threshold breach and inventory shortfall dispatches.
              </p>
            </div>

            <CSVImport
              currentRole={currentRole}
              onDataLoaded={handleDataLoaded}
              sheetConfig={sheetConfig}
              onSheetConfigChange={setSheetConfig}
              onFetchGoogleSheet={fetchGoogleSheetData}
              totalLoaded={records.length}
            />

            <NotificationIntegrations onShowToast={showToast} />
          </div>
        )}

        {/* 2. ROLLING RUN RATES */}
        {activeTab === 'RUN_RATE' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-lg shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono">Statistical Run Rates</span>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-1 uppercase tracking-wide">
                <BarChart3 size={18} className="text-blue-600" />
                Rolling Run Rate Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                This section presents a detailed breakdown of average sales for products and sales channels over periods of 3 months (3M), 6 months (6M), and 12 months (12M) to help you understand trends and demand patterns.
              </p>
            </div>
            
            {filteredRecords.length > 0 ? (
              <AnalyticsTable 
                records={filteredRecords} 
                onPortalClick={(portal) => {
                  setSelectedPortals(prev => 
                    prev.includes(portal) ? prev.filter(p => p !== portal) : [...prev, portal]
                  );
                  showToast(`🎯 Cross-filtered Portal: ${portal}`);
                }}
                onProductClick={(product) => {
                  setSelectedProducts(prev => 
                    prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]
                  );
                  showToast(`🎯 Cross-filtered Product: ${product}`);
                }}
              />
            ) : (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-400 dark:text-slate-500 font-medium font-sans">
                No data matched selected filters. Adjust your filters or load data in the Sales Dashboard.
              </div>
            )}
          </div>
        )}

        {/* 3. 6-MONTH STOCK PLANNER */}
        {activeTab === 'STOCK_PLANNER' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {filteredRecords.length > 0 ? (
              <InventoryPlanner 
                records={filteredRecords} 
                onProductClick={(product) => {
                  setSelectedProducts(prev => 
                    prev.includes(product) ? prev.filter(p => p !== product) : [...prev, product]
                  );
                  showToast(`🎯 Cross-filtered Product: ${product}`);
                }}
              />
            ) : (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-400 dark:text-slate-500 font-medium font-sans">
                No data matched selected filters. Adjust your filters or load data in the Sales Dashboard.
              </div>
            )}
          </div>
        )}

        {/* 4. AI SALES ANALYST BOT */}
        {activeTab === 'AI_ANALYST' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-lg shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono">Cognitive Brain Center</span>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-1 uppercase tracking-wide">
                <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
                AI E-Commerce Assistant Bot
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Connect your custom OpenRouter API Key to query sales reports, predict customer demands, analyze inventory stock levels, and generate customized marketing campaigns directly with our AI engine.
              </p>
            </div>

            <AISalesAnalyst currentRole={currentRole} records={filteredRecords} />
          </div>
        )}

      </main>
    </div>
  );
}
