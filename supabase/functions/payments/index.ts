import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface PaymentRequest {
  action: 'create-order' | 'verify-payment' | 'get-payment' | 'refund'
  orderId?: string
  amount?: number
  paymentData?: {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }
  refundData?: {
    amount?: number
    reason?: string
  }
}

// Mock Razorpay integration - replace with actual Razorpay API calls
const createRazorpayOrder = async (amount: number, orderId: string) => {
  // In production, use actual Razorpay API
  return {
    id: `order_${Date.now()}`,
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    receipt: `receipt_${orderId}`,
    status: 'created'
  }
}

const verifyRazorpaySignature = (paymentId: string, orderId: string, signature: string) => {
  // In production, verify using actual Razorpay webhook signature
  // For demo, we'll return true
  return true
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

    const { action, orderId, amount, paymentData, refundData }: PaymentRequest = await req.json()

    switch (action) {
      case 'create-order': {
        if (!orderId || !amount) {
          return new Response(
            JSON.stringify({ error: 'Order ID and amount required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify order belongs to user
        const { data: order, error: orderError } = await supabaseClient
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single()

        if (orderError || !order) {
          return new Response(
            JSON.stringify({ error: 'Order not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create Razorpay order
        const razorpayOrder = await createRazorpayOrder(amount, orderId)

        return new Response(
          JSON.stringify({ 
            razorpayOrder,
            order: order
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'verify-payment': {
        if (!orderId || !paymentData) {
          return new Response(
            JSON.stringify({ error: 'Order ID and payment data required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify payment signature
        const isValid = verifyRazorpaySignature(
          paymentData.razorpay_payment_id,
          paymentData.razorpay_order_id,
          paymentData.razorpay_signature
        )

        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Invalid payment signature' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update order status
        const { data: order, error: orderError } = await supabaseClient
          .from('orders')
          .update({
            payment_status: 'PAID',
            payment_id: paymentData.razorpay_payment_id,
            status: 'CONFIRMED',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (orderError) {
          return new Response(
            JSON.stringify({ error: 'Failed to update order' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create payment record
        const { data: payment, error: paymentError } = await supabaseClient
          .from('payments')
          .insert([{
            order_id: orderId,
            payment_gateway: 'razorpay',
            gateway_payment_id: paymentData.razorpay_payment_id,
            gateway_order_id: paymentData.razorpay_order_id,
            amount: order.estimated_amount,
            currency: 'INR',
            status: 'SUCCESS'
          }])
          .select()
          .single()

        if (paymentError) {
          console.error('Failed to create payment record:', paymentError)
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            order,
            payment
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get-payment': {
        if (!orderId) {
          return new Response(
            JSON.stringify({ error: 'Order ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: payment, error: paymentError } = await supabaseClient
          .from('payments')
          .select(`
            *,
            order:orders(*)
          `)
          .eq('order_id', orderId)
          .single()

        if (paymentError) {
          return new Response(
            JSON.stringify({ error: 'Payment not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user owns the order
        if (payment.order.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ payment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'refund': {
        if (!orderId) {
          return new Response(
            JSON.stringify({ error: 'Order ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get payment record
        const { data: payment, error: paymentError } = await supabaseClient
          .from('payments')
          .select(`
            *,
            order:orders(*)
          `)
          .eq('order_id', orderId)
          .eq('status', 'SUCCESS')
          .single()

        if (paymentError || !payment) {
          return new Response(
            JSON.stringify({ error: 'Payment not found or already refunded' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user owns the order
        if (payment.order.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // In production, process actual refund with Razorpay
        const refundAmount = refundData?.amount || payment.amount

        // Update payment status
        const { data: updatedPayment, error: updateError } = await supabaseClient
          .from('payments')
          .update({
            status: 'REFUNDED',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to process refund' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update order status
        await supabaseClient
          .from('orders')
          .update({
            status: 'CANCELLED',
            payment_status: 'REFUNDED',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)

        return new Response(
          JSON.stringify({ 
            success: true,
            refundAmount,
            payment: updatedPayment
          }),
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