import React from 'react';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { MetricCard } from '../../UI/MetricCard';

export const PartnerAnalytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Performance Analytics</h2>
        <span className="text-sm text-slate-500">Last 30 days</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard icon={Users} label="Active Clients" value="--" />
        <MetricCard icon={TrendingUp} label="Conversion Rate" value="--" />
        <MetricCard icon={BarChart3} label="Total Leads" value="--" />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Analytics Overview</h3>
        <p className="text-sm text-slate-600">
          Detailed partner analytics will appear once your data pipeline is connected.
        </p>
      </div>
    </div>
  );
};
