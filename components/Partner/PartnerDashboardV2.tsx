import React, { useState } from 'react';
import { Users, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import { User } from '../../types';
import { ClientManagement } from './widgets/ClientManagement';
import { CommissionsEarnings } from './widgets/CommissionsEarnings';
import { MarketingMaterials } from './widgets/MarketingMaterials';

type PartnerTab = 'clients' | 'commissions' | 'marketing';

interface PartnerDashboardV2Props {
  user: User;
}

export const PartnerDashboardV2: React.FC<PartnerDashboardV2Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<PartnerTab>('clients');

  // Show pending approval screen if status is Pending
  if (user.status === 'Pending') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle size={32} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Pending</h2>
          <p className="text-slate-500 max-w-md mb-6">
            Your partner application is currently under review. You'll receive full access to the partner dashboard once your application is approved.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-orange-800">
              <strong>What's next?</strong> Our team typically reviews applications within 24-48 hours. You'll receive an email notification when your account is activated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'clients' as PartnerTab, label: 'Client Management', icon: Users },
    { id: 'commissions' as PartnerTab, label: 'Commissions & Earnings', icon: DollarSign },
    { id: 'marketing' as PartnerTab, label: 'Marketing Materials', icon: FileText },
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
        {activeTab === 'clients' && <ClientManagement />}
        {activeTab === 'commissions' && <CommissionsEarnings />}
        {activeTab === 'marketing' && <MarketingMaterials />}
      </div>
    </div>
  );
};
