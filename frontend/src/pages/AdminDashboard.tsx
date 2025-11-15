import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import useRequestStore from '../store/useRequestStore';
import { useAuth } from '../contexts/AuthContext';

interface OvertimeRequest {
  id: number;
  frappe_employee_id: string;
  payroll_date: string;
  hours: number;
  minutes: number;
  projects_affected: string;
  reason: string;
  approved_by: string | null;
  rejected_by: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth(); // Get authenticated user
  const {
    requests,
    fetchPendingRequests,
    approveRequest,
    rejectRequest,
    isLoading,
    error,
    successMessage,
    clearMessages
  } = useRequestStore();

  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleApprove = async (request: OvertimeRequest) => {
    try {
      clearMessages();
      // Approve request (approvedBy is now set automatically from session in backend)
      await approveRequest(request.id);
      // Refresh the list
      fetchPendingRequests();
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  const handleRejectClick = (request: OvertimeRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (!selectedRequest) return;

    try {
      clearMessages();
      // Reject request (rejectedBy is now set automatically from session in backend)
      await rejectRequest(selectedRequest.id, rejectReason);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      // Refresh the list
      fetchPendingRequests();
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  const getStatusBadge = (request: OvertimeRequest) => {
    if (request.reject_reason) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      );
    }
    if (request.approved_by) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Review and approve overtime/undertime requests</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-900">Success!</p>
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Requests List */}
      {!isLoading && (
        <div className="grid gap-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No pending requests at this time</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Request #{request.id}
                      </CardTitle>
                      <CardDescription>
                        Employee ID: {request.frappe_employee_id}
                      </CardDescription>
                    </div>
                    {getStatusBadge(request)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Date:</p>
                      <p className="text-gray-900">
                        {format(new Date(request.payroll_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Duration:</p>
                      <p className="text-gray-900">
                        {request.hours}h {request.minutes}m
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Project/Task:</p>
                      <p className="text-gray-900">{request.projects_affected}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Submitted:</p>
                      <p className="text-gray-900">
                        {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700 mb-1">Reason:</p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded">{request.reason}</p>
                  </div>

                  {request.reject_reason && (
                    <div>
                      <p className="font-medium text-red-700 mb-1">Rejection Reason:</p>
                      <p className="text-red-900 bg-red-50 p-3 rounded border border-red-200">
                        {request.reject_reason}
                      </p>
                    </div>
                  )}

                  {!request.approved_by && !request.reject_reason && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => handleApprove(request)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectClick(request)}
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Request</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this request:
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectReason('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
