import React from 'react';
import { Shield, Settings2 } from 'lucide-react';

export const SystemSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <span className="text-sm text-slate-500">Configuration</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Shield className="text-slate-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-900">Security</h3>
          </div>
          <p className="text-sm text-slate-600">
            Configure API key rotation, audit logging, and other security controls.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Settings2 className="text-slate-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-900">Environment</h3>
          </div>
          <p className="text-sm text-slate-600">
            Manage system-wide feature flags and environment overrides.
          </p>
        </div>
      </div>
    </div>
  );
};
