import { useState, useEffect } from 'react';
import { Plus, Search, Users, Mail, Phone, CreditCard, X, Edit2, Trash2, Copy, Calendar, Eye } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { Tenant } from '@/types';

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
  const [selectedIdType, setSelectedIdType] = useState<string>('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [tenantsData, contractsData, invoicesData, paymentsData] = await Promise.all([
        dataService.getTenants(),
        dataService.getContracts(),
        dataService.getInvoices(),
        dataService.getPayments(),
      ]);
      setTenants(tenantsData);
      setContracts(contractsData);
      setInvoices(invoicesData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setTenants([]);
      setContracts([]);
      setInvoices([]);
      setPayments([]);
    }
  };

  const loadTenants = async () => {
    try {
      const data = await dataService.getTenants();
      setTenants(data);
    } catch (error) {
      console.error('Error loading tenants:', error);
      setTenants([]);
    }
  };

  // Note: searchTenants needs to be implemented in supabaseService or filter client-side
  const filteredTenants = searchQuery
    ? tenants.filter(t => 
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.phone.includes(searchQuery) ||
        t.secondaryPhone?.includes(searchQuery) ||
        t.whatsappNumber?.includes(searchQuery) ||
        t.secondaryWhatsappNumber?.includes(searchQuery)
      )
    : tenants;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);

      const idType = formData.get('idType') as string;
      const idNumber = formData.get('idNumber') as string;
      
      // Validate: If ID type is selected, ID number is mandatory
      if (idType && idType.trim() !== '' && (!idNumber || !idNumber.trim())) {
        alert('ID Number is required when ID Type is selected');
        const idNumberInput = e.currentTarget.querySelector('[name="idNumber"]') as HTMLInputElement;
        if (idNumberInput) {
          idNumberInput.focus();
        }
        return;
      }

      const idExpiryDateStr = formData.get('idExpiryDate') as string;
      const idExpiryDate = idExpiryDateStr ? new Date(idExpiryDateStr) : undefined;
      const tenantData = {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        secondaryPhone: (formData.get('secondaryPhone') as string) || undefined,
        whatsappNumber: formData.get('whatsappNumber') as string,
        secondaryWhatsappNumber: (formData.get('secondaryWhatsappNumber') as string) || undefined,
        nationalId: idNumber || formData.get('nationalId') as string || editingTenant?.nationalId || '',
        emergencyContact: formData.get('emergencyContact') as string,
        emergencyPhone: formData.get('emergencyPhone') as string,
        idType: formData.get('idType') as 'passport' | 'emirates_id' | 'driver_license' | 'other' | undefined,
        idNumber: idNumber || undefined,
        idExpiryDate,
        billingAddress: formData.get('billingAddress') as string | undefined,
        paymentMethod: formData.get('paymentMethod') as 'bank_transfer' | 'card' | 'cash' | 'cheque' | undefined,
        notificationPreference: formData.get('notificationPreference') as 'whatsapp' | 'email' | undefined,
        notes: formData.get('notes') as string | undefined,
      };

      if (editingTenant) {
        await dataService.updateTenant(editingTenant.id, tenantData);
      } else {
        await dataService.createTenant(tenantData);
      }

      await loadTenants();
      setShowForm(false);
      setEditingTenant(null);
      setSelectedIdType('');
    } catch (error) {
      console.error('Error saving tenant:', error);
      alert('Failed to save tenant. Please try again.');
    }
  };

  const handleCopyPhoneToWhatsApp = (phoneValue: string, whatsappInput: HTMLInputElement) => {
    whatsappInput.value = phoneValue;
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setSelectedIdType(tenant.idType || '');
    setShowForm(true);
  };

  const handleView = (tenant: Tenant) => {
    setViewTenant(tenant);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this tenant?')) {
      try {
        const success = await dataService.deleteTenant(id);
        if (success) {
          await loadAllData();
        } else {
          alert('Cannot delete tenant with associated contracts');
        }
      } catch (error) {
        console.error('Error deleting tenant:', error);
        alert('Error deleting tenant');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTenant(null);
    setSelectedIdType('');
  };

  const getTenantStatus = (tenantId: string) => {
    const tenantContracts = contracts.filter((c: any) => c.tenantId === tenantId);
    const hasActive = tenantContracts.some((c: any) => c.status === 'active');
    return hasActive ? 'Active' : 'Inactive';
  };

  const getPreferredPaymentMethod = (tenantId: string): string => {
    const tenantContracts = contracts.filter((c: any) => c.tenantId === tenantId);
    if (tenantContracts.length === 0) return '—';

    const contractIds = tenantContracts.map((c: any) => c.id);
    const allInvoices = invoices.filter((inv: any) => contractIds.includes(inv.contract.id));
    const invoiceIds = allInvoices.map((inv: any) => inv.id);

    const tenantPayments = payments.filter((p: any) => invoiceIds.includes(p.invoiceId));

    if (tenantPayments.length === 0) return '—';

    const latest = tenantPayments.reduce(
      (latestPayment: any, current: any) =>
        !latestPayment || new Date(current.paymentDate) > new Date(latestPayment.paymentDate)
          ? current
          : latestPayment,
      tenantPayments[0],
    );

    switch (latest.paymentMethod) {
      case 'cash':
        return 'Cash';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'cheque':
        return 'Cheque';
      case 'card':
        return 'Card';
      case 'online':
        return 'Online Payment';
      default:
        return '—';
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600 text-sm mt-1">
            {tenants.length} registered {tenants.length === 1 ? 'tenant' : 'tenants'}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setSelectedIdType('');
          }}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Tenant
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTenants.map((tenant) => {
          const status = getTenantStatus(tenant.id);
          const paymentMethod = tenant.paymentMethod 
            ? (tenant.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 
               tenant.paymentMethod.charAt(0).toUpperCase() + tenant.paymentMethod.slice(1))
            : getPreferredPaymentMethod(tenant.id);

          return (
            <div
              key={tenant.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-700 font-bold text-lg mr-3">
                    {tenant.firstName[0]}
                    {tenant.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {tenant.firstName} {tenant.lastName}
                    </h3>
                    <span
                      className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {status === 'Active' ? 'Active Contract' : 'No Active Contract'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleView(tenant)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View</span>
                  </button>
                  <button
                    onClick={() => handleEdit(tenant)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tenant.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                  <a href={`tel:${tenant.phone}`} className="hover:text-green-600">
                    {tenant.phone}
                  </a>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                  <a href={`mailto:${tenant.email}`} className="hover:text-green-600 truncate">
                    {tenant.email}
                  </a>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CreditCard className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{paymentMethod}</span>
                </div>
              </div>

              {/* National ID */}
              <div className="pt-4 border-top border-t border-gray-200 mt-2">
                <p className="text-xs text-gray-500">
                  {tenant.idType ? 
                    `${tenant.idType === 'emirates_id' ? 'Emirates ID' : tenant.idType === 'driver_license' ? 'Driver License' : tenant.idType === 'passport' ? 'Passport' : 'ID'}: ` 
                    : 'National ID: '}
                  <span className="font-medium text-gray-900">{tenant.idNumber || tenant.nationalId}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try a different search term' : 'Get started by adding your first tenant'}
          </p>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto flex-1">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    defaultValue={editingTenant?.firstName}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    defaultValue={editingTenant?.lastName}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* ID Type & ID Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Type
                  </label>
                  <select
                    name="idType"
                    value={selectedIdType || editingTenant?.idType || ''}
                    onChange={(e) => setSelectedIdType(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">Select ID Type</option>
                    <option value="passport">Passport</option>
                    <option value="emirates_id">Emirates ID</option>
                    <option value="driver_license">Driver License</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Number {((selectedIdType || editingTenant?.idType) && ' *')}
                  </label>
                  <input
                    type="text"
                    name="idNumber"
                    defaultValue={editingTenant?.idNumber || editingTenant?.nationalId}
                    required={!!(selectedIdType || editingTenant?.idType)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="EID-123456"
                  />
                </div>
              </div>

              {/* ID Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Expiry Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="idExpiryDate"
                    defaultValue={editingTenant?.idExpiryDate ? new Date(editingTenant.idExpiryDate).toISOString().split('T')[0] : ''}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Phone & WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="phone"
                      id="phone-input"
                      defaultValue={editingTenant?.phone}
                      required
                      className="w-full px-3 py-1.5 pr-9 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="+971501234567"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const phoneInput = e.currentTarget.parentElement?.querySelector('#phone-input') as HTMLInputElement;
                        const whatsappInput = document.getElementById('whatsapp-input') as HTMLInputElement;
                        if (phoneInput && whatsappInput) {
                          handleCopyPhoneToWhatsApp(phoneInput.value, whatsappInput);
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Copy to WhatsApp"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    name="whatsappNumber"
                    id="whatsapp-input"
                    defaultValue={editingTenant?.whatsappNumber}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+971501234567"
                  />
                </div>
              </div>

              {/* Secondary contacts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Phone
                  </label>
                  <input
                    type="tel"
                    name="secondaryPhone"
                    defaultValue={editingTenant?.secondaryPhone}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Optional secondary phone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary WhatsApp
                  </label>
                  <input
                    type="tel"
                    name="secondaryWhatsappNumber"
                    defaultValue={editingTenant?.secondaryWhatsappNumber}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Optional secondary WhatsApp"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingTenant?.email}
                  required
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Billing Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Address
                </label>
                <textarea
                  name="billingAddress"
                  rows={2}
                  defaultValue={editingTenant?.billingAddress}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Enter billing address..."
                />
              </div>

              {/* Payment Method & Notification */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    defaultValue={editingTenant?.paymentMethod || 'bank_transfer'}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notification
                  </label>
                  <select
                    name="notificationPreference"
                    defaultValue={editingTenant?.notificationPreference || 'whatsapp'}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
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
                  defaultValue={editingTenant?.notes}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Emergency Contact */}
              <div className="pt-2 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      name="emergencyContact"
                      defaultValue={editingTenant?.emergencyContact}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      name="emergencyPhone"
                      defaultValue={editingTenant?.emergencyPhone}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="+971501234567"
                    />
                  </div>
                </div>
              </div>

              {/* National ID (hidden, kept for backward compatibility) */}
              <input
                type="hidden"
                name="nationalId"
                value={editingTenant?.idNumber || editingTenant?.nationalId || ''}
              />

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
                  {editingTenant ? 'Update' : 'Add Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Tenant Modal */}
      {viewTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {viewTenant.firstName} {viewTenant.lastName}
                </h2>
                <p className="text-sm text-gray-600">
                  {getTenantStatus(viewTenant.id) === 'Active' ? 'Active Contract' : 'No Active Contract'}
                </p>
              </div>
              <button
                onClick={() => setViewTenant(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Contact</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li><span className="font-medium">Phone:</span> {viewTenant.phone}</li>
                    {viewTenant.secondaryPhone && (
                      <li><span className="font-medium">Secondary Phone:</span> {viewTenant.secondaryPhone}</li>
                    )}
                    <li><span className="font-medium">WhatsApp:</span> {viewTenant.whatsappNumber}</li>
                    {viewTenant.secondaryWhatsappNumber && (
                      <li><span className="font-medium">Secondary WhatsApp:</span> {viewTenant.secondaryWhatsappNumber}</li>
                    )}
                    <li><span className="font-medium">Email:</span> {viewTenant.email}</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Identification</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li><span className="font-medium">ID Type:</span> {viewTenant.idType || '—'}</li>
                    <li><span className="font-medium">ID Number:</span> {viewTenant.idNumber || viewTenant.nationalId || '—'}</li>
                    <li>
                      <span className="font-medium">ID Expiry:</span>{' '}
                      {viewTenant.idExpiryDate ? new Date(viewTenant.idExpiryDate).toLocaleDateString() : '—'}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Preferences</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>
                      <span className="font-medium">Payment Method:</span>{' '}
                      {viewTenant.paymentMethod || getPreferredPaymentMethod(viewTenant.id) || '—'}
                    </li>
                    <li>
                      <span className="font-medium">Notification:</span>{' '}
                      {viewTenant.notificationPreference || '—'}
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Emergency</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li><span className="font-medium">Contact:</span> {viewTenant.emergencyContact}</li>
                    <li><span className="font-medium">Phone:</span> {viewTenant.emergencyPhone}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Billing & Notes</h3>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Billing Address:</span> {viewTenant.billingAddress || '—'}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-medium">Notes:</span> {viewTenant.notes || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

