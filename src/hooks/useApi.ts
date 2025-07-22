import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'

export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiCall()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, dependencies)

  return { data, loading, error, refetch }
}

export function useAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<R>
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (...args: T): Promise<R | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await action(...args)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { execute, loading, error }
}

// Specific hooks for common API calls
export function useOrders(filters?: { status?: string; limit?: number }) {
  return useApi(() => apiClient.listOrders(filters), [filters])
}

export function useOrder(orderId: string | null) {
  return useApi(
    () => orderId ? apiClient.getOrder(orderId) : Promise.resolve(null),
    [orderId]
  )
}

export function useMaterials(filters?: { category?: string; is_active?: boolean }) {
  return useApi(() => apiClient.listMaterials(filters), [filters])
}

export function useAddresses() {
  return useApi(() => apiClient.listAddresses(), [])
}

export function useUserStats(dateRange?: { start: string; end: string }) {
  return useApi(() => apiClient.getUserStats(dateRange), [dateRange])
}