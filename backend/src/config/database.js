import './env.js'; // Load environment variables first
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

const { Pool } = pg;

// Database type: 'supabase' or 'postgresql'
const DB_TYPE = process.env.DB_TYPE || 'supabase';

let db = null;

// Initialize database connection based on type
if (DB_TYPE === 'postgresql') {
  // Direct PostgreSQL connection
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined when using PostgreSQL');
  }

  db = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Test connection
  db.query('SELECT NOW()', (err, res) => {
    if (err) {
      logger.error('PostgreSQL connection error:', err);
    } else {
      logger.info('PostgreSQL connected successfully');
    }
  });

} else if (DB_TYPE === 'supabase') {
  // Supabase connection
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY must be defined when using Supabase');
  }

  db = createClient(supabaseUrl, supabaseKey);
  logger.info('Supabase client initialized');

} else {
  throw new Error(`Invalid DB_TYPE: ${DB_TYPE}. Must be 'postgresql' or 'supabase'`);
}

// Database adapter - provides unified interface
export const dbAdapter = {
  type: DB_TYPE,

  // Get all requests with optional filters
  async getAllRequests(filters = {}) {
    if (DB_TYPE === 'postgresql') {
      let query = 'SELECT * FROM overtime_requests WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters.status) {
        if (filters.status === 'pending') {
          query += ' AND approved_by IS NULL';
        } else if (filters.status === 'approved') {
          query += ' AND approved_by IS NOT NULL AND reject_reason IS NULL';
        } else if (filters.status === 'rejected') {
          query += ' AND reject_reason IS NOT NULL';
        }
      }

      if (filters.dateFrom) {
        query += ` AND payroll_date >= $${paramIndex++}`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ` AND payroll_date <= $${paramIndex++}`;
        params.push(filters.dateTo);
      }

      if (filters.employeeId) {
        query += ` AND frappe_employee_id = $${paramIndex++}`;
        params.push(filters.employeeId);
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, params);
      return result.rows;

    } else {
      // Supabase
      let query = db.from('Overtime-Requests').select('*').order('created_at', { ascending: false });

      if (filters.status) {
        if (filters.status === 'pending') {
          query = query.is('approved_by', null);
        } else if (filters.status === 'approved') {
          query = query.not('approved_by', 'is', null).is('reject_reason', null);
        } else if (filters.status === 'rejected') {
          query = query.not('reject_reason', 'is', null);
        }
      }

      if (filters.dateFrom) {
        query = query.gte('payroll_date', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('payroll_date', filters.dateTo);
      }

      if (filters.employeeId) {
        query = query.eq('frappe_employee_id', filters.employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  },

  // Get request by ID
  async getRequestById(id) {
    if (DB_TYPE === 'postgresql') {
      const result = await db.query('SELECT * FROM overtime_requests WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        throw new Error('Request not found');
      }
      return result.rows[0];
    } else {
      const { data, error } = await db
        .from('Overtime-Requests')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Get requests by employee
  async getRequestsByEmployee(employeeId) {
    if (DB_TYPE === 'postgresql') {
      const result = await db.query(
        'SELECT * FROM overtime_requests WHERE frappe_employee_id = $1 ORDER BY created_at DESC',
        [employeeId]
      );
      return result.rows;
    } else {
      const { data, error } = await db
        .from('Overtime-Requests')
        .select('*')
        .eq('frappe_employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  },

  // Get pending requests
  async getPendingRequests() {
    if (DB_TYPE === 'postgresql') {
      const result = await db.query(
        'SELECT * FROM overtime_requests WHERE approved_by IS NULL ORDER BY created_at ASC'
      );
      return result.rows;
    } else {
      const { data, error } = await db
        .from('Overtime-Requests')
        .select('*')
        .is('approved_by', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  },

  // Get statistics
  async getStatistics(employeeId = null) {
    if (DB_TYPE === 'postgresql') {
      const query = employeeId
        ? 'SELECT * FROM overtime_requests WHERE frappe_employee_id = $1'
        : 'SELECT * FROM overtime_requests';
      const params = employeeId ? [employeeId] : [];

      const result = await db.query(query, params);
      const rows = result.rows;

      return {
        total: rows.length,
        pending: rows.filter(r => !r.approved_by).length,
        approved: rows.filter(r => r.approved_by && !r.reject_reason).length,
        rejected: rows.filter(r => r.reject_reason).length,
        totalHours: rows.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0),
      };
    } else {
      const query = employeeId
        ? db.from('Overtime-Requests').select('*').eq('frappe_employee_id', employeeId)
        : db.from('Overtime-Requests').select('*');

      const { data, error } = await query;
      if (error) throw error;

      return {
        total: data.length,
        pending: data.filter(r => !r.approved_by).length,
        approved: data.filter(r => r.approved_by && !r.reject_reason).length,
        rejected: data.filter(r => r.reject_reason).length,
        totalHours: data.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0),
      };
    }
  },

  // Insert new request (for n8n webhook - not used by backend directly)
  async insertRequest(data) {
    if (DB_TYPE === 'postgresql') {
      const result = await db.query(
        `INSERT INTO overtime_requests
         (frappe_employee_id, payroll_date, hours, minutes, reason, projects_affected)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.frappe_employee_id,
          data.payroll_date,
          data.hours,
          data.minutes,
          data.reason,
          data.projects_affected,
        ]
      );
      return result.rows[0];
    } else {
      const { data: result, error } = await db
        .from('Overtime-Requests')
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return result;
    }
  },

  // Update request (for approval/rejection - used by n8n)
  async updateRequest(id, updates) {
    if (DB_TYPE === 'postgresql') {
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ');

      const result = await db.query(
        `UPDATE overtime_requests SET ${setClause} WHERE id = $1 RETURNING *`,
        [id, ...values]
      );
      return result.rows[0];
    } else {
      const { data, error } = await db
        .from('Overtime-Requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Check for duplicate requests
  async checkDuplicate(employeeId, payrollDate) {
    if (DB_TYPE === 'postgresql') {
      const result = await db.query(
        'SELECT * FROM overtime_requests WHERE frappe_employee_id = $1 AND payroll_date = $2',
        [employeeId, payrollDate]
      );
      return result.rows;
    } else {
      const { data, error } = await db
        .from('Overtime-Requests')
        .select('*')
        .eq('frappe_employee_id', employeeId)
        .eq('payroll_date', payrollDate);
      if (error) throw error;
      return data;
    }
  },

  // Approve request
  async approveRequest(id, approvedBy) {
    const updates = {
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      reject_reason: null
    };
    return await this.updateRequest(id, updates);
  },

  // Reject request
  async rejectRequest(id, rejectedBy, reason) {
    const updates = {
      approved_by: rejectedBy,
      reject_reason: reason
    };
    return await this.updateRequest(id, updates);
  },

  // Get setting by key
  async getSetting(key) {
    if (DB_TYPE === 'postgresql') {
      const result = await db.query('SELECT * FROM settings WHERE key = $1', [key]);
      return result.rows[0] || null;
    } else {
      const { data, error } = await db
        .from('settings')
        .select('*')
        .eq('key', key)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    }
  },

  // Get all settings
  async getAllSettings() {
    if (DB_TYPE === 'postgresql') {
      const result = await db.query('SELECT * FROM settings ORDER BY key');
      return result.rows;
    } else {
      const { data, error } = await db
        .from('settings')
        .select('*')
        .order('key');
      if (error) throw error;
      return data;
    }
  },

  // Update or create setting
  async upsertSetting(key, value, description = null) {
    if (DB_TYPE === 'postgresql') {
      const result = await db.query(
        `INSERT INTO settings (key, value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = $2, description = COALESCE($3, settings.description)
         RETURNING *`,
        [key, JSON.stringify(value), description]
      );
      return result.rows[0];
    } else {
      const { data, error } = await db
        .from('settings')
        .upsert({ key, value, description })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Delete setting
  async deleteSetting(key) {
    if (DB_TYPE === 'postgresql') {
      await db.query('DELETE FROM settings WHERE key = $1', [key]);
    } else {
      const { error } = await db
        .from('settings')
        .delete()
        .eq('key', key);
      if (error) throw error;
    }
  },

  // Health check
  async healthCheck() {
    try {
      if (DB_TYPE === 'postgresql') {
        await db.query('SELECT 1');
      } else {
        await db.from('Overtime-Requests').select('id').limit(1);
      }
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  },
};

export { db as pool };

export default dbAdapter;
