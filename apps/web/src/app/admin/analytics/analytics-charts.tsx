'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ---------------------------------------------------------------------------
// Time-series Area Chart
// ---------------------------------------------------------------------------

interface DailyDataPoint {
  date: string;
  events: number;
  conversions: number;
  searches: number;
}

export function EventTrendChart({ data }: { data: DailyDataPoint[] }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900">
      <div className="mb-6">
        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          Event Trends
        </h4>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Daily activity over the last 30 days
        </p>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradConversions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSearches" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}
            />
            <Area
              type="monotone"
              dataKey="events"
              stroke="#0f172a"
              strokeWidth={2}
              fill="url(#gradEvents)"
              name="All Events"
            />
            <Area
              type="monotone"
              dataKey="conversions"
              stroke="#16a34a"
              strokeWidth={2}
              fill="url(#gradConversions)"
              name="Conversions"
            />
            <Area
              type="monotone"
              dataKey="searches"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#gradSearches)"
              name="Searches"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-center gap-6">
        <Legend color="#0f172a" label="All Events" />
        <Legend color="#16a34a" label="Conversions" />
        <Legend color="#2563eb" label="Searches" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversion Funnel Bar Chart
// ---------------------------------------------------------------------------

interface FunnelStep {
  name: string;
  value: number;
  fill: string;
}

export function ConversionFunnelChart({ data }: { data: FunnelStep[] }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900">
      <div className="mb-6">
        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          Conversion Funnel
        </h4>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          User journey from view to booking
        </p>
      </div>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                color: '#e2e8f0',
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Distribution Pie Chart
// ---------------------------------------------------------------------------

interface PieSlice {
  name: string;
  value: number;
  fill: string;
}

export function EventDistributionChart({ data }: { data: PieSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900">
      <div className="mb-6">
        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          Event Distribution
        </h4>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Breakdown by interaction type
        </p>
      </div>
      <div className="flex items-center gap-6">
        <div className="h-[200px] w-[200px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#e2e8f0',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {data.map((slice) => (
            <div key={slice.name} className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: slice.fill }}
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {slice.name}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {total > 0 ? ((slice.value / total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}
