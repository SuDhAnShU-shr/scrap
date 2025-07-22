import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface OrderRequest {
  action: 'create' | 'update' | 'get' | 'list' | 'cancel'
  orderId?: string
  orderData?: {
    pickup_address_id: string
    scheduled_date: string
    scheduled_time_slot: string
    estimated_amount: number
    notes?: string
    items: Array<{
      material_id: string
      estimated_quantity: number
      price_per_kg: number
    }>
  }
  updateData?: {
    status?: string
    actual_weight?: number
    final_amount?: number
    payment_status?: string
    payment_id?: string
  }
  filters?: {
    status?: string
    limit?: number
    offset?: number
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

    const { action, orderId, orderData, updateData, filters }: OrderRequest = await req.json()

    switch (action) {
      case 'create': {
        if (!orderData) {
          return new Response(
            JSON.stringify({ error: 'Order data required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create order
        const { data: order, error: orderError } = await supabaseClient
          .from('orders')
          .insert([{
            user_id: user.id,
            pickup_address_id: orderData.pickup_address_id,
            scheduled_date: orderData.scheduled_date,
            scheduled_time_slot: orderData.scheduled_time_slot,
            estimated_amount: orderData.estimated_amount,
            notes: orderData.notes,
            status: 'PENDING',
            payment_status: 'PENDING'
          }])
          .select()
          .single()

        if (orderError) {
          return new Response(
            JSON.stringify({ error: orderError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create order items
        if (orderData.items && orderData.items.length > 0) {
          const orderItems = orderData.items.map(item => ({
            order_id: order.id,
            material_id: item.material_id,
            estimated_quantity: item.estimated_quantity,
            price_per_kg: item.price_per_kg
          }))

          const { error: itemsError } = await supabaseClient
            .from('order_items')
            .insert(orderItems)

          if (itemsError) {
            // Cleanup order if items creation fails
            await supabaseClient.from('orders').delete().eq('id', order.id)
            return new Response(
              JSON.stringify({ error: 'Failed to create order items' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        return new Response(
          JSON.stringify({ order }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        if (!orderId || !updateData) {
          return new Response(
            JSON.stringify({ error: 'Order ID and update data required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: order, error: updateError } = await supabaseClient
          .from('orders')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ order }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get': {
        if (!orderId) {
          return new Response(
            JSON.stringify({ error: 'Order ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: order, error: getError } = await supabaseClient
          .from('orders')
          .select(`
            *,
            pickup_address:addresses(*),
            order_items(
              *,
              material:material_prices(name, category)
            )
          `)
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single()

        if (getError) {
          return new Response(
            JSON.stringify({ error: getError.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ order }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'list': {
        let query = supabaseClient
          .from('orders')
          .select(`
            *,
            pickup_address:addresses(*),
            order_items(
              *,
              material:material_prices(name, category)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }

        if (filters?.limit) {
          query = query.limit(filters.limit)
        }

        if (filters?.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
        }

        const { data: orders, error: listError } = await query

        if (listError) {
          return new Response(
            JSON.stringify({ error: listError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ orders }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'cancel': {
        if (!orderId) {
          return new Response(
            JSON.stringify({ error: 'Order ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: order, error: cancelError } = await supabaseClient
          .from('orders')
          .update({
            status: 'CANCELLED',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .eq('user_id', user.id)
          .in('status', ['PENDING', 'CONFIRMED'])
          .select()
          .single()

        if (cancelError) {
          return new Response(
            JSON.stringify({ error: 'Cannot cancel this order' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ order }),
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