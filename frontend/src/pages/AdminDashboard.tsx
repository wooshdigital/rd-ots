import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Bell, BellOff, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { cn } from '../lib/utils';
import useRequestStore from '../store/useRequestStore';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../lib/socket';
import notificationService from '../lib/notifications';

interface OvertimeRequest {
  id: number;
  frappe_employee_id: string;
  employee_name: string | null;
  payroll_date: string;
  hours: number;
  minutes: number;
  projects_affected: string;
  reason: string;
  approved_by: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const {
    approveRequest,
    rejectRequest,
    isLoading,
    error,
    successMessage,
    clearMessages,
  } = useRequestStore();

  const [allRequests, setAllRequests] = useState<OvertimeRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<OvertimeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all requests
  const fetchAllRequests = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3009/api'}/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setAllRequests(data.data);
      } else {
        console.error('Failed to fetch requests:', data.error || data.message);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  };

  // Handle new request from WebSocket
  const handleNewRequest = useCallback((newRequest: any) => {
    console.log('Received new request via WebSocket:', newRequest);

    // Show browser notification
    if (notificationsEnabled) {
      notificationService.showNewRequestNotification({
        id: newRequest.id,
        employee_name: newRequest.employee_name,
        request_type: newRequest.request_type,
        hours: newRequest.hours,
        minutes: newRequest.minutes,
      });
    }

    // Refresh the requests list
    fetchAllRequests();
  }, [notificationsEnabled]);

  // Initialize WebSocket and notifications
  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket
    socketService.connect();
    setIsSocketConnected(true);

    // Join admin room if user is admin
    if (user.role === 'Owner' || user.role === 'HR' || user.role === 'Project Coordinator') {
      socketService.joinAdminRoom({
        email: user.email,
        role: user.role,
      });

      // Listen for new requests
      socketService.onNewRequest(handleNewRequest);
    }

    // Check if notifications are already granted
    if (notificationService.getPermission() === 'granted') {
      setNotificationsEnabled(true);
    }

    // Cleanup on unmount
    return () => {
      socketService.offNewRequest();
      socketService.disconnect();
      setIsSocketConnected(false);
    };
  }, [user, handleNewRequest]);

  // Fetch requests on mount
  useEffect(() => {
    fetchAllRequests();
  }, []);

  // Request notification permission
  const handleEnableNotifications = async () => {
    const permission = await notificationService.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
    }
  };

  // Filter requests based on tab and filters
  useEffect(() => {
    let filtered = [...allRequests];

    // Tab filtering
    if (activeTab === 'pending') {
      filtered = filtered.filter(r => !r.approved_by);
    } else if (activeTab === 'approved') {
      filtered = filtered.filter(r => r.approved_by && !r.reject_reason);
    } else if (activeTab === 'rejected') {
      filtered = filtered.filter(r => r.reject_reason);
    }

    // Search filter (employee name, employee ID, or project)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        (r.employee_name && r.employee_name.toLowerCase().includes(query)) ||
        r.frappe_employee_id.toLowerCase().includes(query) ||
        r.projects_affected.toLowerCase().includes(query)
      );
    }

    // Date range filter (filed date)
    if (dateFrom) {
      filtered = filtered.filter(r => new Date(r.created_at) >= dateFrom);
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.created_at) <= endOfDay);
    }

    setFilteredRequests(filtered);
  }, [allRequests, activeTab, searchQuery, dateFrom, dateTo]);

  const handleApprove = async (request: OvertimeRequest) => {
    try {
      clearMessages();
      await approveRequest(request.id);
      fetchAllRequests();
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
      await rejectRequest(selectedRequest.id, rejectReason);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchAllRequests();
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const getStatusBadge = (request: OvertimeRequest) => {
    if (request.reject_reason) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    }
    if (request.approved_by) {
      return (
        <Badge className="bg-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const stats = {
    total: allRequests.length,
    pending: allRequests.filter(r => !r.approved_by).length,
    approved: allRequests.filter(r => r.approved_by && !r.reject_reason).length,
    rejected: allRequests.filter(r => r.reject_reason).length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Review and approve overtime/undertime requests</p>
          {isSocketConnected && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 dark:text-green-400">Live updates enabled</span>
            </div>
          )}
        </div>

        {/* Notification Toggle */}
        {notificationService.isSupported() && (
          <Button
            onClick={handleEnableNotifications}
            variant={notificationsEnabled ? "default" : "outline"}
            className="flex items-center gap-2"
            disabled={notificationsEnabled}
          >
            {notificationsEnabled ? (
              <>
                <Bell className="h-4 w-4" />
                Notifications On
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4" />
                Enable Notifications
              </>
            )}
          </Button>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-900 dark:text-green-100">Success!</p>
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900 dark:text-red-100">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent" onClick={() => setActiveTab('pending')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent" onClick={() => setActiveTab('approved')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent" onClick={() => setActiveTab('rejected')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Name, Employee ID, or Project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Filed From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Filed To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearFilters}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
        </TabsList>

        {/* Results Count */}
        <div className="my-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredRequests.length} {activeTab !== 'all' ? activeTab : ''} request{filteredRequests.length !== 1 ? 's' : ''}
          </p>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredRequests.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No {activeTab !== 'all' ? activeTab : ''} requests found</p>
                {(searchQuery || dateFrom || dateTo) && (
                  <Button
                    variant="link"
                    onClick={clearFilters}
                    className="mt-2"
                  >
                    Clear filters to see all requests
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Requests List */}
          {!isLoading && filteredRequests.length > 0 && (
            <div className="grid gap-4">
              {filteredRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {request.employee_name || request.frappe_employee_id}
                        </CardTitle>
                        <CardDescription>
                          Request #{request.id} • {request.frappe_employee_id}
                        </CardDescription>
                      </div>
                      {getStatusBadge(request)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-muted-foreground">Date Affected:</p>
                        <p className="text-foreground">
                          {format(new Date(request.payroll_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Duration:</p>
                        <p className="text-foreground">
                          {request.hours}h {request.minutes}m
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Project/Task:</p>
                        <p className="text-foreground">{request.projects_affected}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Submitted:</p>
                        <p className="text-foreground">
                          {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Reason:</p>
                      <p className="text-foreground bg-muted p-3 rounded">{request.reason}</p>
                    </div>

                    {request.reject_reason && (
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400 mb-1">Rejection Reason:</p>
                        <p className="text-red-900 dark:text-red-100 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                          {request.reject_reason}
                        </p>
                      </div>
                    )}

                    {!request.approved_by && !request.reject_reason && request.can_approve && (
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => handleApprove(request)}
                          className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectClick(request)}
                          variant="outline"
                          className="flex-1 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Reject Request</h3>
            <p className="text-muted-foreground mb-4">
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
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
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
