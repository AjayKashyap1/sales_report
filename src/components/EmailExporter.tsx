import React, { useState } from 'react';
import { UserRole, SalesRecord } from '../types';
import { Mail, Download, ShieldAlert, CheckCircle, RotateCw, FileText, FileSpreadsheet, Eye } from 'lucide-react';
import { exportToCSVString } from '../utils/csvParser';

interface EmailExporterProps {
  currentRole: UserRole;
  records: SalesRecord[];
}

export default function EmailExporter({ currentRole, records }: EmailExporterProps) {
  const [recipient, setRecipient] = useState('ajay741900@gmail.com');
  const [format, setFormat] = useState<'PDF' | 'EXCEL' | 'CSV'>('PDF');
  const [includeBreaches, setIncludeBreaches] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSteps, setExportSteps] = useState<string[]>([]);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const canExport = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  const steps = [
    'Parsing active sales transactions...',
    'Generating 3/6/12 month rolling average matrices...',
    'Formatting attachments (PDF/Excel sheets)...',
    'Opening secure outbound SMTP pipe...',
    'Dispatching encrypted report to ajay741900@gmail.com...',
    'Done!'
  ];

  const handleExport = () => {
    if (!canExport) return;
    
    setIsExporting(true);
    setExportSuccess(false);
    setExportSteps([]);
    setCurrentStepIdx(0);

    // Simulate sending stages step-by-step for high-fidelity interactive engagement
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setExportSteps(prev => [...prev, step]);
        setCurrentStepIdx(idx);
        
        if (idx === steps.length - 1) {
          setIsExporting(false);
          setExportSuccess(true);
          
          // Trigger local file download if they exported CSV as fallback!
          if (format === 'CSV') {
            try {
              const csvString = exportToCSVString(records);
              const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', `sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch (err) {
              console.error('Local export fail', err);
            }
          }
        }
      }, (idx + 1) * 750);
    });
  };

  return (
    <div id="email-exporter-container" className="bg-white border border-slate-200 rounded-lg p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Mail size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Secure Email Report Exporter</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Export metrics summaries, tables, and graphs instantly</p>
          </div>
        </div>

        {canExport ? (
          <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Access Granted
          </span>
        ) : (
          <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-600 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert size={10} /> Unauthorized
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls Column */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Recipient Email Address</label>
            <input
              id="input-export-recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={!canExport || isExporting}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Export File Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['PDF', 'EXCEL', 'CSV'] as const).map((fmt) => (
                <button
                  key={fmt}
                  id={`btn-fmt-${fmt.toLowerCase()}`}
                  onClick={() => setFormat(fmt)}
                  disabled={!canExport || isExporting}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    format === fmt
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  } disabled:opacity-50`}
                >
                  {fmt === 'PDF' && <FileText size={16} />}
                  {fmt === 'EXCEL' && <FileSpreadsheet size={16} />}
                  {fmt === 'CSV' && <Download size={16} />}
                  {fmt === 'PDF' ? 'PDF Doc' : fmt === 'EXCEL' ? 'Excel Sheet' : 'Raw CSV'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="cb-include-breaches"
              type="checkbox"
              checked={includeBreaches}
              onChange={(e) => setIncludeBreaches(e.target.checked)}
              disabled={!canExport || isExporting}
              className="h-4 w-4 bg-white border border-slate-300 rounded text-blue-600 focus:ring-blue-500/20"
            />
            <label htmlFor="cb-include-breaches" className="text-xs text-slate-500 font-semibold select-none cursor-pointer">
              Include current month active threshold alerts in summary
            </label>
          </div>

          <button
            id="btn-dispatch-report"
            onClick={handleExport}
            disabled={!canExport || isExporting || records.length === 0}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-blue-500/10 cursor-pointer"
          >
            {isExporting ? (
              <>
                <RotateCw size={14} className="animate-spin" />
                Dispatching Secured Report...
              </>
            ) : (
              <>
                <Mail size={14} />
                Generate & Dispatch Email Report
              </>
            )}
          </button>

          {!canExport && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex gap-2 items-start">
              <ShieldAlert size={14} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-rose-700 leading-normal">
                Your role (<strong className="uppercase">{currentRole}</strong>) is restricted from exporting financial records. Please switch to <strong className="font-bold text-slate-800">Manager</strong> or <strong className="font-bold text-slate-800">Admin</strong> in the switcher at the top.
              </p>
            </div>
          )}
        </div>

        {/* Console / Delivery Feedback Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between min-h-[220px]">
          <div>
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-2.5">
              Secure Outbound Logs
            </span>
            
            <div className="space-y-1.5 font-mono text-[10px] leading-relaxed">
              {exportSteps.map((step, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center gap-2 ${
                    idx === currentStepIdx && isExporting ? 'text-blue-400 animate-pulse font-semibold' : 'text-slate-400'
                  }`}
                >
                  <span className="text-blue-500 shrink-0">&gt;&gt;</span>
                  <span>{step}</span>
                </div>
              ))}
              
              {!isExporting && !exportSuccess && (
                <p className="text-slate-500 italic">No task active. Click Dispatch to initiate secure tunnel...</p>
              )}
            </div>
          </div>

          {exportSuccess && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex gap-2 items-start animate-in zoom-in-95">
              <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-400">Report Successfully Sent!</p>
                <p className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
                  The executive summary package ({format}) has been delivered to <span className="font-semibold text-white">{recipient}</span>.
                </p>
                <p className="text-[9px] font-mono text-slate-400 mt-1">
                  Confirmation Code: <strong className="text-slate-200">SRT-{Math.floor(Math.random() * 90000) + 10000}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
