import axios from 'axios';

class ERPNextService {
  constructor() {
    this.baseUrl = process.env.ERPNEXT_BASE_URL || 'https://erp.roochedigital.com';
    this.apiKey = process.env.ERPNEXT_API_KEY;
    this.apiSecret = process.env.ERPNEXT_API_SECRET;
  }

  /**
   * Get employee data from ERPNext by email
   */
  async getEmployeeByEmail(email) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/resource/Employee`, {
        params: {
          filters: JSON.stringify([
            ['company_email', '=', email],
            ['status', '=', 'Active']
          ]),
          fields: JSON.stringify([
            'name',
            'employee_name',
            'company_email',
            'designation',
            'reports_to',
            'status'
          ])
        },
        headers: {
          'Authorization': `token ${this.apiKey}:${this.apiSecret}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        const employee = response.data.data[0];
        return {
          employee_id: employee.name,
          employee_name: employee.employee_name,
          email: employee.company_email,
          designation: employee.designation || 'Employee',
          reports_to: employee.reports_to || null,
          status: employee.status
        };
      }

      return null;
    } catch (error) {
      console.error('ERPNext API Error:', error.message);
      // Return null if employee not found, rather than throwing error
      // This allows users to sign in even if not in ERPNext
      return null;
    }
  }

  /**
   * Get employee's direct reports (for approval hierarchy)
   */
  async getDirectReports(employeeId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/resource/Employee`, {
        params: {
          filters: JSON.stringify([
            ['reports_to', '=', employeeId],
            ['status', '=', 'Active']
          ]),
          fields: JSON.stringify(['name', 'employee_name', 'company_email'])
        },
        headers: {
          'Authorization': `token ${this.apiKey}:${this.apiSecret}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.data) {
        return response.data.data.map(emp => ({
          employee_id: emp.name,
          employee_name: emp.employee_name,
          email: emp.company_email
        }));
      }

      return [];
    } catch (error) {
      console.error('ERPNext API Error (Direct Reports):', error.message);
      return [];
    }
  }

  /**
   * Check if user is company owner (for Owner role)
   */
  async isCompanyOwner(employeeId) {
    try {
      // Check if employee has specific designation or custom field
      const response = await axios.get(`${this.baseUrl}/api/resource/Employee/${employeeId}`, {
        headers: {
          'Authorization': `token ${this.apiKey}:${this.apiSecret}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.data) {
        const employee = response.data.data;
        // Check if designation contains "Owner", "CEO", "Managing Director", etc.
        const ownerDesignations = ['Owner', 'CEO', 'Managing Director', 'President'];
        return ownerDesignations.some(title =>
          employee.designation && employee.designation.includes(title)
        );
      }

      return false;
    } catch (error) {
      console.error('ERPNext API Error (Owner Check):', error.message);
      return false;
    }
  }
}

export default new ERPNextService();
