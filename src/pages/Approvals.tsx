import { useState, useEffect } from 'react';
import { FileText, DollarSign, AlertCircle, Users, Building2 } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { ApprovalRequestWithDetails, ApprovalRequestType, InvoiceWithDetails, Property } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function Approvals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequestWithDetails[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceWithDetails | null>(null);

  // Check if user is admin (with trimming to handle whitespace issues)
  const isAdmin = user?.role?.trim() === 'admin';

  // Helper function to handle approval request data updates
  const handleApprovalRequestUpdate = async (updatedData: any) => {
    if (!selectedRequest) return;
    
    // Update local state
    const updated = {
      ...selectedRequest,
      requestData: { ...selectedRequest.requestData, ...updatedData }
    };
    setSelectedRequest(updated);
    
    // Update approval request in database
    try {
      await dataService.updateApprovalRequestData(selectedRequest.id, updatedData);
    } catch (error) {
      console.error('Error updating approval request data:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadRequests();
    }
  }, [user, filter, isAdmin]);


  const loadRequests = async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4577611a-76d2-4bec-b115-9908c0ccfa71',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Approvals.tsx:loadRequests:entry',message:'Loading approval requests',data:{filter,userRole:user?.role,isAdmin},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.log('=== APPROVALS PAGE: Loading requests ===');
      console.log('Current filter:', filter);
      console.log('User role:', user?.role);
      
      const data = await dataService.getApprovalRequests(
        filter === 'all' ? undefined : filter,
        undefined
      );
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4577611a-76d2-4bec-b115-9908c0ccfa71',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Approvals.tsx:loadRequests:result',message:'Approval requests loaded',data:{count:data.length,unitCreateCount:data.filter(r=>r.requestType==='unit_create').length,requests:data.map(r=>({id:r.id,requestType:r.requestType,status:r.status}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      console.log('Approvals page - received data:', data);
      console.log('Number of requests:', data.length);
      console.log('========================================');
      
      setRequests(data);
    } catch (error) {
      console.error('Error loading approval requests:', error);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await dataService.approveRequest(requestId, user.id);
      if (result.success) {
        await loadRequests();
        setSelectedRequest(null);
        alert('Request approved and processed successfully');
      } else {
        alert(result.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setLoading(true);
    try {
      const result = await dataService.rejectRequest(requestId, user.id, rejectionReason);
      if (result.success) {
        await loadRequests();
        setSelectedRequest(null);
        setRejectionReason('');
        alert('Request rejected');
      } else {
        alert(result.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const getRequestTypeIcon = (type: ApprovalRequestType) => {
    switch (type) {
      case 'contract_create':
      case 'contract_terminate':
      case 'contract_cancel':
        return <FileText className="w-5 h-5" />;
      case 'payment_create':
      case 'payment_delete':
        return <DollarSign className="w-5 h-5" />;
      case 'tenant_create':
        return <Users className="w-5 h-5" />;
      case 'property_create':
        return <Building2 className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getRequestTypeLabel = (type: ApprovalRequestType) => {
    switch (type) {
      case 'contract_create':
        return 'Create Contract';
      case 'contract_terminate':
        return 'Terminate Contract';
      case 'contract_cancel':
        return 'Cancel Contract';
      case 'payment_create':
        return 'Create Payment';
      case 'payment_delete':
        return 'Delete Payment';
      case 'tenant_create':
        return 'Create Tenant';
      case 'property_create':
        return 'Create Property';
      default:
        return type;
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Approval Requests</h1>
        <p className="text-gray-600 mt-1">Review and approve pending requests</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="py-10 text-center text-gray-600">
            No {filter === 'all' ? '' : filter} requests found
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="border-b border-gray-100 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={async () => {
                setSelectedRequest(request);
                setRejectionReason('');
                
                // If it's a payment request, load invoice details
                if (request.requestType === 'payment_create' && request.requestData?.invoiceId) {
                  try {
                    const invoices = await dataService.getInvoices();
                    const invoice = invoices.find(inv => inv.id === request.requestData.invoiceId);
                    setInvoiceDetails(invoice || null);
                  } catch (error) {
                    console.error('Error loading invoice details:', error);
                    setInvoiceDetails(null);
                  }
                } else {
                  setInvoiceDetails(null);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getRequestTypeIcon(request.requestType)}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {getRequestTypeLabel(request.requestType)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Requested by {request.requesterName || 'Unknown'} • {formatDate(request.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {request.status === 'pending' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      Pending
                    </span>
                  )}
                  {request.status === 'approved' && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Approved
                    </span>
                  )}
                  {request.status === 'rejected' && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approval Modal */}
      {selectedRequest && selectedRequest.status === 'pending' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {getRequestTypeLabel(selectedRequest.requestType)}
              </h2>
              
              {/* Request Details */}
              <div className="mb-6 space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Requested by:</span>
                  <p className="text-gray-900">{selectedRequest.requesterName || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Request Date:</span>
                  <p className="text-gray-900">{formatDate(selectedRequest.createdAt)}</p>
                </div>
                
                {/* Show request data based on type - Render appropriate editor component */}
                {selectedRequest.requestType === 'tenant_create' && (
                  <TenantApprovalEditor
                    request={selectedRequest}
                    onUpdate={handleApprovalRequestUpdate}
                  />
                )}
                
                {selectedRequest.requestType === 'property_create' && (
                  <PropertyApprovalEditor
                    request={selectedRequest}
                    onUpdate={handleApprovalRequestUpdate}
                  />
                )}
                
                {selectedRequest.requestType === 'contract_create' && (
                  <ContractApprovalEditor
                    request={selectedRequest}
                    onUpdate={handleApprovalRequestUpdate}
                  />
                )}
                
                {selectedRequest.requestType === 'contract_terminate' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Termination Request</h3>
                    <p className="text-sm text-gray-700">
                      Contract ID: {selectedRequest.requestData.contractId}
                    </p>
                  </div>
                )}
                
                {selectedRequest.requestType === 'payment_create' && (
                  <>
                    {/* Invoice Details */}
                    {invoiceDetails && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="font-semibold mb-3 text-blue-900">Invoice Information</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Invoice Number:</span>
                            <p className="text-gray-900 font-semibold">{invoiceDetails.invoiceNumber}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Installment:</span>
                            <p className="text-gray-900">
                              {invoiceDetails.installmentNumber}/{invoiceDetails.contract.numberOfInstallments}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Tenant:</span>
                            <p className="text-gray-900">
                              {invoiceDetails.tenant.firstName} {invoiceDetails.tenant.lastName}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Property:</span>
                            <p className="text-gray-900">
                              {invoiceDetails.property.name} - Unit {invoiceDetails.unit.unitNumber}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Invoice Amount:</span>
                            <p className="text-gray-900 font-semibold">{formatCurrency(invoiceDetails.amount)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Remaining Amount:</span>
                            <p className="text-gray-900 font-semibold">{formatCurrency(invoiceDetails.remainingAmount)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Due Date:</span>
                            <p className="text-gray-900">{formatDate(invoiceDetails.dueDate)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Status:</span>
                            <p className="text-gray-900 capitalize">{invoiceDetails.status}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Details */}
                    <PaymentApprovalEditor
                      request={selectedRequest}
                      onUpdate={handleApprovalRequestUpdate}
                    />
                  </>
                )}
              </div>

              {/* Rejection Reason Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter reason for rejection..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectionReason('');
                    setInvoiceDetails(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedRequest.id)}
                  disabled={loading || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tenant Approval Editor Component
function TenantApprovalEditor({ 
  request, 
  onUpdate 
}: { 
  request: ApprovalRequestWithDetails; 
  onUpdate: (data: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(request.requestData);
  
  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...editedData, [field]: value };
    setEditedData(updated);
    onUpdate(updated);
  };
  
  if (!isEditing) {
    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-blue-900">Tenant Information</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-600">Name:</span>
            <p className="text-gray-900 font-semibold">
              {editedData.firstName} {editedData.lastName}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Email:</span>
            <p className="text-gray-900">{editedData.email}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Phone:</span>
            <p className="text-gray-900">{editedData.phone}</p>
          </div>
          {editedData.secondaryPhone && (
            <div>
              <span className="font-medium text-gray-600">Secondary Phone:</span>
              <p className="text-gray-900">{editedData.secondaryPhone}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-600">WhatsApp:</span>
            <p className="text-gray-900">{editedData.whatsappNumber}</p>
          </div>
          {editedData.secondaryWhatsappNumber && (
            <div>
              <span className="font-medium text-gray-600">Secondary WhatsApp:</span>
              <p className="text-gray-900">{editedData.secondaryWhatsappNumber}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-600">National ID:</span>
            <p className="text-gray-900">{editedData.nationalId}</p>
          </div>
          {editedData.idType && (
            <div>
              <span className="font-medium text-gray-600">ID Type:</span>
              <p className="text-gray-900 capitalize">{editedData.idType.replace('_', ' ')}</p>
            </div>
          )}
          {editedData.idNumber && (
            <div>
              <span className="font-medium text-gray-600">ID Number:</span>
              <p className="text-gray-900">{editedData.idNumber}</p>
            </div>
          )}
          {editedData.idExpiryDate && (
            <div>
              <span className="font-medium text-gray-600">ID Expiry Date:</span>
              <p className="text-gray-900">{formatDate(new Date(editedData.idExpiryDate))}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-600">Emergency Contact:</span>
            <p className="text-gray-900">{editedData.emergencyContact}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Emergency Phone:</span>
            <p className="text-gray-900">{editedData.emergencyPhone}</p>
          </div>
          {editedData.billingAddress && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Billing Address:</span>
              <p className="text-gray-900">{editedData.billingAddress}</p>
            </div>
          )}
          {editedData.paymentMethod && (
            <div>
              <span className="font-medium text-gray-600">Payment Method:</span>
              <p className="text-gray-900 capitalize">{editedData.paymentMethod.replace('_', ' ')}</p>
            </div>
          )}
          {editedData.notificationPreference && (
            <div>
              <span className="font-medium text-gray-600">Notification Preference:</span>
              <p className="text-gray-900 capitalize">{editedData.notificationPreference}</p>
            </div>
          )}
          {editedData.notes && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Notes:</span>
              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{editedData.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-blue-900">Edit Tenant Information</h3>
        <button
          onClick={() => setIsEditing(false)}
          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel Edit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
          <input
            type="text"
            value={editedData.firstName || ''}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
          <input
            type="text"
            value={editedData.lastName || ''}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={editedData.email || ''}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input
            type="text"
            value={editedData.phone || ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
          <input
            type="text"
            value={editedData.whatsappNumber || ''}
            onChange={(e) => handleFieldChange('whatsappNumber', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">National ID</label>
          <input
            type="text"
            value={editedData.nationalId || ''}
            onChange={(e) => handleFieldChange('nationalId', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact</label>
          <input
            type="text"
            value={editedData.emergencyContact || ''}
            onChange={(e) => handleFieldChange('emergencyContact', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Phone</label>
          <input
            type="text"
            value={editedData.emergencyPhone || ''}
            onChange={(e) => handleFieldChange('emergencyPhone', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        {editedData.notes !== undefined && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={editedData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={3}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Property Approval Editor Component
function PropertyApprovalEditor({ 
  request, 
  onUpdate 
}: { 
  request: ApprovalRequestWithDetails; 
  onUpdate: (data: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(request.requestData);
  
  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...editedData, [field]: value };
    setEditedData(updated);
    onUpdate(updated);
  };
  
  if (!isEditing) {
    return (
      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-green-900">Property Information</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-600">Name:</span>
            <p className="text-gray-900 font-semibold">{editedData.name}</p>
          </div>
          {editedData.shortCode && (
            <div>
              <span className="font-medium text-gray-600">Short Code:</span>
              <p className="text-gray-900">{editedData.shortCode}</p>
            </div>
          )}
          <div className="col-span-2">
            <span className="font-medium text-gray-600">Address:</span>
            <p className="text-gray-900">{editedData.address}</p>
          </div>
          {editedData.addressLine2 && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Address Line 2:</span>
              <p className="text-gray-900">{editedData.addressLine2}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-600">City:</span>
            <p className="text-gray-900">{editedData.city}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">State:</span>
            <p className="text-gray-900">{editedData.state || '—'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Country:</span>
            <p className="text-gray-900">{editedData.country}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Postal Code:</span>
            <p className="text-gray-900">{editedData.postalCode || '—'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <p className="text-gray-900">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                editedData.isActive !== false 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {editedData.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
          {editedData.images && editedData.images.length > 0 && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Images ({editedData.images.length}):</span>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {editedData.images.map((img: string, idx: number) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Property ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-300"
                  />
                ))}
              </div>
            </div>
          )}
          {editedData.notes && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Notes:</span>
              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{editedData.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-green-900">Edit Property Information</h3>
        <button
          onClick={() => setIsEditing(false)}
          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel Edit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input
            type="text"
            value={editedData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        {editedData.shortCode !== undefined && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Short Code</label>
            <input
              type="text"
              value={editedData.shortCode || ''}
              onChange={(e) => handleFieldChange('shortCode', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        )}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
          <input
            type="text"
            value={editedData.address || ''}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        {editedData.addressLine2 !== undefined && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 2</label>
            <input
              type="text"
              value={editedData.addressLine2 || ''}
              onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
          <input
            type="text"
            value={editedData.city || ''}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
          <input
            type="text"
            value={editedData.state || ''}
            onChange={(e) => handleFieldChange('state', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Country *</label>
          <input
            type="text"
            value={editedData.country || ''}
            onChange={(e) => handleFieldChange('country', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Postal Code</label>
          <input
            type="text"
            value={editedData.postalCode || ''}
            onChange={(e) => handleFieldChange('postalCode', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={editedData.isActive !== false ? 'active' : 'inactive'}
            onChange={(e) => handleFieldChange('isActive', e.target.value === 'active')}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {editedData.notes !== undefined && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={editedData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={3}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Contract Approval Editor Component
function ContractApprovalEditor({ 
  request, 
  onUpdate 
}: { 
  request: ApprovalRequestWithDetails; 
  onUpdate: (data: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(request.requestData);
  
  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...editedData, [field]: value };
    setEditedData(updated);
    onUpdate(updated);
  };
  
  if (!isEditing) {
    return (
      <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-orange-900">Contract Information</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-600">Monthly Rent:</span>
            <p className="text-gray-900 font-semibold">{formatCurrency(editedData.monthlyRent)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Security Deposit:</span>
            <p className="text-gray-900 font-semibold">{formatCurrency(editedData.securityDeposit)}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Start Date:</span>
            <p className="text-gray-900">{formatDate(new Date(editedData.startDate))}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">End Date:</span>
            <p className="text-gray-900">{formatDate(new Date(editedData.endDate))}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Payment Frequency:</span>
            <p className="text-gray-900">
              {editedData.paymentFrequency === '1_payment' ? '1 Payment' :
               editedData.paymentFrequency === '2_payment' ? '2 Payments' :
               editedData.paymentFrequency === '3_payment' ? '3 Payments' :
               editedData.paymentFrequency === '4_payment' ? '4 Payments' :
               editedData.paymentFrequency}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <p className="text-gray-900 capitalize">{editedData.status}</p>
          </div>
          {editedData.notes && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Notes:</span>
              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{editedData.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-orange-900">Edit Contract Information</h3>
        <button
          onClick={() => setIsEditing(false)}
          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel Edit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Rent *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={editedData.monthlyRent || ''}
            onChange={(e) => handleFieldChange('monthlyRent', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Security Deposit *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={editedData.securityDeposit || ''}
            onChange={(e) => handleFieldChange('securityDeposit', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
          <input
            type="date"
            value={editedData.startDate ? new Date(editedData.startDate).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFieldChange('startDate', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
          <input
            type="date"
            value={editedData.endDate ? new Date(editedData.endDate).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFieldChange('endDate', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Frequency *</label>
          <select
            value={editedData.paymentFrequency || ''}
            onChange={(e) => handleFieldChange('paymentFrequency', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          >
            <option value="">Select Frequency</option>
            <option value="1_payment">1 Payment</option>
            <option value="2_payment">2 Payments</option>
            <option value="3_payment">3 Payments</option>
            <option value="4_payment">4 Payments</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status *</label>
          <select
            value={editedData.status || ''}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          >
            <option value="">Select Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
        {editedData.notes !== undefined && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={editedData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={3}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Payment Approval Editor Component
function PaymentApprovalEditor({ 
  request, 
  onUpdate 
}: { 
  request: ApprovalRequestWithDetails; 
  onUpdate: (data: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(request.requestData);
  
  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...editedData, [field]: value };
    setEditedData(updated);
    onUpdate(updated);
  };
  
  if (!isEditing) {
    return (
      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-green-900">Payment Information</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-600">Amount:</span>
            <p className="text-gray-900 font-semibold text-lg text-green-600">
              {formatCurrency(editedData.amount)}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Payment Method:</span>
            <p className="text-gray-900 capitalize">
              {editedData.paymentMethod?.replace('_', ' ') || 'N/A'}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-600">Payment Date:</span>
            <p className="text-gray-900">{formatDate(new Date(editedData.paymentDate))}</p>
          </div>
          {editedData.referenceNumber && (
            <div>
              <span className="font-medium text-gray-600">Reference Number:</span>
              <p className="text-gray-900 font-mono">{editedData.referenceNumber}</p>
            </div>
          )}
          {editedData.notes && (
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Notes:</span>
              <p className="text-gray-700 mt-1 whitespace-pre-wrap">{editedData.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-green-900">Edit Payment Information</h3>
        <button
          onClick={() => setIsEditing(false)}
          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel Edit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={editedData.amount || ''}
            onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method *</label>
          <select
            value={editedData.paymentMethod || ''}
            onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          >
            <option value="">Select Method</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date *</label>
          <input
            type="date"
            value={editedData.paymentDate ? new Date(editedData.paymentDate).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFieldChange('paymentDate', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reference Number</label>
          <input
            type="text"
            value={editedData.referenceNumber || ''}
            onChange={(e) => handleFieldChange('referenceNumber', e.target.value || undefined)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
            placeholder="Optional"
          />
        </div>
        {editedData.notes !== undefined && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={editedData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value || undefined)}
              rows={3}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Optional"
            />
          </div>
        )}
      </div>
    </div>
  );
}

