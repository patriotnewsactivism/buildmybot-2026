import React, { useEffect, useState } from 'react';
import { Bot, MessageSquare, TrendingUp, Star, Plus, RefreshCw, BookOpen, MessageCircle } from 'lucide-react';
import { MetricCard } from '../UI/MetricCard';
import { DataTable, Column } from '../UI/DataTable';
import { dbService } from '../../services/dbService';
import { User } from '../../types';

interface ClientOverviewProps {
  user?: User | null;
  onCreateBot?: () => void;
  onOpenLeads?: () => void;
}

interface ClientStats {
  botCount: number;
  leadCount: number;
  conversionRate: number;
  averageLeadScore: number;
}

interface BotData {
  id: string;
  name: string;
  active: boolean;
  voiceId: string | null;
  createdAt: string;
}

interface LeadData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  score: number | null;
  createdAt: string;
}

export const ClientOverview: React.FC<ClientOverviewProps> = ({ user, onCreateBot, onOpenLeads }) => {
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [recentBots, setRecentBots] = useState<BotData[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(
    Boolean(user && !user.preferences?.onboardingComplete)
  );
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<{ industry?: string; goal?: string }>({});

  const fetchOverview = async () => {
    try {
      const data = await dbService.getClientOverview();
      setStats(data.stats);
      setRecentBots(data.recentBots);
      setRecentLeads(data.recentLeads);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching overview:', err);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCreateBot = () => {
    if (onCreateBot) {
      onCreateBot();
      return;
    }
    window.location.pathname = '/bots';
  };

  const botColumns: Column<BotData>[] = [
    {
      key: 'name',
      label: 'Bot Name',
      sortable: true,
      render: (bot) => (
        <div className="flex items-center space-x-2">
          <Bot size={16} className="text-orange-600" />
          <span className="font-medium text-slate-900">{bot.name}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (bot) => {
        const statusLabel = bot.active ? 'active' : 'paused';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusLabel === 'active' ? 'bg-green-100 text-green-800' :
            statusLabel === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            'bg-slate-100 text-slate-800'
          }`}>
            {statusLabel}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (bot) => new Date(bot.createdAt).toLocaleDateString(),
    },
  ];

  const leadColumns: Column<LeadData>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (lead) => (
        <div>
          <div className="font-medium text-slate-900">{lead.name}</div>
          <div className="text-xs text-slate-500">{lead.email}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (lead) => lead.phone || '-',
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      render: (lead) => {
        if (!lead.score) return '-';
        const scorePercent = Math.round(lead.score);
        return (
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  scorePercent >= 80 ? 'bg-green-600' :
                  scorePercent >= 50 ? 'bg-yellow-600' :
                  'bg-red-600'
                }`}
                style={{ width: `${scorePercent}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium text-slate-700">{scorePercent}%</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (lead) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
          lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
          lead.status === 'Qualified' ? 'bg-green-100 text-green-800' :
          lead.status === 'Closed' ? 'bg-purple-100 text-purple-800' :
          'bg-slate-100 text-slate-800'
        }`}>
          {lead.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (lead) => new Date(lead.createdAt).toLocaleDateString(),
    },
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchOverview}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <RefreshCw size={16} className="inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {showOnboarding && (
        <div className="mb-8 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Quick Start Wizard</h3>
            <span className="text-xs text-slate-500">Step {onboardingStep} of 3</span>
          </div>
          {onboardingStep === 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Choose your industry
              </label>
              <input
                value={onboardingData.industry || ''}
                onChange={(event) => setOnboardingData({ ...onboardingData, industry: event.target.value })}
                placeholder="e.g. Real Estate, Dental, HVAC"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          )}
          {onboardingStep === 2 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Primary goal for your bot
              </label>
              <input
                value={onboardingData.goal || ''}
                onChange={(event) => setOnboardingData({ ...onboardingData, goal: event.target.value })}
                placeholder="e.g. Capture leads, answer FAQs, schedule calls"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          )}
          {onboardingStep === 3 && (
            <div className="space-y-3 text-sm text-slate-600">
              <p>Industry: <span className="font-semibold text-slate-900">{onboardingData.industry || 'Not set'}</span></p>
              <p>Goal: <span className="font-semibold text-slate-900">{onboardingData.goal || 'Not set'}</span></p>
              <p className="text-slate-500">We will tailor templates and guidance based on this info.</p>
            </div>
          )}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setOnboardingStep((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2 text-sm font-medium text-slate-600"
              disabled={onboardingStep === 1}
            >
              Back
            </button>
            {onboardingStep < 3 ? (
              <button
                onClick={() => setOnboardingStep((prev) => Math.min(3, prev + 1))}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={async () => {
                  await dbService.completeOnboarding();
                  setShowOnboarding(false);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
              >
                Finish Setup
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-sm text-slate-600 mt-1">
            Welcome back! Here's your performance at a glance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreateBot}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Bot</span>
          </button>
          <button
            onClick={fetchOverview}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            icon={Bot}
            label="Active Bots"
            value={stats.botCount}
            loading={loading}
          />
          <MetricCard
            icon={MessageSquare}
            label="Total Leads"
            value={stats.leadCount}
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp}
            label="Conversion Rate"
            value={`${stats.conversionRate.toFixed(1)}%`}
            status={stats.conversionRate > 20 ? 'healthy' : stats.conversionRate > 10 ? 'warning' : 'critical'}
            loading={loading}
          />
          <MetricCard
            icon={Star}
            label="Avg Lead Score"
            value={`${stats.averageLeadScore.toFixed(0)}%`}
            loading={loading}
          />
        </div>
      )}

      {/* Quick Start Guide for New Users */}
      {stats && stats.botCount === 0 && (
        <div className="mb-8 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Get Started with BuildMyBot</h3>
          <p className="text-sm text-slate-700 mb-4">
            Create your first AI voice bot in 3 simple steps:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <span className="font-medium text-slate-900">Create a Bot</span>
              </div>
              <p className="text-xs text-slate-600">Give your bot a name and choose a voice</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <span className="font-medium text-slate-900">Configure Settings</span>
              </div>
              <p className="text-xs text-slate-600">Set up your bot's behavior and prompts</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <span className="font-medium text-slate-900">Start Capturing Leads</span>
              </div>
              <p className="text-xs text-slate-600">Deploy and watch the leads roll in</p>
            </div>
          </div>
          <button
            onClick={handleCreateBot}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Your First Bot</span>
          </button>
        </div>
      )}

      {/* Recent Bots */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Bots</h3>
          {recentBots.length > 0 && (
            <button
              onClick={handleCreateBot}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              View all {'>'}
            </button>
          )}
        </div>
        <DataTable
          columns={botColumns}
          data={recentBots}
          loading={loading}
          emptyMessage="No bots created yet. Click 'Create Bot' to get started!"
        />
      </div>

      {/* Recent Leads */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Leads</h3>
          {recentLeads.length > 0 && (
            <button
              onClick={() => onOpenLeads?.()}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              View all {'>'}
            </button>
          )}
        </div>
        <DataTable
          columns={leadColumns}
          data={recentLeads}
          loading={loading}
          emptyMessage="No leads captured yet. Create and deploy a bot to start collecting leads!"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <BookOpen size={18} />
            <span className="font-medium">Knowledge Base</span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Add FAQs, docs, and scripts so your bot answers accurately.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <MessageCircle size={18} />
            <span className="font-medium">Support</span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Need help? Reach our team for setup, optimization, and billing.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <TrendingUp size={18} />
            <span className="font-medium">Weekly Insights</span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Monitor conversions and leads in a simple weekly summary.
          </p>
        </div>
      </div>
    </div>
  );
};
