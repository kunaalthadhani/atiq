import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { ApprovalRequestWithDetails, ApprovalRequestType } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function Approvals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequestWithDetails[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadRequests();
    }
  }, [user, filter]);

  const loadRequests = async () => {
    try {
      const data = await dataService.getApprovalRequests(
        filter === 'all' ? undefined : filter,
        undefined
      );
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
      default:
        return type;
    }
  };

  if (user?.role !== 'admin') {
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
              onClick={() => setSelectedRequest(request)}
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
                
                {/* Show request data based on type */}
                {selectedRequest.requestType === 'contract_create' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Contract Details</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Monthly Rent:</span>{' '}
                        {formatCurrency(selectedRequest.requestData.monthlyRent)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Security Deposit:</span>{' '}
                        {formatCurrency(selectedRequest.requestData.securityDeposit)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Start Date:</span>{' '}
                        {formatDate(new Date(selectedRequest.requestData.startDate))}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">End Date:</span>{' '}
                        {formatDate(new Date(selectedRequest.requestData.endDate))}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Status:</span>{' '}
                        {selectedRequest.requestData.status}
                      </div>
                    </div>
                  </div>
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
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Payment Details</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Amount:</span>{' '}
                        {formatCurrency(selectedRequest.requestData.amount)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Payment Method:</span>{' '}
                        {selectedRequest.requestData.paymentMethod?.replace('_', ' ') || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Payment Date:</span>{' '}
                        {formatDate(new Date(selectedRequest.requestData.paymentDate))}
                      </div>
                      {selectedRequest.requestData.referenceNumber && (
                        <div>
                          <span className="font-medium text-gray-600">Reference:</span>{' '}
                          {selectedRequest.requestData.referenceNumber}
                        </div>
                      )}
                    </div>
                  </div>
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

