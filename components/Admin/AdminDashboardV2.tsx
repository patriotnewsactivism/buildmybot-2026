import React, { useState } from 'react';
import { Activity, Users, Briefcase, DollarSign, BarChart3, Headphones, Settings } from 'lucide-react';
import { LiveMetrics } from './widgets/LiveMetrics';
import { UserManagement } from './widgets/UserManagement';
import { PartnerOversight } from './widgets/PartnerOversight';
import { FinancialDashboard } from './widgets/FinancialDashboard';
import { SystemAnalytics } from './widgets/SystemAnalytics';
import { SupportQueue } from './widgets/SupportQueue';
import { SystemSettings } from './widgets/SystemSettings';

type AdminTab = 'metrics' | 'users' | 'partners' | 'financial' | 'analytics' | 'support' | 'system';

interface AdminDashboardV2Props {
  onImpersonate: (userId: string, reason: string) => void;
}

export const AdminDashboardV2: React.FC<AdminDashboardV2Props> = ({ onImpersonate }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('metrics');

  const tabs = [
    { id: 'metrics' as AdminTab, label: 'Live Metrics', icon: Activity },
    { id: 'users' as AdminTab, label: 'User Management', icon: Users },
    { id: 'partners' as AdminTab, label: 'Partner Oversight', icon: Briefcase },
    { id: 'financial' as AdminTab, label: 'Financial', icon: DollarSign },
    { id: 'analytics' as AdminTab, label: 'Analytics', icon: BarChart3 },
    { id: 'support' as AdminTab, label: 'Support', icon: Headphones },
    { id: 'system' as AdminTab, label: 'System', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200 rounded-lg">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-600 text-orange-600 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'metrics' && <LiveMetrics />}
        {activeTab === 'users' && <UserManagement onImpersonate={onImpersonate} />}
        {activeTab === 'partners' && <PartnerOversight />}
        {activeTab === 'financial' && <FinancialDashboard />}
        {activeTab === 'analytics' && <SystemAnalytics />}
        {activeTab === 'support' && <SupportQueue />}
        {activeTab === 'system' && <SystemSettings />}
      </div>
    </div>
  );
};
