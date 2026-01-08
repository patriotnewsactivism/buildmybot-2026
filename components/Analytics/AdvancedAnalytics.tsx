import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Calendar,
  MessageSquare,
  Users,
  Target,
  TrendingUp,
  Download,
  FileText,
  Clock,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ArrowUp,
  ArrowDown,
  Loader,
  RefreshCw,
} from 'lucide-react';

interface AdvancedAnalyticsProps {
  organizationId?: string;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface MetricData {
  totalConversations: number;
  uniqueVisitors: number;
  leadsGenerated: number;
  conversionRate: number;
  conversationGrowth: number;
  visitorGrowth: number;
  leadGrowth: number;
  conversionGrowth: number;
}

interface TimeSeriesData {
  date: string;
  conversations: number;
  visitors: number;
  leads: number;
}

interface LeadsBySourceData {
  source: string;
  leads: number;
}

interface SentimentData {
  name: string;
  value: number;
  color: string;
}

interface SessionDurationData {
  date: string;
  avgDuration: number;
}

interface IntentData {
  id: string;
  intent: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface PeakHourData {
  hour: number;
  day: string;
  count: number;
}

const generateMockData = () => {
  const days = 30;
  const timeSeriesData: TimeSeriesData[] = [];
  const sessionDurationData: SessionDurationData[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    timeSeriesData.push({
      date: dateStr,
      conversations: Math.floor(Math.random() * 150) + 50,
      visitors: Math.floor(Math.random() * 300) + 100,
      leads: Math.floor(Math.random() * 30) + 5,
    });
    
    sessionDurationData.push({
      date: dateStr,
      avgDuration: Math.floor(Math.random() * 8) + 2,
    });
  }

  const leadsBySource: LeadsBySourceData[] = [
    { source: 'Website Chat', leads: 245 },
    { source: 'Landing Page', leads: 189 },
    { source: 'Product Bot', leads: 134 },
    { source: 'Support Bot', leads: 87 },
    { source: 'Marketing Bot', leads: 62 },
  ];

  const sentimentData: SentimentData[] = [
    { name: 'Positive', value: 65, color: '#10b981' },
    { name: 'Neutral', value: 25, color: '#6b7280' },
    { name: 'Negative', value: 10, color: '#ef4444' },
  ];

  const topIntents: IntentData[] = [
    { id: '1', intent: 'Product Inquiry', count: 1245, percentage: 28.5, trend: 'up' },
    { id: '2', intent: 'Pricing Questions', count: 987, percentage: 22.6, trend: 'up' },
    { id: '3', intent: 'Support Request', count: 756, percentage: 17.3, trend: 'stable' },
    { id: '4', intent: 'Demo Request', count: 543, percentage: 12.4, trend: 'up' },
    { id: '5', intent: 'Account Help', count: 421, percentage: 9.6, trend: 'down' },
    { id: '6', intent: 'Feature Request', count: 298, percentage: 6.8, trend: 'stable' },
    { id: '7', intent: 'General Greeting', count: 121, percentage: 2.8, trend: 'down' },
  ];

  const peakHoursData: PeakHourData[] = [];
  const days_of_week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let hour = 0; hour < 24; hour++) {
    for (const day of days_of_week) {
      const isBusinessHour = hour >= 9 && hour <= 17;
      const isWeekend = day === 'Sat' || day === 'Sun';
      const baseCount = isBusinessHour && !isWeekend ? 50 : 10;
      peakHoursData.push({
        hour,
        day,
        count: Math.floor(Math.random() * baseCount) + (isBusinessHour && !isWeekend ? 20 : 5),
      });
    }
  }

  const metrics: MetricData = {
    totalConversations: timeSeriesData.reduce((sum, d) => sum + d.conversations, 0),
    uniqueVisitors: timeSeriesData.reduce((sum, d) => sum + d.visitors, 0),
    leadsGenerated: timeSeriesData.reduce((sum, d) => sum + d.leads, 0),
    conversionRate: 4.8,
    conversationGrowth: 12.5,
    visitorGrowth: 8.3,
    leadGrowth: 15.2,
    conversionGrowth: 2.1,
  };

  return {
    metrics,
    timeSeriesData,
    leadsBySource,
    sentimentData,
    sessionDurationData,
    topIntents,
    peakHoursData,
  };
};

const PremiumCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
    {children}
  </div>
);

const MetricCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: number;
  loading?: boolean;
}> = ({ icon: Icon, label, value, change, loading }) => {
  if (loading) {
    return (
      <PremiumCard className="p-4 md:p-6">
        <div className="animate-pulse">
          <div className="h-12 bg-slate-200 rounded mb-2"></div>
          <div className="h-6 bg-slate-200 rounded w-1/2"></div>
        </div>
      </PremiumCard>
    );
  }

  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <PremiumCard className="p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div className="p-2 md:p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
          <Icon className="text-white" size={20} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-slate-500'}`}>
            {isPositive && <ArrowUp size={14} />}
            {isNegative && <ArrowDown size={14} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="mt-3 md:mt-4">
        <div className="text-2xl md:text-3xl font-bold text-slate-900">{value}</div>
        <div className="text-xs md:text-sm font-medium text-slate-600 mt-1">{label}</div>
      </div>
    </PremiumCard>
  );
};

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ organizationId }) => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('30d');

  const mockData = useMemo(() => generateMockData(), []);
  const [data, setData] = useState(mockData);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setData(generateMockData());
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [dateRange, organizationId]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const endDate = new Date();
    let startDate = new Date();
    
    switch (preset) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    setDateRange({ startDate, endDate });
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setData(generateMockData());
      setLoading(false);
    }, 800);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Conversations', 'Visitors', 'Leads'].join(','),
      ...data.timeSeriesData.map(row => 
        [row.date, row.conversations, row.visitors, row.leads].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    alert('PDF export would be implemented with a library like jsPDF or react-pdf');
  };

  const getPeakHourIntensity = (count: number): string => {
    const maxCount = Math.max(...data.peakHoursData.map(d => d.count));
    const intensity = count / maxCount;
    if (intensity > 0.8) return 'bg-orange-600';
    if (intensity > 0.6) return 'bg-orange-500';
    if (intensity > 0.4) return 'bg-orange-400';
    if (intensity > 0.2) return 'bg-orange-300';
    return 'bg-orange-100';
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-2 md:px-0">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl md:rounded-2xl p-4 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-amber-500/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-500/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-emerald-400 text-sm font-medium">Live Data</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-white via-orange-100 to-amber-200 bg-clip-text text-transparent">
            Advanced Analytics
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-lg">{currentDate}</p>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 md:mt-6">
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
              {['7d', '30d', '90d', '1y'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetChange(preset)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    selectedPreset === preset
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {preset === '7d' ? '7 Days' : preset === '30d' ? '30 Days' : preset === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
              <Calendar size={16} className="text-slate-400" />
              <input
                type="date"
                value={dateRange.startDate.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                className="bg-transparent text-slate-300 text-sm outline-none"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={dateRange.endDate.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                className="bg-transparent text-slate-300 text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition"
          >
            <Download size={16} />
            <span className="text-sm font-medium">Export CSV</span>
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition"
          >
            <FileText size={16} />
            <span className="text-sm font-medium">Export PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          icon={MessageSquare}
          label="Total Conversations"
          value={data.metrics.totalConversations.toLocaleString()}
          change={data.metrics.conversationGrowth}
          loading={loading}
        />
        <MetricCard
          icon={Users}
          label="Unique Visitors"
          value={data.metrics.uniqueVisitors.toLocaleString()}
          change={data.metrics.visitorGrowth}
          loading={loading}
        />
        <MetricCard
          icon={Target}
          label="Leads Generated"
          value={data.metrics.leadsGenerated.toLocaleString()}
          change={data.metrics.leadGrowth}
          loading={loading}
        />
        <MetricCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${data.metrics.conversionRate}%`}
          change={data.metrics.conversionGrowth}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <PremiumCard className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Activity size={18} className="text-white" />
            </div>
            <h3 className="font-bold text-slate-800">Conversations Over Time</h3>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader className="animate-spin text-slate-400" size={32} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="conversations"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>

        <PremiumCard className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
              <BarChart3 size={18} className="text-white" />
            </div>
            <h3 className="font-bold text-slate-800">Leads by Source</h3>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader className="animate-spin text-slate-400" size={32} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.leadsBySource} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis dataKey="source" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="leads" fill="url(#leadGradient)" radius={[0, 4, 4, 0]} />
                <defs>
                  <linearGradient id="leadGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>

        <PremiumCard className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <PieChartIcon size={18} className="text-white" />
            </div>
            <h3 className="font-bold text-slate-800">Sentiment Breakdown</h3>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader className="animate-spin text-slate-400" size={32} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {data.sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>

        <PremiumCard className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
              <Clock size={18} className="text-white" />
            </div>
            <h3 className="font-bold text-slate-800">Session Duration Trends</h3>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader className="animate-spin text-slate-400" size={32} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.sessionDurationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit=" min" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [`${value} min`, 'Avg Duration']}
                />
                <defs>
                  <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="avgDuration"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#durationGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </PremiumCard>
      </div>

      <PremiumCard className="overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
              <Zap size={18} className="text-white" />
            </div>
            <h3 className="font-bold text-slate-800">Top Intents</h3>
          </div>
        </div>
        
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Intent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Percentage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Trend</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {data.topIntents.map((intent) => (
                    <tr key={intent.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900">{intent.intent}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {intent.count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                              style={{ width: `${intent.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600">{intent.percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          intent.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                          intent.trend === 'down' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {intent.trend === 'up' && <ArrowUp size={12} />}
                          {intent.trend === 'down' && <ArrowDown size={12} />}
                          {intent.trend === 'up' ? 'Increasing' : intent.trend === 'down' ? 'Decreasing' : 'Stable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="block md:hidden space-y-3 p-3">
              {data.topIntents.map((intent) => (
                <div key={intent.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-slate-900">{intent.intent}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      intent.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                      intent.trend === 'down' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {intent.trend === 'up' && <ArrowUp size={12} />}
                      {intent.trend === 'down' && <ArrowDown size={12} />}
                      {intent.trend === 'up' ? 'Up' : intent.trend === 'down' ? 'Down' : 'Stable'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                    <span>Count: {intent.count.toLocaleString()}</span>
                    <span>{intent.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      style={{ width: `${intent.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </PremiumCard>

      <PremiumCard className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg">
            <Clock size={18} className="text-white" />
          </div>
          <h3 className="font-bold text-slate-800">Peak Activity Hours</h3>
          <span className="text-xs text-slate-500 ml-2">Hover for details</span>
        </div>
        
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader className="animate-spin text-slate-400" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex">
                <div className="w-12"></div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="flex-1 text-center text-xs font-medium text-slate-600 pb-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="space-y-1">
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="flex items-center">
                    <div className="w-12 text-xs text-slate-500 text-right pr-2">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 flex gap-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                        const hourData = data.peakHoursData.find(d => d.hour === hour && d.day === day);
                        const count = hourData?.count || 0;
                        return (
                          <div
                            key={day}
                            className={`flex-1 h-5 rounded ${getPeakHourIntensity(count)} cursor-pointer transition-all hover:ring-2 hover:ring-orange-400`}
                            title={`${day} ${hour}:00 - ${count} sessions`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-200">
                <span className="text-xs text-slate-500">Low</span>
                <div className="flex gap-1">
                  {['bg-orange-100', 'bg-orange-300', 'bg-orange-400', 'bg-orange-500', 'bg-orange-600'].map((color, i) => (
                    <div key={i} className={`w-6 h-4 rounded ${color}`} />
                  ))}
                </div>
                <span className="text-xs text-slate-500">High</span>
              </div>
            </div>
          </div>
        )}
      </PremiumCard>
    </div>
  );
};
