import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { InvoiceWithDetails } from '@/types';
import { formatCurrency, getStatusColor, cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, format, isSameMonth, isSameDay, isToday } from 'date-fns';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<InvoiceWithDetails[]>([]);

  useEffect(() => {
    loadInvoices();
  }, [currentMonth]);

  const loadInvoices = async () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    try {
      const data = await dataService.getInvoicesByDateRange(calendarStart, calendarEnd);
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    }
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const today = () => {
    setCurrentMonth(new Date());
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">View invoice due dates by calendar</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={today}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 gap-2 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const getInvoicesForDate = (date: Date) => {
    return invoices.filter(invoice => isSameDay(invoice.dueDate, date));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedInvoices(getInvoicesForDate(date));
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayInvoices = getInvoicesForDate(currentDay);
        const isCurrentMonth = isSameMonth(currentDay, monthStart);
        const isTodayDate = isToday(currentDay);
        const isSelected = selectedDate && isSameDay(currentDay, selectedDate);

        days.push(
          <div
            key={currentDay.toString()}
            onClick={() => handleDateClick(currentDay)}
            className={cn(
              'min-h-[120px] border border-gray-200 rounded-lg p-2 cursor-pointer transition-all',
              isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50',
              isTodayDate && 'ring-2 ring-primary-500',
              isSelected && 'bg-primary-50'
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={cn(
                'text-sm font-medium',
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                isTodayDate && 'bg-primary-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
              )}>
                {format(currentDay, 'd')}
              </span>
              {dayInvoices.length > 0 && (
                <span className="text-xs font-semibold text-gray-500">
                  {dayInvoices.length}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {dayInvoices.slice(0, 3).map((invoice) => (
                <div
                  key={invoice.id}
                  className={cn(
                    'text-xs p-1 rounded truncate',
                    getStatusColor(invoice.status)
                  )}
                  title={`${invoice.tenant.firstName} ${invoice.tenant.lastName} - ${invoice.invoiceNumber}`}
                >
                  {invoice.tenant.firstName} {invoice.tenant.lastName[0]}.
                </div>
              ))}
              {dayInvoices.length > 3 && (
                <div className="text-xs text-gray-500 font-medium">
                  +{dayInvoices.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-2">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-2">{rows}</div>;
  };

  return (
    <div className="p-8 max-w-[1800px] mx-auto">
      {renderHeader()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          {renderDays()}
          {renderCells()}
        </div>

        {/* Selected Date Details */}
        <div className="bg-white rounded-xl shadow-md p-6">
          {selectedDate ? (
            <>
              <div className="flex items-center mb-6">
                <CalendarIcon className="w-6 h-6 text-primary-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''} due
                  </p>
                </div>
              </div>

              {selectedInvoices.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {selectedInvoices.map((invoice) => (
                    <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {invoice.tenant.firstName} {invoice.tenant.lastName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {invoice.property.name} - Unit {invoice.unit.unitNumber}
                          </p>
                        </div>
                        <span className={cn('px-2 py-1 rounded-full text-xs font-semibold', getStatusColor(invoice.status))}>
                          {invoice.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Invoice:</span>
                          <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Amount:</span>
                          <span className="font-medium text-gray-900">{formatCurrency(invoice.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Remaining:</span>
                          <span className={cn('font-medium', invoice.remainingAmount > 0 ? 'text-danger-600' : 'text-success-600')}>
                            {formatCurrency(invoice.remainingAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Installment:</span>
                          <span className="font-medium text-gray-900">
                            {invoice.installmentNumber}/{invoice.contract.numberOfInstallments}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No invoices due on this date</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Date</h3>
              <p className="text-gray-600">Click on a date to view invoices</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {(() => {
          const monthInvoices = invoices.filter(inv => isSameMonth(inv.dueDate, currentMonth));
          const paid = monthInvoices.filter(inv => inv.status === 'paid');
          const pending = monthInvoices.filter(inv => inv.status === 'pending');
          const overdue = monthInvoices.filter(inv => inv.status === 'overdue');
          const partial = monthInvoices.filter(inv => inv.status === 'partial');

          return (
            <>
              <div className="bg-success-50 rounded-xl p-6">
                <p className="text-success-700 font-medium mb-2">Paid</p>
                <p className="text-3xl font-bold text-success-700">{paid.length}</p>
                <p className="text-sm text-success-600 mt-1">
                  {formatCurrency(paid.reduce((sum, inv) => sum + inv.amount, 0))}
                </p>
              </div>
              <div className="bg-warning-50 rounded-xl p-6">
                <p className="text-warning-700 font-medium mb-2">Pending</p>
                <p className="text-3xl font-bold text-warning-700">{pending.length}</p>
                <p className="text-sm text-warning-600 mt-1">
                  {formatCurrency(pending.reduce((sum, inv) => sum + inv.remainingAmount, 0))}
                </p>
              </div>
              <div className="bg-primary-50 rounded-xl p-6">
                <p className="text-primary-700 font-medium mb-2">Partial</p>
                <p className="text-3xl font-bold text-primary-700">{partial.length}</p>
                <p className="text-sm text-primary-600 mt-1">
                  {formatCurrency(partial.reduce((sum, inv) => sum + inv.remainingAmount, 0))}
                </p>
              </div>
              <div className="bg-danger-50 rounded-xl p-6">
                <p className="text-danger-700 font-medium mb-2">Overdue</p>
                <p className="text-3xl font-bold text-danger-700">{overdue.length}</p>
                <p className="text-sm text-danger-600 mt-1">
                  {formatCurrency(overdue.reduce((sum, inv) => sum + inv.remainingAmount, 0))}
                </p>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}



