import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, DollarSign, X, AlertCircle, Copy, CheckCircle, Clock, Ban, Paperclip, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dataService } from '@/services/dataService';
import { ContractWithDetails, Tenant, Unit, Property, InvoiceWithDetails, ApprovalRequestWithDetails } from '@/types';
import { queryKeys } from '@/lib/queryClient';
import { formatCurrency, formatDate, getStatusColor, cn } from '@/lib/utils';
import { addYears, subDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

// Helper function to format payment frequency for display
const formatPaymentFrequency = (frequency: string): string => {
  switch (frequency) {
    case '1_payment':
      return '1 Payment';
    case '2_payment':
      return '2 Payments';
    case '3_payment':
      return '3 Payments';
    case '4_payment':
      return '4 Payments';
    default:
      return frequency;
  }
};

export default function Contracts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [error, setError] = useState<string>('');
  const [viewingContract, setViewingContract] = useState<ContractWithDetails | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formFrequency, setFormFrequency] = useState<string>('monthly');
  const [calculatedInstallments, setCalculatedInstallments] = useState<number>(0);
  const [contractDuration, setContractDuration] = useState<string>(''); // '1_year', 'custom', etc.
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingContract, setEditingContract] = useState<ContractWithDetails | null>(null);
  const [contractAttachments, setContractAttachments] = useState<string[]>([]);
  const [yearlyRent, setYearlyRent] = useState<string>('');
  const [paymentAmounts, setPaymentAmounts] = useState<string[]>([]);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [attachmentContractId, setAttachmentContractId] = useState<string | null>(null);
  const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);

  const isNonAdmin = !!user && user.role?.trim() !== 'admin';

  const contractsQuery = useQuery({
    queryKey: queryKeys.contracts(),
    queryFn: () => dataService.getContracts(),
  });
  const tenantsQuery = useQuery({
    queryKey: queryKeys.tenants(),
    queryFn: () => dataService.getTenants(),
  });
  const unitsQuery = useQuery({
    queryKey: queryKeys.units(),
    queryFn: () => dataService.getUnits(),
  });
  const propertiesQuery = useQuery({
    queryKey: queryKeys.properties(),
    queryFn: () => dataService.getProperties(),
  });
  const invoicesQuery = useQuery({
    queryKey: queryKeys.invoices(),
    queryFn: () => dataService.getInvoices(),
  });
  const pendingApprovalsQuery = useQuery({
    queryKey: queryKeys.approvalRequests('pending', user?.id),
    queryFn: () => dataService.getApprovalRequests('pending', user?.id),
    enabled: isNonAdmin,
  });

  const contracts: ContractWithDetails[] = contractsQuery.data ?? [];
  const tenants: Tenant[] = tenantsQuery.data ?? [];
  const units: Unit[] = unitsQuery.data ?? [];
  const properties: Property[] = propertiesQuery.data ?? [];
  const invoices: InvoiceWithDetails[] = invoicesQuery.data ?? [];
  const pendingContractApprovals: ApprovalRequestWithDetails[] = (pendingApprovalsQuery.data ?? []).filter(
    req => req.requestType === 'contract_create' && req.status === 'pending'
  );

  useEffect(() => {
    if (contractsQuery.error) {
      setError('Failed to load contracts. Please refresh the page.');
    }
  }, [contractsQuery.error]);

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    queryClient.invalidateQueries({ queryKey: ['units'] });
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
  };

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  // Sort contracts by creation date (newest first)
  const sortedContracts = [...contracts].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.startDate).getTime();
    const dateB = new Date(b.createdAt || b.startDate).getTime();
    return dateB - dateA;
  });

  const filteredContracts = sortedContracts.filter(contract => {
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    
    if (!searchQuery) return matchesStatus;
    
    const query = searchQuery.toLowerCase();
    const tenantName = `${contract.tenant.firstName} ${contract.tenant.lastName}`.toLowerCase();
    const propertyName = contract.property.name.toLowerCase();
    const unitNumber = contract.unit.unitNumber.toLowerCase();
    const contractNumber = contract.contractNumber?.toLowerCase() || '';
    const tenantEmail = contract.tenant.email?.toLowerCase() || '';
    const tenantPhone = contract.tenant.phone?.toLowerCase() || '';
    const tenantWhatsApp = contract.tenant.whatsappNumber?.toLowerCase() || '';
    const tenantNationalId = contract.tenant.nationalId?.toLowerCase() || '';
    
    const matchesSearch = (
      tenantName.includes(query) ||
      propertyName.includes(query) ||
      unitNumber.includes(query) ||
      contractNumber.includes(query) ||
      tenantEmail.includes(query) ||
      tenantPhone.includes(query) ||
      tenantWhatsApp.includes(query) ||
      tenantNationalId.includes(query)
    );

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const itemsPerPage = 100;
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Auto-calculate end date for 1-year contracts
  useEffect(() => {
    if (formStartDate && contractDuration === '1_year') {
      const start = new Date(formStartDate);
      // Add 1 year, then subtract 1 day (so Jan 1 -> Dec 31)
      const oneYearLater = addYears(start, 1);
      const endDate = subDays(oneYearLater, 1);
      setFormEndDate(endDate.toISOString().split('T')[0]);
    }
  }, [formStartDate, contractDuration]);

  // Calculate installments based on dates and frequency
  useEffect(() => {
    let newInstallments = 0;
    if (formStartDate && formEndDate && formFrequency) {
      if (formFrequency === '1_payment') {
        newInstallments = 1;
      } else if (formFrequency === '2_payment') {
        newInstallments = 2;
      } else if (formFrequency === '3_payment') {
        newInstallments = 3;
      } else if (formFrequency === '4_payment') {
        newInstallments = 4;
      }
    }
    setCalculatedInstallments(newInstallments);
    // Initialize payment amounts array when installments change
    if (newInstallments > 0) {
      setPaymentAmounts(prev => {
        if (prev.length === newInstallments) return prev;
        return Array(newInstallments).fill('');
      });
    } else {
      setPaymentAmounts([]);
    }
  }, [formStartDate, formEndDate, formFrequency]);

  const openEditForm = (contract: ContractWithDetails) => {
    setSelectedTenantId(contract.tenantId);
    setTenantSearch(`${contract.tenant.firstName} ${contract.tenant.lastName}`);
    setSelectedPropertyId(contract.unit.propertyId);
    setSelectedUnitId(contract.unitId);
    setFormStartDate(contract.startDate.toISOString().split('T')[0]);
    setFormEndDate(contract.endDate.toISOString().split('T')[0]);
    setFormFrequency(contract.paymentFrequency);
    setCalculatedInstallments(contract.numberOfInstallments);
    setContractDuration('custom');
    setContractAttachments(contract.attachments || []);
    setYearlyRent((contract.monthlyRent * 12).toString());
    if (contract.paymentAmounts && contract.paymentAmounts.length > 0) {
      setPaymentAmounts(contract.paymentAmounts.map(a => a.toString()));
    } else {
      setPaymentAmounts(Array(contract.numberOfInstallments).fill(''));
    }
    setEditingContract(contract);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    const formData = new FormData(e.currentTarget);

    // Calculate monthly rent from yearly rent
    const yearlyRentValue = parseFloat(formData.get('yearlyRent') as string);
    const monthlyRent = yearlyRentValue / 12;

    // Validate payment amounts match yearly rent
    const numInstallments = calculatedInstallments || parseInt(formData.get('numberOfInstallments') as string);
    const parsedPaymentAmounts = paymentAmounts.map(a => parseFloat(a) || 0);
    
    if (numInstallments > 0 && parsedPaymentAmounts.length === numInstallments) {
      const totalPaymentAmounts = Math.round(parsedPaymentAmounts.reduce((sum, a) => sum + a, 0));
      const roundedYearlyRent = Math.round(yearlyRentValue);
      
      if (Math.abs(totalPaymentAmounts - roundedYearlyRent) > 0.01) {
        setError(
          `The total of all payment amounts (AED ${totalPaymentAmounts.toLocaleString('en-US')}) does not match the total rent (AED ${roundedYearlyRent.toLocaleString('en-US')}). Please adjust the payment amounts.`
        );
        return;
      }

      // Check that no payment amount is zero or negative
      const invalidPayment = parsedPaymentAmounts.findIndex(a => a <= 0);
      if (invalidPayment !== -1) {
        setError(`Payment ${invalidPayment + 1} amount must be greater than zero.`);
        return;
      }
    }

    const contractData = {
      tenantId: selectedTenantId || formData.get('tenantId') as string,
      unitId: formData.get('unitId') as string,
      startDate: new Date(formData.get('startDate') as string),
      endDate: new Date(formData.get('endDate') as string),
      monthlyRent: monthlyRent,
      securityDeposit: parseFloat(formData.get('securityDeposit') as string),
      paymentFrequency: formData.get('paymentFrequency') as any,
      numberOfInstallments: numInstallments,
      status: (formData.get('status') as any) || 'draft',
      reminderPeriod: (formData.get('reminderPeriod') as any) || undefined,
      notes: (formData.get('notes') as string) || undefined,
      contractNumber: formData.get('contractNumber') as string,
      dueDateDay: formData.get('dueDateDay') ? parseInt(formData.get('dueDateDay') as string) : undefined,
      attachments: contractAttachments,
      paymentAmounts: parsedPaymentAmounts.length === numInstallments ? parsedPaymentAmounts : undefined,
    };

    try {
      if (editingContract) {
        // Check if status is changing from draft to active
        const isChangingToActive = contractData.status === 'active' && editingContract.status === 'draft';
        
        if (isChangingToActive && user?.role !== 'admin') {
          // Create approval request for status change
          try {
            const { supabaseService } = await import('@/services/supabaseService');
            await supabaseService.createApprovalRequest(
              'contract_create',
              'contract',
              { ...contractData, id: editingContract.id, isUpdate: true },
              user!.id
            );
            alert('Contract activation request submitted for approval');
            await loadData();
            setShowForm(false);
            setEditingContract(null);
            resetForm();
            return;
          } catch (error: any) {
            console.error('Error creating approval request:', error);
            setError(error.message || 'Failed to submit approval request');
            return;
          }
        } else {
          // Update contract directly
          const updated = await dataService.updateContract(
            editingContract.id,
            contractData,
            user?.id,
            user?.role
          );
          if (updated) {
            alert('Contract updated successfully');
            await loadData();
            setShowForm(false);
            setEditingContract(null);
            resetForm();
          } else {
            setError('Failed to update contract');
          }
        }
      } else {
        // Create new contract (existing logic)
        const result = await dataService.createContract(
          contractData,
          user?.id,
          user?.role
        );
        
        if (result.success) {
          if (result.requiresApproval) {
            alert(result.message || 'Contract creation request submitted for approval');
          }
          await loadData();
          setShowForm(false);
          resetForm();
        } else {
          setError(result.message || 'Failed to create contract');
        }
      }
    } catch (error: any) {
      console.error('Error saving contract:', error);
      setError(error.message || 'Failed to save contract. Please try again.');
    }
  };

  const resetForm = () => {
    setSelectedPropertyId('');
    setSelectedUnitId('');
    setTenantSearch('');
    setSelectedTenantId('');
    setFormStartDate('');
    setFormEndDate('');
    setFormFrequency('monthly');
    setCalculatedInstallments(0);
    setContractDuration('');
    setContractAttachments([]);
    setYearlyRent('');
    setPaymentAmounts([]);
  };

  const handleTerminate = async (id: string) => {
    if (confirm('Are you sure you want to terminate this contract? This will mark the unit as vacant and cancel unpaid invoices.')) {
      try {
        const result = await dataService.terminateContract(id, user?.id, user?.role);
        if (typeof result === 'object' && 'requiresApproval' in result) {
          alert(result.message || 'Contract termination request submitted for approval');
        }
        await loadData();
      } catch (error) {
        console.error('Error terminating contract:', error);
        alert('Failed to terminate contract. Please try again.');
      }
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Delete this draft contract? This cannot be undone.')) return;
    try {
      const ok = await dataService.deleteContract(id);
      if (ok) {
        setViewingContract(null);
        await loadData();
      } else {
        alert('Only draft contracts can be deleted.');
      }
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Failed to delete contract. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setError('');
    setEditingContract(null);
    resetForm();
  };

  const getAvailableProperties = () => {
    return properties.filter(prop => {
      if (editingContract && prop.id === editingContract.unit.propertyId) return true;
      const propUnits = units.filter(u => u.propertyId === prop.id);
      return propUnits.some(u => !u.isOccupied);
    });
  };

  const getAvailableUnitsForProperty = (propertyId: string) => {
    return units.filter(u => {
      if (editingContract && u.id === editingContract.unitId) return true;
      return u.propertyId === propertyId && !u.isOccupied;
    });
  };

  const filteredTenants = tenantSearch
    ? tenants.filter(t => 
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(tenantSearch.toLowerCase())
      )
    : [];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-600 text-sm mt-1">Manage rental agreements and leases</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Contract
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {(() => {
          const activeContracts = contracts.filter(c => c.status === 'active').length;
          const expiredContracts = contracts.filter(c => c.status === 'expired').length;
          const draftContracts = contracts.filter(c => c.status === 'draft').length;
          const terminatedContracts = contracts.filter(c => c.status === 'terminated').length;
          
          return [
            { label: 'Active', count: activeContracts, color: 'bg-success-100 text-success-700', icon: CheckCircle },
            { label: 'Expired', count: expiredContracts, color: 'bg-warning-100 text-warning-700', icon: Clock },
            { label: 'Draft', count: draftContracts, color: 'bg-primary-100 text-primary-700', icon: FileText },
            { label: 'Terminated', count: terminatedContracts, color: 'bg-danger-100 text-danger-700', icon: Ban },
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

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tenant name, property, unit, contract number, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowTenantForm(true)}
          className="flex items-center px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add New Tenant
        </button>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {/* Pending Contract Approvals Section (for non-admin users) */}
      {user && user.role?.trim() !== 'admin' && pendingContractApprovals.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">Pending Contract Approvals</h3>
          </div>
          <div className="space-y-3">
            {pendingContractApprovals.map((approval) => {
              const contractData = approval.requestData;
              const tenant = tenants.find(t => t.id === contractData.tenantId);
              const unit = units.find(u => u.id === contractData.unitId);
              const property = properties.find(p => unit && p.id === unit.propertyId);
              
              if (!tenant || !unit || !property) return null;
              
              return (
                <div key={approval.id} className="bg-white rounded-lg border border-yellow-200 p-4 hover:shadow-md transition-shadow opacity-75">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-green-50 border border-green-200 rounded-full flex items-center justify-center text-green-700 font-bold text-base mr-3">
                          {tenant.firstName[0]}{tenant.lastName[0]}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {tenant.firstName} {tenant.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {property.name} - Unit {unit.unitNumber}
                          </p>
                          {contractData.contractNumber && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Contract: {contractData.contractNumber}
                            </p>
                          )}
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 ml-3">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Approval
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mb-3 text-sm">
                        <div className="flex flex-col">
                          <p className="text-xs text-gray-600 mb-0.5">Start Date</p>
                          <p className="font-medium text-gray-900">{formatDate(new Date(contractData.startDate))}</p>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-xs text-gray-600 mb-0.5">End Date</p>
                          <p className="font-medium text-gray-900">{formatDate(new Date(contractData.endDate))}</p>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-xs text-gray-600 mb-0.5">Monthly Rent</p>
                          <p className="font-medium text-gray-900">{formatCurrency(contractData.monthlyRent)}</p>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-xs text-gray-600 mb-0.5">Payment Frequency</p>
                          <p className="font-medium text-gray-900">{formatPaymentFrequency(contractData.paymentFrequency)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contracts List */}
      <div className="space-y-3">
        {paginatedContracts.length > 0 ? paginatedContracts.map((contract) => {
          if (!contract || !contract.tenant || !contract.unit || !contract.property) {
            return null;
          }
          
          const contractInvoices = invoices.filter(inv => inv.contractId === contract.id);
          const paidInvoices = contractInvoices.filter(inv => inv.status === 'paid').length;
          const overdueInvoices = contractInvoices.filter(inv => inv.status === 'overdue').length;

          return (
            <div key={contract.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-green-50 border border-green-200 rounded-full flex items-center justify-center text-green-700 font-bold text-base mr-3">
                      {contract.tenant.firstName[0]}{contract.tenant.lastName[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {contract.tenant.firstName} {contract.tenant.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {contract.property.name} - Unit {contract.unit.unitNumber}
                      </p>
                      {contract.contractNumber && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Contract: {contract.contractNumber}
                        </p>
                      )}
                    </div>
                    <span className={cn('ml-3 px-2 py-0.5 rounded-full text-xs font-semibold', getStatusColor(contract.status))}>
                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                    </span>
                  </div>

                  {/* Contract Details Grid */}
                  <div className="grid grid-cols-4 gap-3 mb-3 text-sm" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className="flex flex-col">
                      <p className="text-xs text-gray-600 mb-0.5 whitespace-nowrap">Start Date</p>
                      <p className="font-medium text-gray-900">{formatDate(contract.startDate)}</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs text-gray-600 mb-0.5 whitespace-nowrap">End Date</p>
                      <p className="font-medium text-gray-900">{formatDate(contract.endDate)}</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs text-gray-600 mb-0.5 whitespace-nowrap">Monthly Rent</p>
                      <p className="font-medium text-gray-900">{formatCurrency(contract.monthlyRent)}</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs text-gray-600 mb-0.5 whitespace-nowrap">Security Deposit</p>
                      <p className="font-medium text-gray-900">{formatCurrency(contract.securityDeposit)}</p>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="flex items-center flex-wrap gap-4 text-xs mb-2">
                    <div className="flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1.5 text-primary-600" />
                      <span className="text-gray-600">
                        Payment: <span className="font-medium text-gray-900">{formatPaymentFrequency(contract.paymentFrequency)}</span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="w-3.5 h-3.5 mr-1.5 text-success-600" />
                      <span className="text-gray-600">
                        Invoices: <span className="font-medium text-gray-900">{paidInvoices}/{contract.numberOfInstallments} paid</span>
                      </span>
                    </div>
                    {overdueInvoices > 0 && (
                      <div className="flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-danger-600" />
                        <span className="text-danger-600 font-medium">{overdueInvoices} overdue</span>
                      </div>
                    )}
                    {contract.reminderPeriod && (
                      <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-warning-600" />
                        <span className="text-gray-600">
                          Reminder: <span className="font-medium text-gray-900">{contract.reminderPeriod.replace('_', ' ')}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {contract.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                      {contract.notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => {
                      setViewingContract(contract);
                      setContractAttachments(contract.attachments || []);
                    }}
                    className="px-3 py-1.5 border border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-xs font-medium"
                  >
                    View
                  </button>
                  {contract.status === 'draft' && (
                    <button
                      onClick={() => handleDeleteDraft(contract.id)}
                      className="px-3 py-1.5 border border-danger-300 text-danger-600 rounded-lg hover:bg-danger-50 transition-colors text-xs font-medium"
                    >
                      Delete
                    </button>
                  )}
                  {contract.status === 'active' && (
                    <button
                      onClick={() => handleTerminate(contract.id)}
                      className="px-3 py-1.5 border border-danger-300 text-danger-600 rounded-lg hover:bg-danger-50 transition-colors text-xs font-medium"
                    >
                      Terminate
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }).filter(Boolean) : null}
      </div>

      {paginatedContracts.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try a different search term' : 'Get started by creating your first contract'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredContracts.length)} of {filteredContracts.length} contracts
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

      {/* Add Contract Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">
                {editingContract ? 'Edit Contract' : 'Create New Contract'}
              </h2>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto flex-1">
              {error && (
                <div className="bg-danger-50 border-l-4 border-danger-500 p-3 rounded text-sm">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-danger-600 mr-2" />
                    <p className="text-danger-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Tenant Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tenant..."
                    value={tenantSearch}
                    onChange={(e) => {
                      setTenantSearch(e.target.value);
                      setSelectedTenantId('');
                    }}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                {tenantSearch && filteredTenants.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {filteredTenants.map(tenant => (
                      <button
                        type="button"
                        key={tenant.id}
                        onClick={() => {
                          setSelectedTenantId(tenant.id);
                          setTenantSearch(`${tenant.firstName} ${tenant.lastName}`);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                          selectedTenantId === tenant.id ? 'bg-green-50' : ''
                        }`}
                      >
                        {tenant.firstName} {tenant.lastName}{tenant.email ? ` - ${tenant.email}` : ''}
                      </button>
                    ))}
                  </div>
                )}
                <input type="hidden" name="tenantId" value={selectedTenantId} required />
              </div>

              {/* Property & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => {
                      setSelectedPropertyId(e.target.value);
                      setSelectedUnitId('');
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">Select Property</option>
                    {getAvailableProperties().map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    name="unitId"
                    required
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    disabled={!selectedPropertyId}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">{selectedPropertyId ? 'Select Unit' : 'Select Property First'}</option>
                    {selectedPropertyId && getAvailableUnitsForProperty(selectedPropertyId).map(unit => (
                      <option key={unit.id} value={unit.id}>
                        Unit {unit.unitNumber} ({unit.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contract Number & Rent */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Number *
                  </label>
                  <input
                    type="text"
                    name="contractNumber"
                    required
                    defaultValue={editingContract?.contractNumber || ''}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="CT-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Rent (AED) *
                  </label>
                  <input
                    type="number"
                    name="yearlyRent"
                    id="yearlyRent"
                    required
                    min="0"
                    step="1"
                    value={yearlyRent}
                    onChange={(e) => setYearlyRent(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Contract Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Duration
                </label>
                <select
                  value={contractDuration}
                  onChange={(e) => {
                    setContractDuration(e.target.value);
                    if (e.target.value === 'custom') {
                      setFormEndDate('');
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                >
                  <option value="">Select Duration</option>
                  <option value="1_year">1 Year (Auto: End date = 1 day before anniversary)</option>
                  <option value="custom">Custom (Manual dates)</option>
                </select>
              </div>

              {/* Start & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    value={formEndDate}
                    onChange={(e) => {
                      setFormEndDate(e.target.value);
                      if (contractDuration === '1_year') {
                        setContractDuration('custom'); // Switch to custom if manually changed
                      }
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Frequency, Installments, Due Date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    name="paymentFrequency"
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="1_payment">1 Payment</option>
                    <option value="2_payment">2 Payments</option>
                    <option value="3_payment">3 Payments</option>
                    <option value="4_payment">4 Payments</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Installments
                  </label>
                  <input
                    type="number"
                    name="numberOfInstallments"
                    value={calculatedInstallments || ''}
                    readOnly
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="number"
                    name="dueDateDay"
                    min="1"
                    max="31"
                    defaultValue={editingContract?.dueDateDay || ''}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Day (1-31)"
                  />
                </div>
              </div>

              {/* Dynamic Payment Amount Fields */}
              {calculatedInstallments > 0 && yearlyRent && parseFloat(yearlyRent) > 0 && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Payment Amounts (AED) *
                    </label>
                    <span className="text-xs text-gray-500">
                      Total must equal {Math.round(parseFloat(yearlyRent)).toLocaleString('en-US')} AED
                    </span>
                  </div>
                  <div className="space-y-2">
                    {paymentAmounts.map((amount, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-24 flex-shrink-0">
                          Payment {index + 1}
                        </label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => {
                            const newAmounts = [...paymentAmounts];
                            newAmounts[index] = e.target.value;
                            setPaymentAmounts(newAmounts);
                          }}
                          required
                          min="1"
                          step="1"
                          placeholder="0"
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Running total */}
                  {(() => {
                    const total = paymentAmounts.reduce((sum, a) => sum + (parseFloat(a) || 0), 0);
                    const yearlyRentNum = parseFloat(yearlyRent) || 0;
                    const diff = Math.round(total - yearlyRentNum);
                    const isMatch = Math.abs(diff) <= 0.01;
                    return (
                      <div className={`mt-2 pt-2 border-t border-gray-300 flex items-center justify-between text-sm ${isMatch ? 'text-green-700' : 'text-red-600'}`}>
                        <span className="font-medium">
                          Total: AED {Math.round(total).toLocaleString('en-US')}
                        </span>
                        {isMatch ? (
                          <span className="flex items-center text-green-600 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Matches total rent
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 text-xs font-medium">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            {diff > 0 ? `Over by AED ${diff.toLocaleString('en-US')}` : `Short by AED ${Math.abs(diff).toLocaleString('en-US')}`}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Status & Payment Reminder */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingContract?.status || 'draft'}
                    disabled={editingContract?.status === 'active'}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="terminated" disabled={!editingContract || editingContract.status !== 'active'}>
                      Terminated
                    </option>
                  </select>
                  {editingContract?.status === 'active' && user?.role !== 'admin' && (
                    <p className="text-xs text-gray-500 mt-1">Active contracts cannot be edited. Use Terminate button instead.</p>
                  )}
                  {editingContract?.status === 'active' && user?.role === 'admin' && (
                    <p className="text-xs text-green-600 mt-1">As admin you can edit this contract. Related invoices will be updated to match (invoice numbers stay the same).</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Reminder
                  </label>
                  <select
                    name="reminderPeriod"
                    defaultValue={editingContract?.reminderPeriod || ''}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">No Reminders</option>
                    <option value="3_days">3 Days Before</option>
                    <option value="1_week">1 Week Before</option>
                    <option value="2_weeks">2 Weeks Before</option>
                    <option value="1_month">1 Month Before</option>
                  </select>
                </div>
              </div>

              {/* Security Deposit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Deposit (AED) *
                </label>
                <input
                  type="number"
                  name="securityDeposit"
                  required
                  min="0"
                  step="1"
                  defaultValue={editingContract?.securityDeposit || ''}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingContract?.notes || ''}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Additional notes about this contract..."
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
                  {editingContract ? 'Update Contract' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Contract Modal */}
      {viewingContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Contract Details</h2>
              <button onClick={() => setViewingContract(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tenant & Unit Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Tenant Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Name:</span> <span className="font-medium">{viewingContract.tenant.firstName} {viewingContract.tenant.lastName}</span></p>
                    <p><span className="text-gray-600">Email:</span> <span className="font-medium">{viewingContract.tenant.email || '—'}</span></p>
                    <p><span className="text-gray-600">Phone:</span> <span className="font-medium">{viewingContract.tenant.phone}</span></p>
                    <p><span className="text-gray-600">National ID:</span> <span className="font-medium">{viewingContract.tenant.nationalId}</span></p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Unit Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Property:</span> <span className="font-medium">{viewingContract.property.name}</span></p>
                    <p><span className="text-gray-600">Unit:</span> <span className="font-medium">{viewingContract.unit.unitNumber}</span></p>
                    <p><span className="text-gray-600">Type:</span> <span className="font-medium">{viewingContract.unit.type}</span></p>
                    <p><span className="text-gray-600">Size:</span> <span className="font-medium">{viewingContract.unit.squareFeet} sq ft</span></p>
                  </div>
                </div>
              </div>

              {/* Contract Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Contract Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <p><span className="text-gray-600">Status:</span> <span className={cn('ml-2 px-2 py-1 rounded-full text-xs font-semibold', getStatusColor(viewingContract.status))}>{viewingContract.status}</span></p>
                  <p><span className="text-gray-600">Start Date:</span> <span className="font-medium">{formatDate(viewingContract.startDate)}</span></p>
                  <p><span className="text-gray-600">End Date:</span> <span className="font-medium">{formatDate(viewingContract.endDate)}</span></p>
                  <p><span className="text-gray-600">Monthly Rent:</span> <span className="font-medium">{formatCurrency(viewingContract.monthlyRent)}</span></p>
                  <p><span className="text-gray-600">Security Deposit:</span> <span className="font-medium">{formatCurrency(viewingContract.securityDeposit)}</span></p>
                  <p><span className="text-gray-600">Payment Frequency:</span> <span className="font-medium">{formatPaymentFrequency(viewingContract.paymentFrequency)}</span></p>
                  <p><span className="text-gray-600">Installments:</span> <span className="font-medium">{viewingContract.numberOfInstallments}</span></p>
                  {viewingContract.reminderPeriod && (
                    <p><span className="text-gray-600">Reminder:</span> <span className="font-medium">{viewingContract.reminderPeriod.replace('_', ' ')}</span></p>
                  )}
                </div>
              </div>

              {/* Invoices Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Invoices Summary</h3>
                {(() => {
                  const contractInvoices = invoices.filter(inv => inv.contractId === viewingContract.id);
                  const paid = contractInvoices.filter(inv => inv.status === 'paid').length;
                  const pending = contractInvoices.filter(inv => inv.status === 'pending').length;
                  const overdue = contractInvoices.filter(inv => inv.status === 'overdue').length;
                  const partial = contractInvoices.filter(inv => inv.status === 'partial').length;

                  return (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-success-50 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-success-700">{paid}</p>
                        <p className="text-sm text-success-600 mt-1">Paid</p>
                      </div>
                      <div className="bg-warning-50 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-warning-700">{pending}</p>
                        <p className="text-sm text-warning-600 mt-1">Pending</p>
                      </div>
                      <div className="bg-primary-50 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-primary-700">{partial}</p>
                        <p className="text-sm text-primary-600 mt-1">Partial</p>
                      </div>
                      <div className="bg-danger-50 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-danger-700">{overdue}</p>
                        <p className="text-sm text-danger-600 mt-1">Overdue</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {viewingContract.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{viewingContract.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {(viewingContract.status === 'draft' || (viewingContract.status === 'active' && user?.role === 'admin')) && (
                  <button
                    type="button"
                    onClick={() => {
                      openEditForm(viewingContract);
                      setViewingContract(null);
                    }}
                    className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Edit Contract
                  </button>
                )}
                {viewingContract.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteDraft(viewingContract.id)}
                    className="flex items-center px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete contract
                  </button>
                )}
                {viewingContract.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewingContract(null);
                      handleTerminate(viewingContract.id);
                    }}
                    className="flex items-center px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Terminate Contract
                  </button>
                )}
              </div>

              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Attachments</h3>
                  <button
                    onClick={() => {
                      setAttachmentContractId(viewingContract.id);
                      setContractAttachments(viewingContract.attachments || []);
                      setShowAttachmentsModal(true);
                    }}
                    className="flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Attachment
                  </button>
                </div>
                {viewingContract.attachments && viewingContract.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {viewingContract.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Paperclip className="w-4 h-4 text-gray-600 mr-2" />
                          <span className="text-sm text-gray-700">
                            {attachment.startsWith('data:') ? `Attachment ${index + 1}` : attachment.split('/').pop() || `Attachment ${index + 1}`}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          {(attachment.startsWith('data:') || attachment.startsWith('http')) && (
                            <button
                              type="button"
                              onClick={() => setViewingAttachmentUrl(attachment)}
                              className="text-sm text-green-600 hover:text-green-700 font-medium"
                            >
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              const next = (viewingContract.attachments || []).filter((_, i) => i !== index);
                              try {
                                await dataService.updateContract(viewingContract.id, { attachments: next }, user?.id, user?.role);
                                setViewingContract({ ...viewingContract, attachments: next });
                                await loadData();
                              } catch (e) {
                                console.error(e);
                                alert('Failed to remove attachment.');
                              }
                            }}
                            className="p-1 text-red-600 hover:text-red-700 transition-colors"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No attachments yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment viewer modal - so data URLs open reliably */}
      {viewingAttachmentUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4"
          onClick={() => setViewingAttachmentUrl(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Attachment</span>
              <button
                type="button"
                onClick={() => setViewingAttachmentUrl(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 min-h-[200px] bg-gray-100">
              {viewingAttachmentUrl.startsWith('data:image/') || (viewingAttachmentUrl.startsWith('data:') && viewingAttachmentUrl.includes('image/')) ? (
                <img src={viewingAttachmentUrl} alt="Attachment" className="max-w-full max-h-[75vh] object-contain mx-auto" />
              ) : viewingAttachmentUrl.startsWith('data:application/pdf') || (viewingAttachmentUrl.startsWith('data:') && viewingAttachmentUrl.includes('pdf')) ? (
                <iframe src={viewingAttachmentUrl} title="PDF" className="w-full h-[75vh] border-0 rounded" />
              ) : viewingAttachmentUrl.startsWith('http') ? (
                <iframe src={viewingAttachmentUrl} title="Attachment" className="w-full h-[75vh] border-0 rounded" />
              ) : (
                <iframe src={viewingAttachmentUrl} title="Attachment" className="w-full h-[75vh] border-0 rounded" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Contract Attachments Modal */}
      {showAttachmentsModal && attachmentContractId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">Manage Attachments</h2>
              <button
                onClick={() => {
                  setShowAttachmentsModal(false);
                  setAttachmentContractId(null);
                  setContractAttachments([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Current Attachments */}
              {contractAttachments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Current Attachments</h3>
                  {contractAttachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center flex-1 min-w-0">
                        <Paperclip className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">
                          {attachment.startsWith('data:') ? `Attachment ${index + 1}` : attachment.split('/').pop() || `Attachment ${index + 1}`}
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        {(attachment.startsWith('data:') || attachment.startsWith('http')) && (
                          <button
                            type="button"
                            onClick={() => setViewingAttachmentUrl(attachment)}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                          >
                            View
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setContractAttachments(contractAttachments.filter((_, i) => i !== index));
                          }}
                          className="ml-2 p-1 text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload New Attachment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add New Attachments
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      // Convert all files to base64
                      const newAttachments: string[] = [];
                      let processedCount = 0;
                      
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          newAttachments.push(base64);
                          processedCount++;
                          
                          // When all files are processed, update state
                          if (processedCount === files.length) {
                            setContractAttachments([...contractAttachments, ...newAttachments]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                    // Reset the input so the same files can be selected again if needed
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Supported: PDF, DOC, DOCX, JPG, PNG, TXT (You can select multiple files)</p>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentsModal(false);
                    setAttachmentContractId(null);
                    setContractAttachments([]);
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await dataService.updateContract(attachmentContractId, { attachments: contractAttachments }, user?.id, user?.role);
                      await loadData();
                      // Reload the contract to get updated data
                      const updatedContracts = await dataService.getContracts();
                      const updatedContract = updatedContracts.find(c => c.id === attachmentContractId);
                      if (updatedContract) {
                        setViewingContract(updatedContract);
                      }
                      setShowAttachmentsModal(false);
                      setAttachmentContractId(null);
                      setContractAttachments([]);
                    } catch (error) {
                      console.error('Error updating attachments:', error);
                      alert('Failed to update attachments. Please try again.');
                    }
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Save Attachments
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Tenant Form Modal */}
      {showTenantForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">Add New Tenant</h2>
              <button
                onClick={() => {
                  setShowTenantForm(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <TenantForm
              onSuccess={(newTenant) => {
                loadData(); // Reload tenants
                setShowTenantForm(false);
                // Auto-select the newly created tenant in the contract form
                if (showForm) {
                  setSelectedTenantId(newTenant.id);
                  setTenantSearch(`${newTenant.firstName} ${newTenant.lastName}`);
                }
              }}
              onCancel={() => setShowTenantForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Tenant Form Component (extracted from Tenants.tsx)
function TenantForm({ onSuccess, onCancel }: { onSuccess: (tenant: Tenant) => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    const formData = new FormData(e.currentTarget);

    const idExpiryDateStr = formData.get('idExpiryDate') as string;
    const idExpiryDate = idExpiryDateStr ? new Date(idExpiryDateStr) : undefined;

    const idNumber = formData.get('idNumber') as string;
    const emailRaw = (formData.get('email') as string) || '';
    const email = emailRaw.trim() || undefined;
    const tenantData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email,
      phone: formData.get('phone') as string,
      whatsappNumber: formData.get('whatsappNumber') as string,
      nationalId: idNumber || formData.get('nationalId') as string || '',
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

    try {
      const result = await dataService.createTenant(tenantData, user?.id, user?.role);
      if ('requiresApproval' in result) {
        alert(result.message || 'Tenant creation request submitted for approval');
        onCancel(); // Close the form
      } else {
        onSuccess(result);
      }
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      setError(error?.message || 'Failed to create tenant. Please try again.');
    }
  };

  const handleCopyPhoneToWhatsApp = (phoneValue: string, whatsappInput: HTMLInputElement) => {
    whatsappInput.value = phoneValue;
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto flex-1">
      {error && (
        <div className="bg-danger-50 border-l-4 border-danger-500 p-3 rounded text-sm">
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* First Name & Last Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            name="firstName"
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
            defaultValue="emirates_id"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
          >
            <option value="passport">Passport</option>
            <option value="emirates_id">Emirates ID</option>
            <option value="driver_license">Driver License</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID Number
          </label>
          <input
            type="text"
            name="idNumber"
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
              id="tenant-phone-input"
              required
              className="w-full px-3 py-1.5 pr-9 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="+971501234567"
            />
            <button
              type="button"
              onClick={(e) => {
                const phoneInput = e.currentTarget.parentElement?.querySelector('#tenant-phone-input') as HTMLInputElement;
                const whatsappInput = document.getElementById('tenant-whatsapp-input') as HTMLInputElement;
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
            id="tenant-whatsapp-input"
            required
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="+971501234567"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          name="email"
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
            defaultValue="bank_transfer"
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
            defaultValue="whatsapp"
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
              required
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="+971501234567"
            />
          </div>
        </div>
      </div>

      {/* Hidden National ID for backward compatibility */}
      <input type="hidden" name="nationalId" value="" />

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
        >
          Add Tenant
        </button>
      </div>
    </form>
  );
}

