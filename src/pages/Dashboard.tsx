import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Home, Users, FileText, TrendingUp,
  AlertCircle, Wallet, Calendar, Plus, Receipt, BarChart as BarChartIcon, PieChart as PieChartIcon, Filter
} from 'lucide-react';
import { subMonths, subYears, startOfMonth, endOfMonth, format, isWithinInterval } from 'date-fns';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { dataService } from '@/services/dataService';
import { DashboardStats, InvoiceWithDetails, Property, Unit } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdueInvoices, setOverdueInvoices] = useState<InvoiceWithDetails[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [dateFilter, setDateFilter] = useState<'last_month' | 'last_3_months' | 'last_6_months' | 'past_year' | 'custom'>('last_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateFilter) {
      case 'last_month':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'last_3_months':
        startDate = startOfMonth(subMonths(now, 3));
        endDate = now;
        break;
      case 'last_6_months':
        startDate = startOfMonth(subMonths(now, 6));
        endDate = now;
        break;
      case 'past_year':
        startDate = startOfMonth(subMonths(now, 12));
        endDate = now;
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); // End of day
        } else {
          // Default to last month if custom dates not set
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
        }
        break;
      default:
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
    }

    return { startDate, endDate };
  };

  const loadData = async () => {
    try {
      const dashboardStats = await dataService.getDashboardStats();
      const overdue = await dataService.getOverdueInvoices();
      const allInvoices = await dataService.getInvoices();
      const allProperties = await dataService.getProperties();
      const allUnits = await dataService.getUnits();
      
      setStats(dashboardStats);
      setOverdueInvoices(overdue);
      setInvoices(allInvoices);
      setProperties(allProperties);
      setUnits(allUnits);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  if (!stats) {
    return <div className="p-6">Loading...</div>;
  }

  // Get date range
  const { startDate, endDate } = getDateRange();

  // Filter invoices by date range
  const filteredInvoices = invoices.filter(invoice => {
    const invoiceDate = new Date(invoice.dueDate);
    return isWithinInterval(invoiceDate, { start: startDate, end: endDate });
  });

  const filteredOverdueInvoices = overdueInvoices.filter(invoice => {
    const invoiceDate = new Date(invoice.dueDate);
    return isWithinInterval(invoiceDate, { start: startDate, end: endDate });
  });

  // Generate monthly revenue data based on date range
  const generateMonthlyRevenue = () => {
    const months: { month: string; billed: number; collected: number }[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const monthKey = format(current, 'MMM');
      months.push({ month: monthKey, billed: 0, collected: 0 });
      current.setMonth(current.getMonth() + 1);
    }

    // Calculate actual revenue from filtered invoices
    filteredInvoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.dueDate);
      const monthKey = format(invoiceDate, 'MMM');
      const monthIndex = months.findIndex(m => m.month === monthKey);
      if (monthIndex !== -1) {
        months[monthIndex].billed += invoice.amount;
        months[monthIndex].collected += invoice.paidAmount;
      }
    });

    return months;
  };

  const monthlyRevenue = generateMonthlyRevenue();
  const paidCount = filteredInvoices.filter(i => i.status === 'paid').length;
  const overdueCount = filteredOverdueInvoices.length;

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">Welcome back! Here's your portfolio overview.</p>
        </div>
        <div className="text-gray-500 text-sm">
          {currentDate}
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-5 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
          </div>
          
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as any);
              if (e.target.value !== 'custom') {
                setCustomStartDate('');
                setCustomEndDate('');
              }
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
          >
            <option value="last_month">Last Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="past_year">Past Year</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateFilter === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </>
          )}

          <div className="text-xs text-gray-500 ml-auto">
            Showing: {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Link
          to="/properties"
          className="flex items-center px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors shadow-sm text-sm font-medium"
        >
          <Building2 className="w-4 h-4 mr-2" />
          <span>Add Property</span>
        </Link>

        <Link
          to="/tenants"
          className="flex items-center px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors shadow-sm text-sm font-medium"
        >
          <Users className="w-4 h-4 mr-2" />
          <span>Add Tenant</span>
        </Link>

        <Link
          to="/contracts"
          className="flex items-center px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors shadow-sm text-sm font-medium"
        >
          <FileText className="w-4 h-4 mr-2" />
          <span>New Contract</span>
        </Link>

        <Link
          to="/payments"
          className="flex items-center px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors shadow-sm text-sm font-medium"
        >
          <Wallet className="w-4 h-4 mr-2" />
          <span>Record Payment</span>
        </Link>

        <Link
          to="/calendar"
          className="flex items-center px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors shadow-sm text-sm font-medium"
        >
          <Calendar className="w-4 h-4 mr-2" />
          <span>Calendar</span>
        </Link>
      </div>

      {/* Overdue Payments Alert */}
      {filteredOverdueInvoices.length > 0 && (
        <div className="bg-pink-50 border border-red-200 rounded-lg p-5 mb-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900 text-base mb-1">
                  {filteredOverdueInvoices.length} Overdue Payments Require Attention
                </h3>
                <p className="text-red-800 text-sm mb-3">
                  Total overdue: <span className="font-bold">AED {filteredOverdueInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0).toLocaleString()}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredOverdueInvoices.slice(0, 3).map((invoice) => (
                    <div key={invoice.id} className="bg-white px-3 py-1.5 rounded border border-red-100">
                      <span className="font-semibold text-gray-900 text-sm">{invoice.invoiceNumber}</span>
                      <span className="text-red-600 ml-2 text-sm font-medium">AED {invoice.remainingAmount.toLocaleString()}</span>
                    </div>
                  ))}
                  {filteredOverdueInvoices.length > 3 && (
                    <div className="bg-white px-3 py-1.5 rounded border border-red-100">
                      <span className="text-gray-700 text-sm">+{filteredOverdueInvoices.length - 3} more</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Link
              to="/invoices?status=overdue"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm whitespace-nowrap ml-4"
            >
              View All Overdue
            </Link>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {/* Total Collected */}
        <div className="bg-green-500 rounded-xl p-6 shadow-md text-white relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-20">
            <Wallet className="w-16 h-16" />
          </div>
          <h3 className="text-white text-sm font-medium mb-2 opacity-90">Total Collected</h3>
          <p className="text-3xl font-bold mb-1">AED {filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}</p>
          <div className="flex items-center text-sm opacity-90">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>{filteredInvoices.length > 0 ? ((filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0) / filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0)) * 100).toFixed(0) : 0}% collection rate</span>
          </div>
        </div>

        {/* Outstanding */}
        <div className="bg-orange-500 rounded-xl p-6 shadow-md text-white relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-20">
            <Receipt className="w-16 h-16" />
          </div>
          <h3 className="text-white text-sm font-medium mb-2 opacity-90">Outstanding</h3>
          <p className="text-3xl font-bold mb-1">AED {filteredInvoices.filter(i => i.status === 'pending' || i.status === 'partial' || i.status === 'overdue').reduce((sum, inv) => sum + inv.remainingAmount, 0).toLocaleString()}</p>
          <div className="flex items-center text-sm opacity-90">
            <Receipt className="w-4 h-4 mr-1" />
            <span>{filteredInvoices.filter(i => i.status === 'pending' || i.status === 'partial' || i.status === 'overdue').length} pending invoices</span>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-blue-500 rounded-xl p-6 shadow-md text-white relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-20">
            <Home className="w-16 h-16" />
          </div>
          <h3 className="text-white text-sm font-medium mb-2 opacity-90">Occupancy Rate</h3>
          <p className="text-3xl font-bold mb-1">{stats.occupancyRate.toFixed(0)}%</p>
          <div className="flex items-center text-sm opacity-90">
            <Home className="w-4 h-4 mr-1" />
            <span>{stats.occupiedUnits}/{stats.totalUnits} units occupied</span>
          </div>
        </div>

        {/* Active Contracts */}
        <div className="bg-purple-500 rounded-xl p-6 shadow-md text-white relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-20">
            <FileText className="w-16 h-16" />
          </div>
          <h3 className="text-white text-sm font-medium mb-2 opacity-90">Active Contracts</h3>
          <p className="text-3xl font-bold mb-1">{stats.activeContracts}</p>
          <div className="flex items-center text-sm opacity-90">
            <Users className="w-4 h-4 mr-1" />
            <span>{stats.activeTenants} tenants</span>
          </div>
        </div>
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-5">
        {/* Revenue Overview */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Revenue Overview</h3>
              <p className="text-sm text-gray-500">Billed vs Collected (Last 6 months)</p>
            </div>
            <BarChartIcon className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="billed" fill="#94a3b8" name="Billed" />
              <Bar dataKey="collected" fill="#14b8a6" name="Collected" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Invoice Status */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Invoice Status</h3>
              <p className="text-sm text-gray-500">Distribution breakdown</p>
            </div>
            <PieChartIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Paid', value: paidCount, color: '#14b8a6' },
                    { name: 'Overdue', value: overdueCount, color: '#ef4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {[
                    { name: 'Paid', value: paidCount, color: '#14b8a6' },
                    { name: 'Overdue', value: overdueCount, color: '#ef4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#14b8a6' }}></div>
              <span className="text-sm text-gray-600">Paid ({paidCount})</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <span className="text-sm text-gray-600">Overdue ({overdueCount})</span>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 text-lg">Recent Invoices</h3>
            <Link to="/invoices" className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center">
              View All
              <TrendingUp className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-4">
            {filteredOverdueInvoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">Due {formatDate(invoice.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">AED {invoice.remainingAmount.toLocaleString()}</p>
                  <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                    Overdue
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Property Occupancy */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="font-semibold text-gray-900 text-lg mb-6">Property Occupancy</h3>
          <div className="space-y-6">
            {properties.map((property) => {
              const propertyUnits = units.filter(u => u.propertyId === property.id);
              const occupiedCount = propertyUnits.filter(u => u.isOccupied).length;
              const totalCount = propertyUnits.length;
              const percentage = totalCount > 0 ? (occupiedCount / totalCount) * 100 : 0;

              return (
                <div key={property.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-green-600 mr-2" />
                      <span className="font-medium text-gray-900">{property.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{occupiedCount}/{totalCount}</span>
                      <span className="font-semibold text-gray-900">{percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: '#14b8a6' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
