import { supabase } from './supabase'

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

class ApiClient {
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Authorization': `Bearer ${session?.access_token || ''}`,
      'Content-Type': 'application/json',
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers = await this.getAuthHeaders()
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  }

  // Auth API
  async register(userData: { email: string; password: string; name: string; phone: string }) {
    return this.request('/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        ...userData,
      }),
    })
  }

  async login(email: string, password: string) {
    return this.request('/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        email,
        password,
      }),
    })
  }

  async logout() {
    return this.request('/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'logout',
      }),
    })
  }

  // Orders API
  async createOrder(orderData: any) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        orderData,
      }),
    })
  }

  async getOrder(orderId: string) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get',
        orderId,
      }),
    })
  }

  async listOrders(filters?: { status?: string; limit?: number; offset?: number }) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        action: 'list',
        filters,
      }),
    })
  }

  async updateOrder(orderId: string, updateData: any) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        orderId,
        updateData,
      }),
    })
  }

  async cancelOrder(orderId: string) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        action: 'cancel',
        orderId,
      }),
    })
  }

  // Payments API
  async createPaymentOrder(orderId: string, amount: number) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create-order',
        orderId,
        amount,
      }),
    })
  }

  async verifyPayment(orderId: string, paymentData: any) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        action: 'verify-payment',
        orderId,
        paymentData,
      }),
    })
  }

  async getPayment(orderId: string) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get-payment',
        orderId,
      }),
    })
  }

  async refundPayment(orderId: string, refundData?: { amount?: number; reason?: string }) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        action: 'refund',
        orderId,
        refundData,
      }),
    })
  }

  // Materials API
  async listMaterials(filters?: { category?: string; is_active?: boolean }) {
    return this.request('/materials', {
      method: 'POST',
      body: JSON.stringify({
        action: 'list',
        filters,
      }),
    })
  }

  async getMaterial(materialId: string) {
    return this.request('/materials', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get',
        materialId,
      }),
    })
  }

  async createMaterial(materialData: any) {
    return this.request('/materials', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        materialData,
      }),
    })
  }

  async updateMaterial(materialId: string, materialData: any) {
    return this.request('/materials', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        materialId,
        materialData,
      }),
    })
  }

  async deleteMaterial(materialId: string) {
    return this.request('/materials', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        materialId,
      }),
    })
  }

  // Addresses API
  async listAddresses() {
    return this.request('/addresses', {
      method: 'POST',
      body: JSON.stringify({
        action: 'list',
      }),
    })
  }

  async getAddress(addressId: string) {
    return this.request('/addresses', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get',
        addressId,
      }),
    })
  }

  async createAddress(addressData: any) {
    return this.request('/addresses', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        addressData,
      }),
    })
  }

  async updateAddress(addressId: string, addressData: any) {
    return this.request('/addresses', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        addressId,
        addressData,
      }),
    })
  }

  async deleteAddress(addressId: string) {
    return this.request('/addresses', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        addressId,
      }),
    })
  }

  async setDefaultAddress(addressId: string) {
    return this.request('/addresses', {
      method: 'POST',
      body: JSON.stringify({
        action: 'set-default',
        addressId,
      }),
    })
  }

  // Notifications API
  async sendSMS(phone: string, message: string) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        action: 'send-sms',
        recipient: phone,
        message,
      }),
    })
  }

  async sendEmail(email: string, subject: string, message: string) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        action: 'send-email',
        recipient: email,
        subject,
        message,
      }),
    })
  }

  // Analytics API
  async getUserStats(dateRange?: { start: string; end: string }) {
    return this.request('/analytics', {
      method: 'POST',
      body: JSON.stringify({
        action: 'user-stats',
        dateRange,
      }),
    })
  }

  async getOrderStats(dateRange?: { start: string; end: string }) {
    return this.request('/analytics', {
      method: 'POST',
      body: JSON.stringify({
        action: 'order-stats',
        dateRange,
      }),
    })
  }

  async getRevenueStats(dateRange?: { start: string; end: string }) {
    return this.request('/analytics', {
      method: 'POST',
      body: JSON.stringify({
        action: 'revenue-stats',
        dateRange,
      }),
    })
  }

  async getMaterialStats(dateRange?: { start: string; end: string }) {
    return this.request('/analytics', {
      method: 'POST',
      body: JSON.stringify({
        action: 'material-stats',
        dateRange,
      }),
    })
  }
}

export const apiClient = new ApiClient()