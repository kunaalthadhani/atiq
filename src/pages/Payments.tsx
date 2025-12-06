import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Wallet, DollarSign, X, CheckCircle, Trash2, Share2, MessageSquare, Mail, Clock, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { Payment, InvoiceWithDetails } from '@/types';
import { formatCurrency, formatDate, generateWhatsAppLink, generateEmailLink, cn } from '@/lib/utils';

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [shareDropdownOpen, setShareDropdownOpen] = useState<string | null>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Close share dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(event.target as Node)) {
        setShareDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const paymentsData = await dataService.getPayments();
      const invoicesData = await dataService.getInvoices();
      setPayments(paymentsData);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading payments data:', error);
      setPayments([]);
      setInvoices([]);
    }
  };

  const getInvoiceDetails = (invoiceId: string) => {
    return invoices.find(inv => inv.id === invoiceId);
  };

  // Sort payments by date (newest first)
  const sortedPayments = [...payments].sort((a, b) => {
    const dateA = new Date(a.paymentDate).getTime();
    const dateB = new Date(b.paymentDate).getTime();
    return dateB - dateA;
  });

  const filteredPayments = sortedPayments.filter(payment => {
    const invoice = getInvoiceDetails(payment.invoiceId);
    if (!invoice) return false;
    
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const tenantName = `${invoice.tenant.firstName} ${invoice.tenant.lastName}`.toLowerCase();
    const propertyName = invoice.property.name.toLowerCase();
    const unitNumber = invoice.unit.unitNumber.toLowerCase();
    const invoiceNumber = invoice.invoiceNumber.toLowerCase();
    const tenantEmail = invoice.tenant.email?.toLowerCase() || '';
    const tenantPhone = invoice.tenant.phone?.toLowerCase() || '';
    const tenantWhatsApp = invoice.tenant.whatsappNumber?.toLowerCase() || '';
    const referenceNumber = payment.referenceNumber?.toLowerCase() || '';
    const paymentMethod = payment.paymentMethod.toLowerCase();
    
    return (
      invoiceNumber.includes(query) ||
      tenantName.includes(query) ||
      propertyName.includes(query) ||
      unitNumber.includes(query) ||
      tenantEmail.includes(query) ||
      tenantPhone.includes(query) ||
      tenantWhatsApp.includes(query) ||
      referenceNumber.includes(query) ||
      paymentMethod.includes(query)
    );
  });

  const getUnpaidInvoices = () => {
    return invoices.filter(inv => inv.remainingAmount > 0 && inv.status !== 'cancelled');
  };

  const getFilteredUnpaidInvoices = () => {
    const unpaid = getUnpaidInvoices();
    if (!invoiceSearch) return unpaid;
    
    const query = invoiceSearch.toLowerCase();
    return unpaid.filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(query) ||
      `${inv.tenant.firstName} ${inv.tenant.lastName}`.toLowerCase().includes(query) ||
      inv.unit.unitNumber.toLowerCase().includes(query) ||
      inv.tenant.phone?.toLowerCase().includes(query) ||
      inv.tenant.whatsappNumber?.toLowerCase().includes(query)
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const paymentData = {
      invoiceId: selectedInvoiceId || formData.get('invoiceId') as string,
      amount: parseFloat(formData.get('amount') as string),
      paymentDate: new Date(formData.get('paymentDate') as string),
      paymentMethod: formData.get('paymentMethod') as any,
      referenceNumber: (formData.get('referenceNumber') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    };

    try {
      await dataService.createPayment(paymentData);
      await loadData();
      setShowForm(false);
      setSelectedInvoiceId('');
      setInvoiceSearch('');
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to create payment. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedInvoiceId('');
    setInvoiceSearch('');
  };

  const handleDelete = async (paymentId: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      try {
        await dataService.deletePayment(paymentId);
        await loadData();
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Failed to delete payment. Please try again.');
      }
    }
  };

  const generatePaymentConfirmationMessage = (payment: Payment, invoice: InvoiceWithDetails) => {
    return `Dear ${invoice.tenant.firstName} ${invoice.tenant.lastName},

This is a confirmation of your payment received.

Invoice Number: ${invoice.invoiceNumber}
Payment Date: ${formatDate(payment.paymentDate)}
Payment Amount: ${formatCurrency(payment.amount)}
Payment Method: ${payment.paymentMethod.replace('_', ' ')}
${payment.referenceNumber ? `Reference Number: ${payment.referenceNumber}` : ''}

Thank you for your payment!

Property: ${invoice.property.name}
Unit: ${invoice.unit.unitNumber}`;
  };

  const handleShareWhatsApp = (payment: Payment) => {
    const invoice = getInvoiceDetails(payment.invoiceId);
    if (!invoice || !invoice.tenant.whatsappNumber) {
      alert('WhatsApp number not available for this tenant');
      setShareDropdownOpen(null);
      return;
    }
    try {
      const message = generatePaymentConfirmationMessage(payment, invoice);
      const link = generateWhatsAppLink(invoice.tenant.whatsappNumber, message);
      const newWindow = window.open(link, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        window.location.href = link;
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      alert('Failed to open WhatsApp. Please check the phone number format.');
    }
    setShareDropdownOpen(null);
  };

  const handleShareEmail = (payment: Payment) => {
    const invoice = getInvoiceDetails(payment.invoiceId);
    if (!invoice || !invoice.tenant.email) {
      alert('Email not available for this tenant');
      setShareDropdownOpen(null);
      return;
    }
    const subject = `Payment Confirmation - Invoice ${invoice.invoiceNumber}`;
    const body = generatePaymentConfirmationMessage(payment, invoice);
    const link = generateEmailLink(invoice.tenant.email, subject, body);
    window.location.href = link;
    setShareDropdownOpen(null);
  };

  const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const selectedInvoice = selectedInvoiceId ? getUnpaidInvoices().find(inv => inv.id === selectedInvoiceId) : null;

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track all payment transactions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          <Plus className="w-5 h-5 mr-2" />
          Record Payment
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {(() => {
          const thisMonth = new Date();
          thisMonth.setDate(1);
          thisMonth.setHours(0, 0, 0, 0);
          
          const thisMonthPayments = payments.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate >= thisMonth;
          });
          
          const thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
          const last30Days = new Date();
          last30Days.setDate(last30Days.getDate() - 30);
          const recentPayments = payments.filter(p => new Date(p.paymentDate) >= last30Days).length;
          const recentAmount = payments.filter(p => new Date(p.paymentDate) >= last30Days).reduce((sum, p) => sum + p.amount, 0);
          const unpaidAmount = getUnpaidInvoices().reduce((sum, inv) => sum + inv.remainingAmount, 0);
          
          return [
            { label: 'Total Payments', count: payments.length, amount: totalPaymentsAmount, color: 'bg-success-100 text-success-700', icon: Wallet },
            { label: 'This Month', count: thisMonthPayments.length, amount: thisMonthAmount, color: 'bg-primary-100 text-primary-700', icon: Calendar },
            { label: 'Last 30 Days', count: recentPayments, amount: recentAmount, color: 'bg-warning-100 text-warning-700', icon: TrendingUp },
            { label: 'Unpaid Invoices', count: getUnpaidInvoices().length, amount: unpaidAmount, color: 'bg-danger-100 text-danger-700', icon: AlertCircle },
          ].map((stat) => (
            <div key={stat.label} className={cn('rounded-xl p-4', stat.color)}>
              <div className="flex items-center justify-between">
                <stat.icon className="w-6 h-6" />
                <span className="text-3xl font-bold">{stat.count}</span>
              </div>
              <p className="mt-2 font-medium">{stat.label}</p>
            </div>
          ));
        })()}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number, tenant name, property, unit, phone, email, reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1.2fr_1.5fr_2fr_1.2fr_1fr_1.2fr_auto] gap-4 px-4 py-3 text-sm font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
          <div>Date</div>
          <div>Tenants</div>
          <div>Invoice</div>
          <div>Amount</div>
          <div>Method</div>
          <div>Reference</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Rows */}
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => {
            const invoice = getInvoiceDetails(payment.invoiceId);
            if (!invoice) return null;

            return (
              <div
                key={payment.id}
                className="grid grid-cols-[1.2fr_1.5fr_2fr_1.2fr_1fr_1.2fr_auto] gap-4 px-4 py-3 text-sm items-center border-b border-gray-100 hover:bg-gray-50"
              >
                {/* Date */}
                <div>
                  <div className="font-medium text-gray-900">{formatDate(payment.paymentDate)}</div>
                </div>

                {/* Tenants */}
                <div>
                  <div className="text-gray-900">
                    {invoice.tenant.firstName} {invoice.tenant.lastName}
                  </div>
                </div>

                {/* Invoice */}
                <div>
                  <div className="font-semibold text-gray-900">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-gray-500">
                    {invoice.property.name} - Unit {invoice.unit.unitNumber}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <div className="font-medium text-success-600">{formatCurrency(payment.amount)}</div>
                </div>

                {/* Method */}
                <div>
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    {payment.paymentMethod.replace('_', ' ')}
                  </span>
                </div>

                {/* Reference */}
                <div>
                  <div className="text-gray-600">{payment.referenceNumber || '-'}</div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <div className="relative" ref={shareDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShareDropdownOpen(shareDropdownOpen === payment.id ? null : payment.id)}
                      className="hover:text-gray-900"
                      title="Share payment confirmation"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {shareDropdownOpen === payment.id && (
                      <div 
                        className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareWhatsApp(payment);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4 text-success-600" />
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareEmail(payment);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Mail className="w-4 h-4 text-primary-600" />
                          Email
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(payment.id)}
                    className="hover:text-danger-600"
                    title="Delete payment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center text-sm text-gray-600">
            {searchQuery
              ? 'No payments match your search.'
              : 'Payment records will appear here'}
          </div>
        )}
      </div>

      {/* Add Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto flex-1">
              {/* Invoice Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice * (Only due invoices)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by invoice number, tenant name, or phone number..."
                    value={invoiceSearch}
                    onChange={(e) => {
                      setInvoiceSearch(e.target.value);
                      setSelectedInvoiceId('');
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                {invoiceSearch && getFilteredUnpaidInvoices().length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {getFilteredUnpaidInvoices().map(inv => (
                      <button
                        type="button"
                        key={inv.id}
                        onClick={() => {
                          setSelectedInvoiceId(inv.id);
                          setInvoiceSearch(`${inv.invoiceNumber} - ${inv.tenant.firstName} ${inv.tenant.lastName} - Unit ${inv.unit.unitNumber}`);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                          selectedInvoiceId === inv.id ? 'bg-green-50' : ''
                        }`}
                      >
                        {inv.invoiceNumber} - {inv.tenant.firstName} {inv.tenant.lastName} - Unit {inv.unit.unitNumber} - {formatCurrency(inv.remainingAmount)} due
                      </button>
                    ))}
                  </div>
                )}
                <input type="hidden" name="invoiceId" value={selectedInvoiceId} required />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (AED) *
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0.01"
                  step="0.01"
                  defaultValue={selectedInvoice?.remainingAmount || ''}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Payment Method & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    name="paymentMethod"
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                    <option value="online">Online Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="REF-12345"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Additional notes about this payment..."
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
