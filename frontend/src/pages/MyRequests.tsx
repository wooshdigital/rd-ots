import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Filter, X, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import useRequestStore from '../store/useRequestStore';
import { useAuth } from '../contexts/AuthContext';

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
  can_approve?: boolean;
}

export default function MyRequests() {
  const { user } = useAuth();
  const { fetchRequests, isLoading } = useRequestStore();

  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<OvertimeRequest[]>([]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user?.erpnext_employee_id) return;

    try {
      // Fetch only the logged-in user's own requests
      const data = await fetchRequests({ employeeId: user.erpnext_employee_id });
      setRequests(data);
      setFilteredRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...requests];

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(r => !r.approved_by);
      } else if (statusFilter === 'approved') {
        filtered = filtered.filter(r => r.approved_by && !r.reject_reason);
      } else if (statusFilter === 'rejected') {
        filtered = filtered.filter(r => r.reject_reason);
      }
    }

    // Date range filter (filed date)
    if (dateFrom) {
      filtered = filtered.filter(r => new Date(r.created_at) >= dateFrom);
    }
    if (dateTo) {
      // Set to end of day
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.created_at) <= endOfDay);
    }

    setFilteredRequests(filtered);
  }, [requests, statusFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setStatusFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const getStatusBadge = (request: OvertimeRequest) => {
    if (request.reject_reason) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Rejected
      </Badge>;
    }
    if (request.approved_by) {
      return <Badge variant="default" className="bg-green-600 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>;
    }
    return <Badge variant="secondary" className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>;
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => !r.approved_by).length,
    approved: requests.filter(r => r.approved_by && !r.reject_reason).length,
    rejected: requests.filter(r => r.reject_reason).length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Requests</h1>
        <p className="text-muted-foreground mt-2">View and track your overtime/undertime requests</p>
      </div>

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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
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
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredRequests.length} of {requests.length} requests
        </p>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No requests found</p>
            {(statusFilter !== 'all' || dateFrom || dateTo) && (
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
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Request #{request.id}
                    </CardTitle>
                    <CardDescription>
                      Filed on {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}
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
                    <p className="font-medium text-muted-foreground">
                      {request.reject_reason ? 'Rejected By:' : request.approved_by ? 'Approved By:' : 'Status:'}
                    </p>
                    <p className="text-foreground">
                      {request.approved_by || 'Pending Review'}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
