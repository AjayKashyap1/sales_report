import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, MessageSquare, AlertTriangle, HelpCircle, BellRing, Settings, RotateCw } from 'lucide-react';

interface NotificationConfig {
  email: {
    enabled: boolean;
    recipient: string;
    triggerOnBreach: boolean;
    triggerOnShortfall: boolean;
    digestFrequency: 'OFF' | 'DAILY' | 'WEEKLY';
  };
  telegram: {
    enabled: boolean;
    chatId: string;
    botToken: string;
    triggerOnBreach: boolean;
    triggerOnShortfall: boolean;
  };
  whatsapp: {
    enabled: boolean;
    phoneNumber: string;
    triggerOnBreach: boolean;
    triggerOnShortfall: boolean;
    templateType: 'CONCISE' | 'DETAILED';
  };
}

interface NotificationIntegrationsProps {
  onShowToast: (msg: string) => void;
}

export default function NotificationIntegrations({ onShowToast }: NotificationIntegrationsProps) {
  const [config, setConfig] = useState<NotificationConfig>(() => {
    const saved = localStorage.getItem('notification_integrations_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default below
      }
    }
    return {
      email: {
        enabled: false,
        recipient: 'warehouse-manager@amazon.com',
        triggerOnBreach: true,
        triggerOnShortfall: true,
        digestFrequency: 'DAILY',
      },
      telegram: {
        enabled: false,
        chatId: '',
        botToken: '',
        triggerOnBreach: true,
        triggerOnShortfall: false,
      },
      whatsapp: {
        enabled: false,
        phoneNumber: '+91 98765 43210',
        triggerOnBreach: true,
        triggerOnShortfall: true,
        templateType: 'CONCISE',
      },
    };
  });

  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({});

  const saveConfig = (newConfig: NotificationConfig) => {
    setConfig(newConfig);
    localStorage.setItem('notification_integrations_config', JSON.stringify(newConfig));
  };

  const handleToggle = (platform: 'email' | 'telegram' | 'whatsapp') => {
    const newConfig = {
      ...config,
      [platform]: {
        ...config[platform],
        enabled: !config[platform].enabled,
      },
    };
    saveConfig(newConfig);
    onShowToast(`🔔 ${platform.toUpperCase()} notifications ${newConfig[platform].enabled ? 'ENABLED' : 'DISABLED'}`);
  };

  const handleFieldChange = (platform: 'email' | 'telegram' | 'whatsapp', field: string, value: any) => {
    const newConfig = {
      ...config,
      [platform]: {
        ...config[platform],
        [field]: value,
      },
    };
    saveConfig(newConfig);
  };

  const sendTestNotification = async (platform: 'email' | 'telegram' | 'whatsapp') => {
    setTestLoading(prev => ({ ...prev, [platform]: true }));
    
    // Simulate API request to dispatching system
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setTestLoading(prev => ({ ...prev, [platform]: false }));
    
    if (platform === 'email') {
      if (!config.email.recipient) {
        onShowToast('❌ Please specify a valid recipient email ID first.');
        return;
      }
      onShowToast(`📧 Test Email alert successfully dispatched to ${config.email.recipient}!`);
    } else if (platform === 'telegram') {
      if (!config.telegram.chatId) {
        onShowToast('❌ Please specify a Telegram Chat ID first.');
        return;
      }
      onShowToast(`✈️ Telegram bot push alert dispatched to Chat ID ${config.telegram.chatId}!`);
    } else if (platform === 'whatsapp') {
      if (!config.whatsapp.phoneNumber) {
        onShowToast('❌ Please specify a WhatsApp Phone Number first.');
        return;
      }
      onShowToast(`💬 WhatsApp sandbox template alert transmitted to ${config.whatsapp.phoneNumber}!`);
    }
  };

  return (
    <div id="notification-integrations-section" className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <BellRing size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Automated Alerts & Dispatch Integrations
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wide uppercase font-bold mt-0.5">
              Configure trigger actions for threshold breaches, stock planners, and critical inventory shortfalls
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* 1. EMAIL NOTIFICATION */}
          <div id="integration-email-card" className="bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Mail size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Email Alerts</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={config.email.enabled} 
                    onChange={() => handleToggle('email')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={config.email.recipient}
                    onChange={(e) => handleFieldChange('email', 'recipient', e.target.value)}
                    placeholder="warehouse-manager@amazon.com"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Alert Actions</span>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-350 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.email.triggerOnBreach}
                      onChange={(e) => handleFieldChange('email', 'triggerOnBreach', e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                    />
                    <span>On Threshold Breach</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-350 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.email.triggerOnShortfall}
                      onChange={(e) => handleFieldChange('email', 'triggerOnShortfall', e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                    />
                    <span>On Inventory Shortfalls</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">Digest Frequency</label>
                  <select
                    value={config.email.digestFrequency}
                    onChange={(e) => handleFieldChange('email', 'digestFrequency', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  >
                    <option value="OFF">NO DIGEST (ALERTS ONLY)</option>
                    <option value="DAILY">DAILY DIGEST REPORT</option>
                    <option value="WEEKLY">WEEKLY RECAP</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 font-mono">STATUS: <span className={config.email.enabled ? 'text-emerald-500 font-extrabold' : 'text-slate-400'}>{config.email.enabled ? 'ACTIVE' : 'INACTIVE'}</span></span>
              <button
                type="button"
                disabled={testLoading.email}
                onClick={() => sendTestNotification('email')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {testLoading.email ? <RotateCw size={11} className="animate-spin" /> : <Send size={11} />}
                <span>Test Email</span>
              </button>
            </div>
          </div>

          {/* 2. TELEGRAM NOTIFICATION */}
          <div id="integration-telegram-card" className="bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Send size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Telegram Channel</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={config.telegram.enabled} 
                    onChange={() => handleToggle('telegram')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">Telegram Chat ID</label>
                  <input
                    type="text"
                    value={config.telegram.chatId}
                    onChange={(e) => handleFieldChange('telegram', 'chatId', e.target.value)}
                    placeholder="e.g. -10014839201"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">Telegram Bot Token</label>
                  <input
                    type="password"
                    value={config.telegram.botToken}
                    onChange={(e) => handleFieldChange('telegram', 'botToken', e.target.value)}
                    placeholder="Enter Bot Secret Token"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Alert Actions</span>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-350 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.telegram.triggerOnBreach}
                      onChange={(e) => handleFieldChange('telegram', 'triggerOnBreach', e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                    />
                    <span>On Threshold Breach</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-350 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.telegram.triggerOnShortfall}
                      onChange={(e) => handleFieldChange('telegram', 'triggerOnShortfall', e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                    />
                    <span>On Inventory Shortfalls</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 font-mono">STATUS: <span className={config.telegram.enabled ? 'text-emerald-500 font-extrabold' : 'text-slate-400'}>{config.telegram.enabled ? 'ACTIVE' : 'INACTIVE'}</span></span>
              <button
                type="button"
                disabled={testLoading.telegram}
                onClick={() => sendTestNotification('telegram')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {testLoading.telegram ? <RotateCw size={11} className="animate-spin" /> : <Send size={11} />}
                <span>Test Push</span>
              </button>
            </div>
          </div>

          {/* 3. WHATSAPP NOTIFICATION */}
          <div id="integration-whatsapp-card" className="bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <MessageSquare size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">WhatsApp Alerts</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={config.whatsapp.enabled} 
                    onChange={() => handleToggle('whatsapp')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">WhatsApp Phone No.</label>
                  <input
                    type="tel"
                    value={config.whatsapp.phoneNumber}
                    onChange={(e) => handleFieldChange('whatsapp', 'phoneNumber', e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Alert Actions</span>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-350 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.whatsapp.triggerOnBreach}
                      onChange={(e) => handleFieldChange('whatsapp', 'triggerOnBreach', e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                    />
                    <span>On Threshold Breach</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-350 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.whatsapp.triggerOnShortfall}
                      onChange={(e) => handleFieldChange('whatsapp', 'triggerOnShortfall', e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                    />
                    <span>On Inventory Shortfalls</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">Report Template</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleFieldChange('whatsapp', 'templateType', 'CONCISE')}
                      className={`flex-1 py-1 px-2.5 text-[10px] font-black border rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                        config.whatsapp.templateType === 'CONCISE'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Concise Brief
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('whatsapp', 'templateType', 'DETAILED')}
                      className={`flex-1 py-1 px-2.5 text-[10px] font-black border rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                        config.whatsapp.templateType === 'DETAILED'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Full Details
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 font-mono">STATUS: <span className={config.whatsapp.enabled ? 'text-emerald-500 font-extrabold' : 'text-slate-400'}>{config.whatsapp.enabled ? 'ACTIVE' : 'INACTIVE'}</span></span>
              <button
                type="button"
                disabled={testLoading.whatsapp}
                onClick={() => sendTestNotification('whatsapp')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                {testLoading.whatsapp ? <RotateCw size={11} className="animate-spin" /> : <MessageSquare size={11} />}
                <span>Test text</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
