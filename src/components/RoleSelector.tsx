import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, User, ChevronDown, Check, AlertCircle } from 'lucide-react';

interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export default function RoleSelector({ currentRole, onRoleChange }: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const rolesConfig: Record<UserRole, { label: string; color: string; desc: string; permissions: string[] }> = {
    ADMIN: {
      label: 'Admin (System Owner)',
      color: 'bg-rose-50 border-rose-200 text-rose-700',
      desc: 'Full control of the system including data upload, threshold configuration, alerts, and report export.',
      permissions: ['Upload local CSV', 'Modify Google Sheet Link', 'Set Threshold & Alerts', 'Simulate Email Exports', 'View Analytics & Dashboard']
    },
    MANAGER: {
      label: 'Manager (Analyst)',
      color: 'bg-amber-50 border-amber-200 text-amber-700',
      desc: 'Can view reports, connect live sheets, trigger email exports, and toggle/acknowledge thresholds.',
      permissions: ['Modify Google Sheet Link', 'Toggle Active Alerts', 'Simulate Email Exports', 'View Analytics & Dashboard']
    },
    VIEWER: {
      label: 'Viewer (Read-Only)',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      desc: 'Read-only access to view charts, rolling average tables, and active notification alerts.',
      permissions: ['View Analytics & Dashboard', 'View Active Alerts']
    }
  };

  const selectedConfig = rolesConfig[currentRole];

  return (
    <div id="role-selector-container" className="relative bg-white border border-slate-200 rounded-lg p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
          <User size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-850 dark:text-slate-100 font-sans">Active Session:</span>
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${selectedConfig.color}`}>
              {currentRole}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            {selectedConfig.desc}
          </p>
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          id="btn-role-dropdown"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full md:w-56 flex items-center justify-between gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <span className="flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            {currentRole === 'ADMIN' ? 'Admin Role' : currentRole === 'MANAGER' ? 'Manager Role' : 'Viewer Role'}
          </span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Switch Role (Security Access Demo)
              </div>
              
              {(Object.keys(rolesConfig) as UserRole[]).map((role) => (
                <button
                  key={role}
                  id={`btn-role-select-${role.toLowerCase()}`}
                  onClick={() => {
                    onRoleChange(role);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 hover:bg-slate-50 flex items-start gap-3 transition-colors text-left ${currentRole === role ? 'bg-slate-50' : ''}`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${currentRole === role ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                    {currentRole === role && <Check size={10} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {role === 'ADMIN' ? 'Admin (Full Access)' : role === 'MANAGER' ? 'Manager (Edit & Export)' : 'Viewer (View Only)'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {role === 'ADMIN' ? 'Can manage files & configs' : role === 'MANAGER' ? 'Can connect sheets & trigger alerts' : 'Cannot upload or modify configuration'}
                    </div>
                  </div>
                </button>
              ))}

              <div className="mx-3 mt-2 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                <div className="flex gap-1.5 items-start text-[10px] text-slate-500">
                  <AlertCircle size={12} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-600">Security Rule Demo:</span> Certain buttons/inputs are disabled based on your selected role to enforce access boundaries.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
