import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CategoryBreakdownItem } from '../types';

interface CategoryChartProps {
  data: CategoryBreakdownItem[];
}

export const CategoryVulnerabilityChart: React.FC<CategoryChartProps> = ({ data }) => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 14, right: 16, left: -12, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
          <XAxis
            dataKey="category"
            stroke="#A1A1AA"
            tick={{ fill: '#FFFFFF', fontSize: 11 }}
            angle={-15}
            textAnchor="end"
            height={52}
          />
          <YAxis
            stroke="#A1A1AA"
            tick={{ fill: '#FFFFFF', fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0D0D0F',
              border: '1px solid #FFD444',
              borderRadius: '10px',
              color: '#FFFFFF',
              fontSize: '12px',
            }}
          />
          <Legend
            wrapperStyle={{
              color: '#FFFFFF',
              fontSize: '12px',
              paddingTop: '8px',
            }}
          />
          <Bar
            dataKey="successful_attacks"
            name="Exploited (Boundary Breached)"
            fill="#FFD444"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="blocked_or_safe"
            name="Defended / Blocked by Policy"
            fill="#27272A"
            stroke="#FFD444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface SeverityChartProps {
  distribution: Record<'Critical' | 'High' | 'Medium' | 'Low', number>;
}

export const SeverityDistributionChart: React.FC<SeverityChartProps> = ({ distribution }) => {
  const rows = [
    { name: 'Critical', count: distribution.Critical || 0, fill: '#FFD444' },
    { name: 'High', count: distribution.High || 0, fill: '#E2B93B' },
    { name: 'Medium', count: distribution.Medium || 0, fill: '#8A7020' },
    { name: 'Low', count: distribution.Low || 0, fill: '#3F3F46' },
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 12, right: 20, left: 20, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" />
          <XAxis
            type="number"
            stroke="#A1A1AA"
            tick={{ fill: '#FFFFFF', fontSize: 11 }}
            allowDecimals={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            stroke="#A1A1AA"
            tick={{ fill: '#FFFFFF', fontSize: 12 }}
            width={75}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0D0D0F',
              border: '1px solid #FFD444',
              borderRadius: '10px',
              color: '#FFFFFF',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="count" name="Findings Count" radius={[0, 4, 4, 0]}>
            {rows.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
