import { useState, useEffect, useRef } from 'react';
import { Search, Receipt, Mail, MessageSquare, AlertCircle, CheckCircle, Clock, Share2, X } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { InvoiceWithDetails } from '@/types';
import { formatCurrency, formatDate, getStatusColor, cn, generateWhatsAppLink, generateEmailLink } from '@/lib/utils';

export default function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null);
  const [shareDropdownOpen, setShareDropdownOpen] = useState<string | null>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [prefilledInvoice, setPrefilledInvoice] = useState<InvoiceWithDetails | null>(null);

  // Check URL params for filter status (for dashboard link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    if (statusParam === 'overdue') {
      setFilterStatus('overdue');
    }
  }, []);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await dataService.getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    }
  };

  // Sort invoices by creation date (newest first)
  const sortedInvoices = [...invoices].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.dueDate).getTime();
    const dateB = new Date(b.createdAt || b.dueDate).getTime();
    return dateB - dateA;
  });

  const filteredInvoices = sortedInvoices.filter(invoice => {
    // Status filter
    let matchesStatus = true;
    if (filterStatus === 'issued') {
      matchesStatus = invoice.status === 'pending' || invoice.status === 'partial';
    } else if (filterStatus === 'overdue') {
      matchesStatus = invoice.status === 'overdue';
    } else if (filterStatus === 'paid') {
      matchesStatus = invoice.status === 'paid';
    } else if (filterStatus === 'partial') {
      matchesStatus = invoice.status === 'partial';
    }
    
    if (!searchQuery) return matchesStatus;
    
    const query = searchQuery.toLowerCase();
    const tenantName = `${invoice.tenant.firstName} ${invoice.tenant.lastName}`.toLowerCase();
    const propertyName = invoice.property.name.toLowerCase();
    const unitNumber = invoice.unit.unitNumber.toLowerCase();
    const invoiceNumber = invoice.invoiceNumber.toLowerCase();
    const tenantEmail = invoice.tenant.email?.toLowerCase() || '';
    const tenantPhone = invoice.tenant.phone?.toLowerCase() || '';
    const tenantWhatsApp = invoice.tenant.whatsappNumber?.toLowerCase() || '';
    const tenantNationalId = invoice.tenant.nationalId?.toLowerCase() || '';
    
    const matchesSearch = (
      invoiceNumber.includes(query) ||
      tenantName.includes(query) ||
      propertyName.includes(query) ||
      unitNumber.includes(query) ||
      tenantEmail.includes(query) ||
      tenantPhone.includes(query) ||
      tenantWhatsApp.includes(query) ||
      tenantNationalId.includes(query)
    );

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const itemsPerPage = 100;
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const generateInvoiceMessage = (invoice: InvoiceWithDetails) => {
    return `Dear ${invoice.tenant.firstName} ${invoice.tenant.lastName},

This is a payment reminder for your rental unit.

Property: ${invoice.property.name}
Unit: ${invoice.unit.unitNumber}
Invoice Number: ${invoice.invoiceNumber}
Installment: ${invoice.installmentNumber}/${invoice.contract.numberOfInstallments}

Amount Due: ${formatCurrency(invoice.remainingAmount)}
Due Date: ${formatDate(invoice.dueDate)}

Remaining Balance: ${formatCurrency(invoice.remainingAmount)}
Total Invoice Amount: ${formatCurrency(invoice.amount)}
Amount Paid: ${formatCurrency(invoice.paidAmount)}

Please make the payment at your earliest convenience.

Thank you!`;
  };

  const handleShareWhatsApp = (invoice: InvoiceWithDetails) => {
    if (!invoice.tenant.whatsappNumber) {
      alert('WhatsApp number not available for this tenant');
      setShareDropdownOpen(null);
      return;
    }
    try {
      const message = generateInvoiceMessage(invoice);
      const link = generateWhatsAppLink(invoice.tenant.whatsappNumber, message);
      // Use window.location for better compatibility, or try window.open
      const newWindow = window.open(link, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        // If popup blocked, try direct navigation
        window.location.href = link;
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      alert('Failed to open WhatsApp. Please check the phone number format.');
    }
    setShareDropdownOpen(null);
  };

  const handleShareEmail = (invoice: InvoiceWithDetails) => {
    const subject = `Payment Reminder - Invoice ${invoice.invoiceNumber}`;
    const body = generateInvoiceMessage(invoice);
    const link = generateEmailLink(invoice.tenant.email, subject, body);
    window.location.href = link;
    setShareDropdownOpen(null);
  };

  const handleEditInvoice = (invoice: InvoiceWithDetails) => {
    setEditingInvoice(invoice);
  };

  const handleSaveInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      status: formData.get('paymentStatus') as any,
      adminStatus: formData.get('adminStatus') as any,
      paymentType: formData.get('paymentType') as any,
      notes: formData.get('notes') as string || undefined,
    };

    try {
      await dataService.updateInvoice(editingInvoice.id, updates);
      await loadInvoices();
      setEditingInvoice(null);
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Failed to update invoice. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);
  };

  const handleCreatePayment = (invoice: InvoiceWithDetails) => {
    if (invoice.remainingAmount <= 0) return;
    setPrefilledInvoice(invoice);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prefilledInvoice) return;

    try {
      const formData = new FormData(e.currentTarget);
      const paymentData = {
        invoiceId: prefilledInvoice.id,
        amount: parseFloat(formData.get('amount') as string),
        paymentDate: new Date(formData.get('paymentDate') as string),
        paymentMethod: formData.get('paymentMethod') as any,
        referenceNumber: (formData.get('referenceNumber') as string) || undefined,
        notes: (formData.get('notes') as string) || undefined,
      };

      await dataService.createPayment(paymentData);
      await loadInvoices();
      setShowPaymentForm(false);
      setPrefilledInvoice(null);
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to create payment. Please try again.');
    }
  };

  const handleCancelPayment = () => {
    setShowPaymentForm(false);
    setPrefilledInvoice(null);
  };

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

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-600 mt-1">Track and manage payment invoices</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Paid', count: invoices.filter(i => i.status === 'paid').length, color: 'bg-success-100 text-success-700', icon: CheckCircle },
          { label: 'Pending', count: invoices.filter(i => i.status === 'pending').length, color: 'bg-warning-100 text-warning-700', icon: Clock },
          { label: 'Partial', count: invoices.filter(i => i.status === 'partial').length, color: 'bg-primary-100 text-primary-700', icon: Receipt },
          { label: 'Overdue', count: invoices.filter(i => i.status === 'overdue').length, color: 'bg-danger-100 text-danger-700', icon: AlertCircle },
        ].map((stat) => (
          <div key={stat.label} className={cn('rounded-xl p-4', stat.color)}>
            <div className="flex items-center justify-between">
              <stat.icon className="w-6 h-6" />
              <span className="text-3xl font-bold">{stat.count}</span>
            </div>
            <p className="mt-2 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number, tenant name, property, unit, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
          {['all', 'issued', 'overdue', 'paid', 'partial'].map(status => {
            const label =
              status === 'all'
                ? 'All'
                : status === 'issued'
                ? 'Issued'
                : status === 'overdue'
                ? 'Overdue'
                : status === 'paid'
                ? 'Paid'
                : 'Partial';

            const isActive = filterStatus === status;

            return (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={cn(
                  'px-3 py-1.5 rounded-md font-medium',
                  isActive
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1.5fr_2fr_2fr_1.2fr_1.2fr_1.2fr_1fr_1.2fr_auto] gap-4 px-4 py-3 text-sm font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
          <div>Invoice</div>
          <div>Tenant</div>
          <div>Property</div>
          <div>Due Date</div>
          <div>Amount</div>
          <div>Balance</div>
          <div>Status</div>
          <div>Payment</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Rows */}
        {paginatedInvoices.length > 0 ? (
          paginatedInvoices
            .map((invoice) => {
              if (!invoice || !invoice.tenant || !invoice.unit || !invoice.property || !invoice.contract) {
                return null;
              }

              const isOverdue = invoice.status === 'overdue';

              const isPaid = invoice.status === 'paid' || invoice.remainingAmount <= 0;

              return (
                <div
                  key={invoice.id}
                  className="grid grid-cols-[1.5fr_2fr_2fr_1.2fr_1.2fr_1.2fr_1fr_1.2fr_auto] gap-4 px-4 py-3 text-sm items-center border-b border-gray-100 hover:bg-gray-50"
                >
                  {/* Invoice */}
                  <div>
                    <div className="font-semibold text-gray-900">{invoice.invoiceNumber}</div>
                    <div className="text-xs text-gray-500">
                      {invoice.installmentNumber}/{invoice.contract.numberOfInstallments}
                    </div>
                  </div>

                  {/* Tenant */}
                  <div>
                    <div className="text-gray-900">
                      {invoice.tenant.firstName} {invoice.tenant.lastName}
                    </div>
                  </div>

                  {/* Property */}
                  <div>
                    <div className="text-gray-900">{invoice.property.name}</div>
                    <div className="text-xs text-gray-500">Unit {invoice.unit.unitNumber}</div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <div className={cn('font-medium', isOverdue ? 'text-danger-600' : 'text-gray-900')}>
                      {formatDate(invoice.dueDate)}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="font-medium text-gray-900">{formatCurrency(invoice.amount)}</div>
                  </div>

                  {/* Balance */}
                  <div>
                    <div
                      className={cn(
                        'font-medium',
                        invoice.remainingAmount > 0 ? 'text-danger-600' : 'text-success-600'
                      )}
                    >
                      {formatCurrency(invoice.remainingAmount)}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className={cn(
                        'inline-flex px-2 py-1 rounded-full text-xs font-semibold',
                        getStatusColor(invoice.status)
                      )}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>

                  {/* Payment Button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => !isPaid && handleCreatePayment(invoice)}
                      disabled={isPaid}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                        isPaid
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      )}
                    >
                      {isPaid ? 'Paid' : 'Create Payment'}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 text-gray-600">
                    <div className="relative" ref={shareDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShareDropdownOpen(shareDropdownOpen === invoice.id ? null : invoice.id)}
                        className="hover:text-gray-900"
                        title="Share invoice"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      {shareDropdownOpen === invoice.id && (
                        <div 
                          className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareWhatsApp(invoice);
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
                              handleShareEmail(invoice);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Mail className="w-4 h-4 text-primary-600" />
                            Email
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Invisible spacer to maintain layout */}
                    <div className="w-4 h-4" />
                  </div>
                </div>
              );
            })
            .filter(Boolean)
        ) : (
          <div className="py-10 text-center text-sm text-gray-600">
            {searchQuery
              ? 'No invoices match your search.'
              : 'Invoices will appear here once contracts are created.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">Edit Invoice</h2>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-5 space-y-3 overflow-y-auto flex-1">
              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  name="paymentStatus"
                  defaultValue={editingInvoice.status}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Admin Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Status
                </label>
                <select
                  name="adminStatus"
                  defaultValue={editingInvoice.adminStatus || 'pending'}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type
                </label>
                <select
                  name="paymentType"
                  defaultValue={editingInvoice.paymentType || 'bank_transfer'}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editingInvoice.notes || ''}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Additional notes about this invoice..."
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && prefilledInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
              <button onClick={handleCancelPayment} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-3 overflow-y-auto flex-1">
              {/* Invoice Info (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice
                </label>
                <div className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                  {prefilledInvoice.invoiceNumber} - {prefilledInvoice.tenant.firstName} {prefilledInvoice.tenant.lastName} - Unit {prefilledInvoice.unit.unitNumber}
                </div>
                <input type="hidden" name="invoiceId" value={prefilledInvoice.id} />
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
                  defaultValue={prefilledInvoice.remainingAmount}
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
                    defaultValue="cash"
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
                  onClick={handleCancelPayment}
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

