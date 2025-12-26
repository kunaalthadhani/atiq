import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Users, FileText, 
  Receipt, Wallet, Calendar, X, Bell, LogOut, CheckCircle, Key
} from 'lucide-react';
import { dataService } from '@/services/dataService';
import { Reminder } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import SupabaseWarning from './SupabaseWarning';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Contracts', href: '/contracts', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Payments', href: '/payments', icon: Wallet },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Approvals', href: '/approvals', icon: CheckCircle, adminOnly: true },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    loadReminders();
    const interval = setInterval(loadReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    try {
      // Handle both async (Supabase) and sync (localStorage) versions
      if (typeof (dataService as any).getActiveReminders === 'function') {
        const result = (dataService as any).getActiveReminders();
        if (result instanceof Promise) {
          const activeReminders = await result;
          setReminders(activeReminders);
        } else {
          setReminders(result);
        }
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]);
    }
  };

  const dismissReminder = async (id: string) => {
    try {
      await dataService.dismissReminder(id);
      loadReminders();
    } catch (error) {
      console.error('Error dismissing reminder:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SupabaseWarning />
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">PropTrack</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              // Hide admin-only items for non-admin users
              if (item.adminOnly && user?.role !== 'admin') {
                return null;
              }
              
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Info & Sign Out */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            {user && (
              <div className="px-3 py-2 text-xs text-gray-600">
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-gray-500">{user.email}</div>
              </div>
            )}
            <Link
              to="/password"
              className={cn(
                'w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                location.pathname === '/password'
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <Key className="w-4 h-4 mr-3" />
              Password
            </Link>
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Persistent reminders */}
        {reminders.length > 0 && (
          <div className="fixed top-4 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto space-y-2">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="bg-warning-50 border-l-4 border-warning-500 p-4 rounded-lg shadow-lg animate-pulse"
              >
                <div className="flex items-start">
                  <Bell className="w-5 h-5 text-warning-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warning-900">
                      Payment Reminder
                    </p>
                    <p className="text-sm text-warning-700 mt-1">
                      {reminder.message}
                    </p>
                  </div>
                  <button
                    onClick={() => dismissReminder(reminder.id)}
                    className="ml-3 flex-shrink-0 text-warning-600 hover:text-warning-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

