import React, { useState, useRef, useEffect } from 'react';
import { GoogleSheetConfig, SalesRecord, UserRole } from '../types';
import { parseCSVText } from '../utils/csvParser';
import { Upload, Link2, RotateCw, CheckCircle2, AlertTriangle, FileSpreadsheet, Play, Pause, HelpCircle } from 'lucide-react';

interface CSVImportProps {
  currentRole: UserRole;
  onDataLoaded: (records: SalesRecord[], source: 'LOCAL_UPLOAD' | 'GOOGLE_SHEET', sheetUrl?: string) => void;
  sheetConfig: GoogleSheetConfig;
  onSheetConfigChange: (config: GoogleSheetConfig) => void;
  onFetchGoogleSheet: (url: string) => Promise<void>;
  totalLoaded: number;
}

export default function CSVImport({
  currentRole,
  onDataLoaded,
  sheetConfig,
  onSheetConfigChange,
  onFetchGoogleSheet,
  totalLoaded
}: CSVImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [localWarning, setLocalWarning] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState(sheetConfig.url);
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = currentRole === 'ADMIN';
  const canModifyConfig = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  // Synchronize internal input with external config URL
  useEffect(() => {
    setSheetUrlInput(sheetConfig.url);
  }, [sheetConfig.url]);

  // Handle countdown animation when sheet auto-refresh is active
  useEffect(() => {
    if (!sheetConfig.isEnabled || !sheetConfig.url || sheetConfig.status === 'FETCHING') {
      setRefreshCountdown(null);
      return;
    }

    // Initialize countdown if null
    setRefreshCountdown(prev => {
      if (prev === null) return sheetConfig.refreshInterval;
      return prev;
    });

    const intervalId = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev === null) {
          return sheetConfig.refreshInterval;
        }
        if (prev <= 1) {
          // Trigger fetch asynchronously outside of rendering/effect cycles
          setTimeout(() => {
            onFetchGoogleSheet(sheetConfig.url);
          }, 0);
          return sheetConfig.refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [sheetConfig.isEnabled, sheetConfig.url, sheetConfig.refreshInterval, sheetConfig.status, onFetchGoogleSheet]);

  // Handle CSV Local Upload
  const handleCSVFile = (file: File) => {
    if (!file) return;
    
    setLocalWarning(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { records, warning } = parseCSVText(text);
      
      if (records.length > 0) {
        onDataLoaded(records, 'LOCAL_UPLOAD');
        setLocalWarning(warning);
      } else {
        setLocalWarning(warning || 'No valid sales records could be parsed. Check columns.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!canUpload) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCSVFile(e.target.files[0]);
    }
  };

  const handleGoogleSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyConfig || !sheetUrlInput.trim()) return;

    onSheetConfigChange({
      ...sheetConfig,
      url: sheetUrlInput.trim(),
      status: 'FETCHING',
      errorMessage: null
    });

    await onFetchGoogleSheet(sheetUrlInput.trim());
    setRefreshCountdown(sheetConfig.refreshInterval);
  };

  const toggleAutoRefresh = () => {
    if (!canModifyConfig) return;
    onSheetConfigChange({
      ...sheetConfig,
      isEnabled: !sheetConfig.isEnabled
    });
    setRefreshCountdown(sheetConfig.refreshInterval);
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!canModifyConfig) return;
    const val = parseInt(e.target.value, 10);
    onSheetConfigChange({
      ...sheetConfig,
      refreshInterval: val
    });
    setRefreshCountdown(val);
  };

  return (
    <div id="csv-import-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LOCAL CSV UPLOAD */}
      <div 
        id="local-csv-card"
        className={`bg-white border rounded-lg p-5 md:p-6 transition-all shadow-sm ${
          dragActive ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-blue-600" />
              Sales CSV File Upload
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Upload local transaction data file (.csv)</p>
          </div>
          {canUpload ? (
            <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Admin Exclusive
            </span>
          ) : (
            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Disabled ({currentRole})
            </span>
          )}
        </div>

        {/* Upload Box */}
        <div 
          onClick={() => canUpload && fileInputRef.current?.click()}
          className={`h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center transition-all ${
            canUpload 
              ? 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400 cursor-pointer' 
              : 'border-slate-200 bg-slate-50/20 cursor-not-allowed opacity-60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            disabled={!canUpload}
          />
          <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-xs">
            <Upload size={18} className={canUpload ? 'text-blue-600 animate-pulse' : 'text-slate-400'} />
          </div>
          {canUpload ? (
            <>
              <p className="text-xs font-semibold text-slate-600">
                Drag & drop your sales CSV file here, or <span className="text-blue-600 hover:underline">browse</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Supports Amazon, Flipkart, Website headers dynamically</p>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Only users with <span className="text-rose-600 font-semibold">ADMIN</span> role can upload local CSV files.
            </p>
          )}
        </div>

        {/* Local Warnings / Success */}
        {localWarning && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 items-start">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 font-mono leading-relaxed">{localWarning}</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
          <span className="font-mono">Loaded Records: <strong className="text-blue-600">{totalLoaded}</strong></span>
          <span className="text-slate-600 flex items-center gap-1 font-semibold">
            <CheckCircle2 size={12} className="text-emerald-600" /> Auto-detected Column Headers
          </span>
        </div>
      </div>

      {/* GOOGLE SHEET REAL-TIME FEED */}
      <div id="google-sheet-card" className="bg-white border border-slate-200 rounded-lg p-5 md:p-6 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Link2 size={18} className="text-emerald-600" />
                Google Sheet Live Synchronization
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time update directly from web-shared CSV</p>
            </div>
            <button 
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-slate-500 hover:text-blue-600 text-xs flex items-center gap-1 underline font-semibold focus:outline-none"
            >
              <HelpCircle size={14} /> Help / Setup Guide
            </button>
          </div>

          {/* Setup Guide Accordion */}
          {showInstructions && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 animate-in slide-in-from-top-2">
              <p className="font-bold text-blue-600 font-sans">How to Link Your Google Sheet (Step-by-Step Guide):</p>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 font-sans leading-relaxed">
                <li>Open your sales data spreadsheet in Google Sheets.</li>
                <li>In the top menu, click <strong className="text-slate-800">File &gt; Share &gt; Publish to web</strong>.</li>
                <li>In the dialog that opens, select <strong className="text-slate-800">Entire Document</strong> (or a specific sheet) and set the format drop-down to <strong className="text-slate-800">Comma-separated values (.csv)</strong>.</li>
                <li>Click the <strong className="text-slate-800">Publish</strong> button and copy the generated URL link.</li>
                <li>Paste that link in the field below and click <strong className="text-slate-800">Connect & Sync</strong>!</li>
              </ol>
              <div className="pt-1 text-[10px] text-slate-400">
                💡 <span className="font-semibold text-slate-500 font-mono">Example:</span> https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv
              </div>
            </div>
          )}

          <form onSubmit={handleGoogleSheetSubmit} className="space-y-3 mt-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Paste Published Web CSV URL</label>
              <div className="flex gap-2">
                <input
                  id="input-sheet-url"
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  disabled={!canModifyConfig}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  id="btn-sync-sheet"
                  type="submit"
                  disabled={!canModifyConfig || !sheetUrlInput.trim() || sheetConfig.status === 'FETCHING'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 focus:outline-none cursor-pointer"
                >
                  {sheetConfig.status === 'FETCHING' ? (
                    <RotateCw size={12} className="animate-spin" />
                  ) : (
                    <RotateCw size={12} />
                  )}
                  Connect & Sync
                </button>
              </div>
            </div>

            {/* Interval and Polling options */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-toggle-auto-refresh"
                    type="button"
                    onClick={toggleAutoRefresh}
                    disabled={!canModifyConfig || !sheetConfig.url}
                    className={`h-7 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      sheetConfig.isEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {sheetConfig.isEnabled ? (
                      <>
                        <Pause size={12} /> Auto-Sync Active
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Enable Auto-Sync
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-semibold">Frequency:</span>
                  <select
                    id="select-refresh-interval"
                    value={sheetConfig.refreshInterval}
                    onChange={handleIntervalChange}
                    disabled={!canModifyConfig || !sheetConfig.isEnabled}
                    className="bg-white border border-slate-200 rounded-lg text-xs text-slate-700 py-1 px-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value={10}>Every 10s</option>
                    <option value={30}>Every 30s</option>
                    <option value={60}>Every 1m</option>
                    <option value={180}>Every 3m</option>
                  </select>
                </div>
              </div>

              {refreshCountdown !== null && sheetConfig.isEnabled && (
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Polling in {refreshCountdown}s...
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Sync Logs and Info */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Status:</span>
            {sheetConfig.status === 'IDLE' && (
              <span className="text-slate-500 flex items-center gap-1">
                ● Not Linked
              </span>
            )}
            {sheetConfig.status === 'FETCHING' && (
              <span className="text-emerald-600 flex items-center gap-1 font-semibold animate-pulse">
                <RotateCw size={11} className="animate-spin" /> Fetching latest sheets data...
              </span>
            )}
            {sheetConfig.status === 'SUCCESS' && (
              <span className="text-emerald-700 flex items-center gap-1 font-bold">
                <CheckCircle2 size={12} className="text-emerald-600" /> Connected
              </span>
            )}
            {sheetConfig.status === 'ERROR' && (
              <span className="text-rose-600 flex items-center gap-1 font-bold">
                <AlertTriangle size={12} className="text-rose-600" /> Sync Failed
              </span>
            )}
          </div>

          <div className="text-slate-500 text-right font-semibold">
            {sheetConfig.lastFetched ? (
              <span className="font-mono">Synced: {new Date(sheetConfig.lastFetched).toLocaleTimeString()}</span>
            ) : (
              <span>Not synced yet</span>
            )}
          </div>
        </div>

        {sheetConfig.errorMessage && (
          <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700 font-mono leading-relaxed">
            ⚠️ {sheetConfig.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
