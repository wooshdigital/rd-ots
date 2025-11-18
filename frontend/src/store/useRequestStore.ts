import { create } from 'zustand';
import api from '../lib/api';

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
  rejected_by: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface Statistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalHours: number;
}

interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicates: OvertimeRequest[];
}

interface RequestStore {
  // State
  requests: OvertimeRequest[];
  currentRequest: OvertimeRequest | null;
  statistics: Statistics | null;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;

  // Actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (message: string) => void;
  clearMessages: () => void;
  submitRequest: (requestData: Partial<OvertimeRequest>) => Promise<any>;
  fetchRequests: (filters?: Record<string, string>) => Promise<OvertimeRequest[]>;
  fetchRequestById: (id: number) => Promise<OvertimeRequest>;
  fetchPendingRequests: () => Promise<OvertimeRequest[]>;
  fetchStatistics: (employeeId?: string | null) => Promise<Statistics>;
  checkDuplicate: (email: string, payrollDate: string) => Promise<DuplicateCheckResult>;
  approveRequest: (id: number) => Promise<any>;
  rejectRequest: (id: number, reason: string) => Promise<any>;
  reset: () => void;
}

const useRequestStore = create<RequestStore>((set, get) => ({
  // State
  requests: [],
  currentRequest: null,
  statistics: null,
  isLoading: false,
  error: null,
  successMessage: null,

  // Actions
  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  setSuccess: (message) => set({ successMessage: message, error: null }),

  clearMessages: () => set({ error: null, successMessage: null }),

  // Submit new overtime/undertime request
  submitRequest: async (requestData) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const response = await api.post('/requests', requestData);
      set({
        isLoading: false,
        successMessage: response.data.message || 'Request submitted successfully!',
      });
      return response.data;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to submit request',
      });
      throw error;
    }
  },

  // Fetch all requests
  fetchRequests: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/requests?${params}`);
      set({
        requests: response.data.data,
        isLoading: false,
      });
      return response.data.data;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch requests',
      });
      throw error;
    }
  },

  // Fetch single request
  fetchRequestById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/requests/${id}`);
      set({
        currentRequest: response.data.data,
        isLoading: false,
      });
      return response.data.data;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch request',
      });
      throw error;
    }
  },

  // Fetch pending requests
  fetchPendingRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/requests/pending');
      set({
        requests: response.data.data,
        isLoading: false,
      });
      return response.data.data;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch pending requests',
      });
      throw error;
    }
  },

  // Fetch statistics
  fetchStatistics: async (employeeId = null) => {
    set({ isLoading: true, error: null });
    try {
      const params = employeeId ? `?employeeId=${employeeId}` : '';
      const response = await api.get(`/requests/stats${params}`);
      set({
        statistics: response.data.data,
        isLoading: false,
      });
      return response.data.data;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch statistics',
      });
      throw error;
    }
  },

  // Check for duplicate requests
  checkDuplicate: async (email, payrollDate) => {
    try {
      const response = await api.get(`/requests/check-duplicate?email=${email}&payrollDate=${payrollDate}`);
      return response.data.data;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      // Don't block submission if duplicate check fails
      return { hasDuplicate: false, duplicates: [] };
    }
  },

  // Approve request (approvedBy is set from session token in backend)
  approveRequest: async (id) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const response = await api.post(`/requests/${id}/approve`, {});
      set({
        isLoading: false,
        successMessage: response.data.message || 'Request approved successfully!',
      });
      return response.data;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to approve request',
      });
      throw error;
    }
  },

  // Reject request (rejectedBy is set from session token in backend)
  rejectRequest: async (id, reason) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      const response = await api.post(`/requests/${id}/reject`, { reason });
      set({
        isLoading: false,
        successMessage: response.data.message || 'Request rejected successfully!',
      });
      return response.data;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to reject request',
      });
      throw error;
    }
  },

  // Reset store
  reset: () => set({
    requests: [],
    currentRequest: null,
    statistics: null,
    isLoading: false,
    error: null,
    successMessage: null,
  }),
}));

export default useRequestStore;
