import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Award, CreditCard, RefreshCw } from 'lucide-react';
import { MetricCard } from '../../UI/MetricCard';
import { DataTable, Column } from '../../UI/DataTable';

interface CommissionStats {
  totalClients: number;
  totalRevenue: number;
  commissionRate: number;
  grossCommission: number;
  pendingPayout: number;
  whitelabelFeeDue: boolean;
  whitelabelFeeAmount: number;
}

interface Tier {
  label: string;
  min: number;
  max: number;
  commission: number;
}

interface Payout {
  id: string;
  amountCents: number;
  status: string;
  method: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export const CommissionsEarnings: React.FC = () => {
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissions = async () => {
    try {
      const response = await fetch('/api/partners/commissions');
      if (!response.ok) {
        throw new Error('Failed to fetch commission data');
      }
      const data = await response.json();
      setStats(data.stats);
      setTier(data.tier);
      setPayouts(data.payouts);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching commissions:', err);
      setError('Failed to load commission data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const payoutColumns: Column<Payout>[] = [
    {
      key: 'amountCents',
      label: 'Amount',
      sortable: true,
      render: (payout) => (
        <span className="font-semibold text-green-700">
          ${(payout.amountCents / 100).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (payout) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          payout.status === 'completed' ? 'bg-green-100 text-green-800' :
          payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {payout.status}
        </span>
      ),
    },
    {
      key: 'method',
      label: 'Method',
      render: (payout) => (
        <span className="capitalize">{payout.method.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'periodStart',
      label: 'Period',
      render: (payout) => {
        if (!payout.periodStart || !payout.periodEnd) return '-';
        return `${new Date(payout.periodStart).toLocaleDateString()} - ${new Date(payout.periodEnd).toLocaleDateString()}`;
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (payout) => new Date(payout.createdAt).toLocaleDateString(),
    },
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchCommissions}
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Commissions & Earnings</h2>
        <button
          onClick={fetchCommissions}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Commission Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={DollarSign}
            label="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            loading={loading}
          />
          <MetricCard
            icon={TrendingUp}
            label="Gross Commission"
            value={`$${stats.grossCommission.toLocaleString()}`}
            loading={loading}
          />
          <MetricCard
            icon={CreditCard}
            label="Pending Payout"
            value={`$${stats.pendingPayout.toLocaleString()}`}
            status={stats.pendingPayout > 0 ? 'healthy' : 'warning'}
            loading={loading}
          />
          <MetricCard
            icon={Award}
            label="Commission Rate"
            value={`${(stats.commissionRate * 100).toFixed(0)}%`}
            loading={loading}
          />
        </div>
      )}

      {/* Current Tier */}
      {tier && (
        <div className="mb-6 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Current Tier: {tier.label}</h3>
              <p className="text-sm text-slate-700">
                You're earning <span className="font-bold text-orange-600">{(tier.commission * 100).toFixed(0)}%</span> commission on all client revenue
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Tier range: {tier.min}-{tier.max === 999999 ? '∞' : tier.max} clients
              </p>
            </div>
            <Award size={48} className="text-orange-600" />
          </div>
        </div>
      )}

      {/* Whitelabel Fee Notice */}
      {stats && stats.whitelabelFeeDue && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CreditCard className="text-yellow-600" size={20} />
            <div>
              <p className="text-sm font-medium text-yellow-900">
                Whitelabel Fee Due: ${(stats.whitelabelFeeAmount / 100).toFixed(2)}
              </p>
              <p className="text-xs text-yellow-700">
                This fee will be deducted from your next payout
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payout History */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Payout History</h3>
        <DataTable
          columns={payoutColumns}
          data={payouts}
          loading={loading}
          emptyMessage="No payouts yet. Keep referring clients to earn commissions!"
        />
      </div>

      {/* Commission Breakdown */}
      {stats && stats.grossCommission > 0 && (
        <div className="mt-6 bg-slate-50 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Commission Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Client Revenue</span>
              <span className="font-medium text-slate-900">${stats.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Commission Rate</span>
              <span className="font-medium text-slate-900">{(stats.commissionRate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Gross Commission</span>
              <span className="font-medium text-green-700">${stats.grossCommission.toLocaleString()}</span>
            </div>
            {stats.whitelabelFeeDue && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Whitelabel Fee</span>
                <span className="font-medium text-red-700">-${(stats.whitelabelFeeAmount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-300 pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Pending Payout</span>
              <span className="font-bold text-lg text-green-700">${stats.pendingPayout.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
