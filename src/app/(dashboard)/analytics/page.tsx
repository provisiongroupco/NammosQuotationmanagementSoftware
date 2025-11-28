'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { getAnalytics, type AnalyticsData } from '@/lib/supabase/queries';

const statusColors = {
  draft: '#6b7280',
  sent: '#3b82f6',
  approved: '#22c55e',
  rejected: '#ef4444',
};

const materialTypeColors = {
  fabric: '#C4A962',
  leather: '#8B4513',
  wood: '#D2691E',
  metal: '#708090',
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      const data = await getAnalytics();
      setAnalytics(data);
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-nammos-muted">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-nammos-muted">Unable to load analytics</p>
      </div>
    );
  }

  const conversionRate = analytics.totalQuotations > 0
    ? ((analytics.approvedQuotations / analytics.totalQuotations) * 100).toFixed(1)
    : '0';

  const avgOrderValue = analytics.approvedQuotations > 0
    ? analytics.totalRevenue / analytics.approvedQuotations
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-nammos-cream flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-nammos-muted mt-1">
            Track your business performance and insights
          </p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-nammos-charcoal text-nammos-muted hover:text-nammos-cream'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`AED ${analytics.totalRevenue.toLocaleString()}`}
          change={analytics.revenueChange}
          icon={DollarSign}
          iconBg="bg-primary/20"
          iconColor="text-primary"
        />
        <MetricCard
          title="Quotations"
          value={analytics.totalQuotations.toString()}
          change={analytics.quotationsChange}
          icon={FileText}
          iconBg="bg-blue-500/20"
          iconColor="text-blue-400"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          change={analytics.conversionChange}
          icon={CheckCircle2}
          iconBg="bg-success/20"
          iconColor="text-success"
        />
        <MetricCard
          title="Avg Order Value"
          value={`AED ${avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          change={analytics.aovChange}
          icon={TrendingUp}
          iconBg="bg-purple-500/20"
          iconColor="text-purple-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-nammos-charcoal rounded-xl p-6 border border-border">
          <h3 className="text-lg font-medium text-nammos-cream mb-4">Revenue Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.revenueTrend}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C4A962" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C4A962" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 12 }}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#F2EADE' }}
                  formatter={(value: number) => [`AED ${value.toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#C4A962"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-nammos-charcoal rounded-xl p-6 border border-border">
          <h3 className="text-lg font-medium text-nammos-cream mb-4">Quotation Status</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {analytics.statusBreakdown.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={statusColors[entry.status as keyof typeof statusColors]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {analytics.statusBreakdown.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: statusColors[item.status as keyof typeof statusColors] }}
                />
                <span className="text-sm text-nammos-muted capitalize">{item.status}</span>
                <span className="text-sm font-medium text-nammos-cream ml-auto">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-nammos-charcoal rounded-xl p-6 border border-border">
          <h3 className="text-lg font-medium text-nammos-cream mb-4">Top Products</h3>
          {analytics.topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-nammos-muted">
              No product data available yet
            </div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value, 'Units Quoted']}
                  />
                  <Bar dataKey="count" fill="#C4A962" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Popular Materials */}
        <div className="bg-nammos-charcoal rounded-xl p-6 border border-border">
          <h3 className="text-lg font-medium text-nammos-cream mb-4">Popular Materials</h3>
          {analytics.popularMaterials.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-nammos-muted">
              No material data available yet
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.popularMaterials.map((material, index) => (
                <div key={material.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-nammos-muted">{index + 1}.</span>
                      <span className="text-nammos-cream">{material.name}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{
                          backgroundColor: `${materialTypeColors[material.type as keyof typeof materialTypeColors]}20`,
                          color: materialTypeColors[material.type as keyof typeof materialTypeColors],
                        }}
                      >
                        {material.type}
                      </span>
                    </div>
                    <span className="text-nammos-muted">{material.count} uses</span>
                  </div>
                  <div className="h-2 bg-nammos-dark rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(material.count / analytics.popularMaterials[0].count) * 100}%`,
                        backgroundColor: materialTypeColors[material.type as keyof typeof materialTypeColors],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers */}
        <div className="bg-nammos-charcoal rounded-xl p-6 border border-border">
          <h3 className="text-lg font-medium text-nammos-cream mb-4">Top Customers</h3>
          {analytics.topCustomers.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-nammos-muted">
              No customer data yet
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.topCustomers.map((customer, index) => (
                <div
                  key={customer.name}
                  className="flex items-center justify-between p-3 bg-nammos-dark rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-nammos-cream font-medium">{customer.name}</p>
                      <p className="text-xs text-nammos-muted">{customer.quotations} quotations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-medium">
                      AED {customer.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CBM Metrics */}
        <div className="bg-nammos-charcoal rounded-xl p-6 border border-border">
          <h3 className="text-lg font-medium text-nammos-cream mb-4">Logistics Overview</h3>
          <div className="space-y-6">
            <div className="text-center p-6 bg-nammos-dark rounded-lg">
              <Package className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold text-nammos-cream">
                {analytics.totalCBM.toFixed(2)}
              </p>
              <p className="text-nammos-muted text-sm">Total CBM Quoted</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-nammos-dark rounded-lg">
                <p className="text-xl font-bold text-nammos-cream">
                  {analytics.avgCBMPerQuotation.toFixed(2)}
                </p>
                <p className="text-nammos-muted text-xs">Avg CBM/Quote</p>
              </div>
              <div className="text-center p-4 bg-nammos-dark rounded-lg">
                <p className="text-xl font-bold text-nammos-cream">
                  {analytics.totalItems}
                </p>
                <p className="text-nammos-muted text-xs">Total Items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-nammos-charcoal rounded-xl p-6 border border-border">
          <h3 className="text-lg font-medium text-nammos-cream mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <QuickStat
              icon={Clock}
              label="Pending Quotations"
              value={analytics.pendingQuotations.toString()}
              color="text-yellow-400"
              bgColor="bg-yellow-400/20"
            />
            <QuickStat
              icon={Send}
              label="Sent This Month"
              value={analytics.sentThisMonth.toString()}
              color="text-blue-400"
              bgColor="bg-blue-400/20"
            />
            <QuickStat
              icon={CheckCircle2}
              label="Approved This Month"
              value={analytics.approvedThisMonth.toString()}
              color="text-success"
              bgColor="bg-success/20"
            />
            <QuickStat
              icon={XCircle}
              label="Rejection Rate"
              value={`${analytics.rejectionRate.toFixed(1)}%`}
              color="text-destructive"
              bgColor="bg-destructive/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  const isPositive = change >= 0;

  return (
    <div className="bg-nammos-charcoal rounded-xl p-6 border border-border">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div
          className={`flex items-center gap-1 text-sm ${
            isPositive ? 'text-success' : 'text-destructive'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-nammos-cream">{value}</p>
        <p className="text-sm text-nammos-muted mt-1">{title}</p>
      </div>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-nammos-dark rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <span className="text-nammos-muted text-sm">{label}</span>
      </div>
      <span className="text-nammos-cream font-medium">{value}</span>
    </div>
  );
}
