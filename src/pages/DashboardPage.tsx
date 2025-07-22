import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Package, 
  Calendar, 
  CreditCard, 
  MapPin, 
  Plus, 
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  User,
  Settings
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../lib/utils'

interface Order {
  id: string
  status: string
  scheduled_date: string
  scheduled_time_slot: string
  estimated_amount: number
  final_amount?: number
  payment_status: string
  created_at: string
  pickup_address: {
    address_line_1: string
    city: string
    state: string
  }
  order_items: {
    material: {
      name: string
    }
    estimated_quantity: number
  }[]
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const statusIcons = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  IN_PROGRESS: Truck,
  COMPLETED: CheckCircle,
  CANCELLED: AlertCircle,
}

export function DashboardPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalEarnings: 0,
    pendingOrders: 0,
  })

  const successMessage = location.state?.message

  useEffect(() => {
    if (user) {
      fetchOrders()
      fetchStats()
    }
  }, [user])

  const fetchOrders = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          pickup_address:addresses(*),
          order_items(
            *,
            material:material_prices(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status, final_amount, estimated_amount')
        .eq('user_id', user.id)

      if (error) throw error

      const totalOrders = data?.length || 0
      const completedOrders = data?.filter(order => order.status === 'COMPLETED').length || 0
      const pendingOrders = data?.filter(order => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(order.status)).length || 0
      const totalEarnings = data?.reduce((sum, order) => {
        return sum + (order.final_amount || order.estimated_amount || 0)
      }, 0) || 0

      setStats({
        totalOrders,
        completedOrders,
        totalEarnings,
        pendingOrders,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600">
            Manage your scrap pickups and track your earnings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalEarnings)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
                  <Link to="/orders">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No orders yet</p>
                    <Link to="/calculator">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Book Your First Pickup
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const StatusIcon = statusIcons[order.status as keyof typeof statusIcons]
                      return (
                        <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold text-gray-900">
                                  Order #{order.id.slice(-8)}
                                </h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                                  <StatusIcon className="h-3 w-3 inline mr-1" />
                                  {order.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {formatDateTime(order.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">
                                {formatCurrency(order.final_amount || order.estimated_amount)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.payment_status === 'PAID' ? 'Paid' : 'Pending'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>
                              {new Date(order.scheduled_date).toLocaleDateString()} - {order.scheduled_time_slot}
                            </span>
                          </div>

                          <div className="flex items-center text-sm text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>
                              {order.pickup_address?.address_line_1}, {order.pickup_address?.city}
                            </span>
                          </div>

                          {order.order_items && order.order_items.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Items: </span>
                              {order.order_items.map((item, index) => (
                                <span key={index}>
                                  {item.material?.name} ({item.estimated_quantity}kg)
                                  {index < order.order_items.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/calculator">
                  <Button className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    New Pickup
                  </Button>
                </Link>
                <Link to="/calculator">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Price Calculator
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="outline" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Manage Profile
                  </Button>
                </Link>
                <Link to="/addresses">
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="h-4 w-4 mr-2" />
                    Manage Addresses
                  </Button>
                </Link>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name</span>
                  <span className="font-medium">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone</span>
                  <span className="font-medium">{user.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since</span>
                  <span className="font-medium">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <Link to="/profile">
                  <Button variant="outline" size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}