import React, { useMemo, useState, useEffect } from 'react';
import { SalesRecord } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, ShoppingBag, Landmark, ArrowUpRight, CheckCircle, Info } from 'lucide-react';

interface SalesChartsProps {
  records: SalesRecord[];
}

const COLORS = ['#10b981', '#2563eb', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function SalesCharts({ records }: SalesChartsProps) {
  const metricMode = 'UNITS';
  
  const totalUnits = useMemo(() => {
    return records.reduce((sum, r) => sum + r.units, 0);
  }, [records]);
  
  // 1. Group by Month for Trend
  const monthlyTrendData = useMemo(() => {
    const monthsGrouped: Record<string, { monthKey: string; dateObj: Date; revenue: number; units: number }> = {};
    
    records.forEach(r => {
      const year = r.date.getFullYear();
      const month = r.date.getMonth();
      const monthName = r.date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const key = `${year}-${String(month).padStart(2, '0')}`;
      
      if (!monthsGrouped[key]) {
        monthsGrouped[key] = {
          monthKey: monthName,
          dateObj: new Date(year, month, 1),
          revenue: 0,
          units: 0
        };
      }
      monthsGrouped[key].revenue += r.amount;
      monthsGrouped[key].units += r.units;
    });

    // Sort chronologically
    return Object.values(monthsGrouped).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [records]);

  // 2. Group by Portal
  const portalData = useMemo(() => {
    const portalGrouped: Record<string, { name: string; revenue: number; units: number }> = {};
    
    records.forEach(r => {
      const portal = r.portal;
      if (!portalGrouped[portal]) {
        portalGrouped[portal] = { name: portal, revenue: 0, units: 0 };
      }
      portalGrouped[portal].revenue += r.amount;
      portalGrouped[portal].units += r.units;
    });

    return Object.values(portalGrouped).sort((a, b) => {
      return metricMode === 'UNITS' ? b.units - a.units : b.revenue - a.revenue;
    });
  }, [records, metricMode]);

  // 3. Group by Product
  const productData = useMemo(() => {
    const productGrouped: Record<string, { name: string; revenue: number; units: number }> = {};
    
    records.forEach(r => {
      const product = r.product;
      if (!productGrouped[product]) {
        productGrouped[product] = { name: product, revenue: 0, units: 0 };
      }
      productGrouped[product].revenue += r.amount;
      productGrouped[product].units += r.units;
    });

    return Object.values(productGrouped).sort((a, b) => {
      return metricMode === 'UNITS' ? b.units - a.units : b.revenue - a.revenue;
    }).slice(0, 8); // Top 8 products
  }, [records, metricMode]);

  // Helper to format currency
  const formatCurrency = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    } else if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} L`;
    } else if (val >= 1000) {
      return `₹${(val / 1000).toFixed(0)}k`;
    }
    return `₹${val}`;
  };

  // Format units nicely
  const formatUnits = (val: number) => {
    if (val >= 100000) {
      return `${(val / 1000).toFixed(1)}k units`;
    }
    return `${val.toLocaleString('en-IN')} units`;
  };

  const avgMonthlyUnits = useMemo(() => {
    if (monthlyTrendData.length === 0) return 0;
    return Math.round(totalUnits / monthlyTrendData.length);
  }, [totalUnits, monthlyTrendData]);

  return (
    <div id="sales-charts-container" className="space-y-6">
      
      {/* KPI Cards */}
      <div id="kpi-cards-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-lg flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Units Sold</span>
            <h4 className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{totalUnits.toLocaleString('en-IN')}</h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-0.5 mt-1.5 uppercase tracking-wide">
              Primary calculation metric
            </span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShoppingBag size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-lg flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Average Monthly Units</span>
            <h4 className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
              {avgMonthlyUnits.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-0.5 mt-1.5 uppercase tracking-wide">
              Run rate over active months
            </span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-lg flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Transaction Rows</span>
            <h4 className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">{records.length.toLocaleString('en-IN')}</h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-0.5 mt-1.5 uppercase tracking-wide">
              Logged transaction points
            </span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Landmark size={22} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div id="charts-main-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart */}
        <div id="trend-chart-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 md:p-6 lg:col-span-2 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Monthly Units Sold Trend
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Timeline overview showing monthly performance fluctuations</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricMode === 'UNITS' ? '#10b981' : '#2563eb'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={metricMode === 'UNITS' ? '#10b981' : '#2563eb'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis 
                  dataKey="monthKey" 
                  stroke="var(--chart-text)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="var(--chart-text)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={metricMode === 'UNITS' ? (val) => val.toLocaleString('en-IN') : formatCurrency} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--chart-bg)', borderColor: 'var(--chart-border)', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}
                  labelStyle={{ color: 'var(--chart-tooltip-label)', fontWeight: 'bold', fontFamily: 'monospace' }}
                  itemStyle={{ color: metricMode === 'UNITS' ? '#10b981' : '#2563eb', fontSize: '12px' }}
                  formatter={(value: any) => [
                    metricMode === 'UNITS' ? `${Number(value).toLocaleString('en-IN')} units` : `₹${Number(value).toLocaleString('en-IN')}`,
                    metricMode === 'UNITS' ? 'Units Sold' : 'Revenue'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey={metricMode === 'UNITS' ? 'units' : 'revenue'} 
                  stroke={metricMode === 'UNITS' ? '#10b981' : '#2563eb'} 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorTrend)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portal breakdown */}
        <div id="portal-chart-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 md:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Portal Share Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Marketplace portal contribution based on quantity
              </p>
            </div>
            <div className="h-[200px] flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="units"
                  >
                    {portalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--chart-bg)', borderColor: 'var(--chart-border)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '11px', color: 'var(--chart-tooltip-label)' }}
                    formatter={(value: any) => [
                      `${Number(value).toLocaleString('en-IN')} units`,
                      'Quantity'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Active channels</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{portalData.length} Portals</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {portalData.slice(0, 4).map((entry, index) => {
              const totalVal = totalUnits;
              const entryVal = entry.units;
              const percentage = totalVal > 0 ? ((entryVal / totalVal) * 100).toFixed(0) : '0';
              
              return (
                <div key={entry.name} className="flex items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{entry.name}</p>
                    <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {percentage}% ({entry.units.toLocaleString('en-IN')} units)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product Sales Bar Chart */}
        <div id="product-chart-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 md:p-6 lg:col-span-3 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Product Performance (Units Sold Comparison)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Top-performing products ordered by units sold</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--chart-text)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(name) => name.length > 15 ? `${name.substring(0, 15)}...` : name}
                />
                <YAxis 
                  stroke="var(--chart-text)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => val.toLocaleString('en-IN')} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--chart-bg)', borderColor: 'var(--chart-border)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '11px', color: 'var(--chart-tooltip-label)' }}
                  formatter={(value: any) => [`${value.toLocaleString('en-IN')} units`, 'Units Sold']}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'var(--chart-text)' }}
                  formatter={() => 'Units Sold'}
                />
                <Bar dataKey="units" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

