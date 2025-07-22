import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface AnalyticsRequest {
  action: 'user-stats' | 'order-stats' | 'revenue-stats' | 'material-stats'
  userId?: string
  dateRange?: {
    start: string
    end: string
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, userId, dateRange }: AnalyticsRequest = await req.json()

    // Use current user if no userId specified
    const targetUserId = userId || user.id

    // Verify user can access these stats (own stats or admin)
    if (targetUserId !== user.id) {
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userError || userData.role !== 'ADMIN') {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    switch (action) {
      case 'user-stats': {
        // Get user's order statistics
        let orderQuery = supabaseClient
          .from('orders')
          .select('status, estimated_amount, final_amount, created_at')
          .eq('user_id', targetUserId)

        if (dateRange) {
          orderQuery = orderQuery
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end)
        }

        const { data: orders, error: orderError } = await orderQuery

        if (orderError) {
          return new Response(
            JSON.stringify({ error: orderError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const stats = {
          totalOrders: orders.length,
          completedOrders: orders.filter(o => o.status === 'COMPLETED').length,
          pendingOrders: orders.filter(o => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status)).length,
          cancelledOrders: orders.filter(o => o.status === 'CANCELLED').length,
          totalEarnings: orders.reduce((sum, o) => sum + (o.final_amount || o.estimated_amount || 0), 0),
          averageOrderValue: orders.length > 0 ? 
            orders.reduce((sum, o) => sum + (o.final_amount || o.estimated_amount || 0), 0) / orders.length : 0
        }

        return new Response(
          JSON.stringify({ stats }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'order-stats': {
        // Get order statistics by status and time
        let orderQuery = supabaseClient
          .from('orders')
          .select('status, created_at, estimated_amount, final_amount')
          .eq('user_id', targetUserId)

        if (dateRange) {
          orderQuery = orderQuery
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end)
        }

        const { data: orders, error: orderError } = await orderQuery

        if (orderError) {
          return new Response(
            JSON.stringify({ error: orderError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Group by status
        const statusStats = orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        // Group by month
        const monthlyStats = orders.reduce((acc, order) => {
          const month = new Date(order.created_at).toISOString().slice(0, 7) // YYYY-MM
          if (!acc[month]) {
            acc[month] = { count: 0, revenue: 0 }
          }
          acc[month].count += 1
          acc[month].revenue += order.final_amount || order.estimated_amount || 0
          return acc
        }, {} as Record<string, { count: number, revenue: number }>)

        return new Response(
          JSON.stringify({ 
            statusStats,
            monthlyStats
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'revenue-stats': {
        // Get revenue statistics
        let orderQuery = supabaseClient
          .from('orders')
          .select('final_amount, estimated_amount, created_at, status')
          .eq('user_id', targetUserId)
          .eq('payment_status', 'PAID')

        if (dateRange) {
          orderQuery = orderQuery
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end)
        }

        const { data: orders, error: orderError } = await orderQuery

        if (orderError) {
          return new Response(
            JSON.stringify({ error: orderError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const totalRevenue = orders.reduce((sum, o) => sum + (o.final_amount || o.estimated_amount || 0), 0)
        const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0

        // Daily revenue for the last 30 days
        const dailyRevenue = orders.reduce((acc, order) => {
          const date = new Date(order.created_at).toISOString().slice(0, 10) // YYYY-MM-DD
          acc[date] = (acc[date] || 0) + (order.final_amount || order.estimated_amount || 0)
          return acc
        }, {} as Record<string, number>)

        return new Response(
          JSON.stringify({ 
            totalRevenue,
            averageOrderValue,
            dailyRevenue,
            totalOrders: orders.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'material-stats': {
        // Get material statistics from user's orders
        const { data: orderItems, error: itemsError } = await supabaseClient
          .from('order_items')
          .select(`
            estimated_quantity,
            actual_quantity,
            price_per_kg,
            material:material_prices(name, category),
            order:orders!inner(user_id, created_at)
          `)
          .eq('order.user_id', targetUserId)

        if (itemsError) {
          return new Response(
            JSON.stringify({ error: itemsError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Group by material
        const materialStats = orderItems.reduce((acc, item) => {
          const materialName = item.material?.name || 'Unknown'
          const quantity = item.actual_quantity || item.estimated_quantity
          const value = quantity * item.price_per_kg

          if (!acc[materialName]) {
            acc[materialName] = {
              totalQuantity: 0,
              totalValue: 0,
              orderCount: 0,
              category: item.material?.category || 'Unknown'
            }
          }

          acc[materialName].totalQuantity += quantity
          acc[materialName].totalValue += value
          acc[materialName].orderCount += 1

          return acc
        }, {} as Record<string, any>)

        return new Response(
          JSON.stringify({ materialStats }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})