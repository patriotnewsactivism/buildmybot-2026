import React from 'react';
import { BarChart3, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { MetricCard } from '../../UI/MetricCard';

export const SystemAnalytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">System Analytics</h2>
        <span className="text-sm text-slate-500">Last 30 days</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={BarChart3} label="Total Events" value="--" loading={false} />
        <MetricCard icon={TrendingUp} label="Conversion Rate" value="--" loading={false} />
        <MetricCard icon={Users} label="Active Organizations" value="--" loading={false} />
        <MetricCard icon={MessageSquare} label="Conversations" value="--" loading={false} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Analytics Overview</h3>
        <p className="text-sm text-slate-600">
          Detailed analytics visualizations will appear here once data pipelines are connected.
        </p>
      </div>
    </div>
  );
};
