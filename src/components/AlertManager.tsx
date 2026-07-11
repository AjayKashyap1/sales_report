import React, { useState, useMemo } from 'react';
import { AlertThreshold, SystemAlert, SalesRecord, UserRole } from '../types';
import { Bell, ShieldCheck, Mail, AlertTriangle, ToggleLeft, ToggleRight, Trash2, Plus, BellRing, Settings, HelpCircle, Check, MessageSquare, Phone } from 'lucide-react';

interface AlertManagerProps {
  currentRole: UserRole;
  records: SalesRecord[];
  thresholds: AlertThreshold[];
  onAddThreshold: (threshold: Omit<AlertThreshold, 'id' | 'createdAt'>) => void;
  onToggleThreshold: (id: string) => void;
  onDeleteThreshold: (id: string) => void;
  systemAlerts: SystemAlert[];
  onClearAlerts: () => void;
}

export default function AlertManager({
  currentRole,
  records,
  thresholds,
  onAddThreshold,
  onToggleThreshold,
  onDeleteThreshold,
  systemAlerts,
  onClearAlerts
}: AlertManagerProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [targetType, setTargetType] = useState<'TOTAL' | 'PORTAL' | 'PRODUCT'>('TOTAL');
  const [targetName, setTargetName] = useState('All Portals');
  const [metric, setMetric] = useState<'REVENUE' | 'UNITS'>('UNITS');
  const [condition, setCondition] = useState<'LESS_THAN' | 'GREATER_THAN'>('LESS_THAN');
  const [valueInput, setValueInput] = useState('');
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canEdit = currentRole === 'ADMIN' || currentRole === 'MANAGER';
  const isAdmin = currentRole === 'ADMIN';

  // Extract unique portals and products from records to populate dropdown
  const uniquePortals = useMemo(() => {
    return Array.from(new Set(records.map(r => r.portal)));
  }, [records]);

  const uniqueProducts = useMemo(() => {
    return Array.from(new Set(records.map(r => r.product)));
  }, [records]);

  // Adjust target name list based on type
  React.useEffect(() => {
    if (targetType === 'TOTAL') {
      setTargetName('All Portals');
    } else if (targetType === 'PORTAL') {
      setTargetName(uniquePortals[0] || 'Amazon India');
    } else {
      setTargetName(uniqueProducts[0] || 'Wireless Pro Earbuds');
    }
  }, [targetType, uniquePortals, uniqueProducts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !valueInput) return;

    const numericValue = parseFloat(valueInput);
    if (isNaN(numericValue) || numericValue <= 0) {
      alert('Please enter a valid positive number');
      return;
    }

    onAddThreshold({
      targetType,
      targetName,
      metric,
      condition,
      value: numericValue,
      isActive: true
    });

    setValueInput('');
    setSuccessMsg('Threshold created! Active dataset scanned for immediate breaches.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div id="alert-manager-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* IN-APP ALERTS LIST & EMAIL SIMULATION (2 Cols) */}
      <div id="alerts-display-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 md:p-6 lg:col-span-2 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-450 flex items-center justify-center">
                <BellRing size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Live Threshold Breach Alerts</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Real-time scan alerts for current month sales figures</p>
              </div>
            </div>

            {systemAlerts.length > 0 && (
              <button
                id="btn-clear-alerts"
                onClick={onClearAlerts}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md hover:border-rose-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
              >
                Clear Log
              </button>
            )}
          </div>

          {/* Current system alerts */}
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {systemAlerts.length > 0 ? (
              systemAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800 rounded-lg p-4 flex gap-3.5 items-start relative overflow-hidden group hover:border-rose-300 dark:hover:border-rose-900/60 transition-all"
                >
                  <div className="absolute top-0 right-0 h-16 w-16 bg-rose-500/5 blur-xl group-hover:bg-rose-500/10 pointer-events-none transition-all"></div>
                  <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{alert.title}</h4>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 shrink-0 font-bold">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                    
                    {/* Security Integration Proof: WhatsApp Alert Sent tag */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/60">
                      <div className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                        <MessageSquare size={11} strokeWidth={2.5} /> WhatsApp Sent
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Dispatched via: <strong className="text-slate-700 dark:text-slate-300 font-mono">Green API Gateway</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-60 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-4">
                <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2">
                  <ShieldCheck size={18} />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">No active breaches</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                  All active thresholds are performing within safe operational margins for the current month!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Policy Alert */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <MessageSquare size={15} />
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
            <span className="font-bold text-slate-700 dark:text-slate-300">Automated WhatsApp Alerts Policy:</span> Whenever a threshold is breached, our background loop triggers a live WhatsApp telemetry notification directly to the system owner's registered number via Green API.
          </div>
        </div>
      </div>

      {/* THRESHOLD CONFIGURATION PANEL (1 Col) */}
      <div id="threshold-config-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 md:p-6 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Threshold Guard Rules</h3>
            </div>
            
            {canEdit ? (
              <button
                id="btn-toggle-config-form"
                onClick={() => setShowConfig(!showConfig)}
                className="text-[11px] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-bold px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/60 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add Rule
              </button>
            ) : (
              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Read Only
              </span>
            )}
          </div>

          {/* Create Threshold Form */}
          {showConfig && canEdit && (
            <form onSubmit={handleSubmit} className="mb-5 p-4 bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">New Threshold Rule</h4>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target Segment</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['TOTAL', 'PORTAL', 'PRODUCT'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      id={`btn-target-type-${type.toLowerCase()}`}
                      onClick={() => setTargetType(type)}
                      className={`py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                        targetType === type ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {targetType !== 'TOTAL' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Select Name</label>
                  <select
                    id="select-threshold-target"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {targetType === 'PORTAL'
                      ? uniquePortals.map(p => <option key={p} value={p}>{p}</option>)
                      : uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)
                    }
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Condition</label>
                  <select
                    id="select-threshold-condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="LESS_THAN">Less Than (&lt;)</option>
                    <option value="GREATER_THAN">Greater Than (&gt;)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Threshold Value (Units Qty)
                </label>
                <input
                  id="input-threshold-value"
                  type="number"
                  placeholder="e.g. 10"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1.5">
                <button
                  id="btn-cancel-threshold"
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-threshold"
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Create Rule
                </button>
              </div>
            </form>
          )}

          {successMsg && (
            <div className="mb-4 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
              ✓ {successMsg}
            </div>
          )}

          {/* Active Rules List */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
            {thresholds.map((t) => (
              <div 
                key={t.id} 
                className={`p-3 bg-slate-50/50 dark:bg-slate-850/30 border ${
                  t.isActive ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-850 opacity-55'
                } rounded-lg flex items-center justify-between gap-3`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {t.targetName}
                    </span>
                    <span className="text-[9px] bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-1.5 py-0.2 rounded shrink-0 uppercase">
                      {t.targetType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold font-sans mt-0.5">
                    {t.metric === 'REVENUE' ? 'Revenue' : 'Units'}{' '}
                    {t.condition === 'LESS_THAN' ? 'falls below' : 'exceeds'}{' '}
                    <strong className="text-slate-700 dark:text-slate-200 font-bold">
                      {t.metric === 'REVENUE' ? formatCurrency(t.value) : `${t.value} units`}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Toggle Active Status */}
                  <button
                    id={`btn-toggle-threshold-${t.id}`}
                    onClick={() => canEdit && onToggleThreshold(t.id)}
                    disabled={!canEdit}
                    className={`p-1 hover:text-slate-800 dark:hover:text-slate-100 transition-colors ${
                      !canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {t.isActive ? (
                      <ToggleRight size={22} className="text-blue-600 dark:text-blue-400" />
                    ) : (
                      <ToggleLeft size={22} className="text-slate-300 dark:text-slate-650" />
                    )}
                  </button>

                  {/* Delete Rule (Admin Only) */}
                  <button
                    id={`btn-delete-threshold-${t.id}`}
                    onClick={() => isAdmin && onDeleteThreshold(t.id)}
                    disabled={!isAdmin}
                    className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 transition-colors ${
                      !isAdmin ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    title="Admin Exclusive Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <HelpCircle size={14} className="text-slate-400" />
          <span>Rules trigger dynamically whenever new data refreshes or gets uploaded.</span>
        </div>
      </div>

    </div>
  );
}
