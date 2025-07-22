import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface WebhookRequest {
  provider: 'razorpay' | 'sms' | 'email'
  event: string
  data: any
  signature?: string
}

// Verify Razorpay webhook signature
function verifyRazorpaySignature(payload: string, signature: string, secret: string): boolean {
  // In production, implement actual signature verification
  // const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  // return expectedSignature === signature
  return true // For demo purposes
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

    const body = await req.text()
    const payload = JSON.parse(body)
    
    // Handle different webhook providers
    const provider = req.url.includes('/razorpay') ? 'razorpay' : 
                    req.url.includes('/sms') ? 'sms' : 
                    req.url.includes('/email') ? 'email' : 'unknown'

    switch (provider) {
      case 'razorpay': {
        const signature = req.headers.get('x-razorpay-signature')
        if (!signature) {
          return new Response('Missing signature', { status: 400, headers: corsHeaders })
        }

        // Verify signature
        const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
        if (!verifyRazorpaySignature(body, signature, webhookSecret)) {
          return new Response('Invalid signature', { status: 400, headers: corsHeaders })
        }

        await handleRazorpayWebhook(payload, supabaseClient)
        break
      }

      case 'sms': {
        await handleSMSWebhook(payload, supabaseClient)
        break
      }

      case 'email': {
        await handleEmailWebhook(payload, supabaseClient)
        break
      }

      default:
        return new Response('Unknown provider', { status: 400, headers: corsHeaders })
    }

    return new Response('OK', { headers: corsHeaders })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

async function handleRazorpayWebhook(payload: any, supabaseClient: any) {
  const { event, payload: data } = payload

  switch (event) {
    case 'payment.captured': {
      const payment = data.payment.entity
      
      // Update payment status
      const { error: paymentError } = await supabaseClient
        .from('payments')
        .update({
          status: 'SUCCESS',
          updated_at: new Date().toISOString()
        })
        .eq('gateway_payment_id', payment.id)

      if (paymentError) {
        console.error('Error updating payment:', paymentError)
        return
      }

      // Get order ID from payment
      const { data: paymentRecord, error: fetchError } = await supabaseClient
        .from('payments')
        .select('order_id')
        .eq('gateway_payment_id', payment.id)
        .single()

      if (fetchError || !paymentRecord) {
        console.error('Error fetching payment record:', fetchError)
        return
      }

      // Update order status
      await supabaseClient
        .from('orders')
        .update({
          payment_status: 'PAID',
          status: 'CONFIRMED',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.order_id)

      // Send confirmation notifications
      await sendOrderConfirmationNotifications(paymentRecord.order_id, supabaseClient)
      break
    }

    case 'payment.failed': {
      const payment = data.payment.entity
      
      await supabaseClient
        .from('payments')
        .update({
          status: 'FAILED',
          updated_at: new Date().toISOString()
        })
        .eq('gateway_payment_id', payment.id)
      break
    }

    case 'refund.processed': {
      const refund = data.refund.entity
      
      await supabaseClient
        .from('payments')
        .update({
          status: 'REFUNDED',
          updated_at: new Date().toISOString()
        })
        .eq('gateway_payment_id', refund.payment_id)
      break
    }

    default:
      console.log(`Unhandled Razorpay event: ${event}`)
  }
}

async function handleSMSWebhook(payload: any, supabaseClient: any) {
  const { event, data } = payload
  console.log(`SMS webhook: ${event}`, data)
  // Handle SMS delivery status updates
}

async function handleEmailWebhook(payload: any, supabaseClient: any) {
  const { event, data } = payload
  console.log(`Email webhook: ${event}`, data)
  // Handle email delivery status updates
}

async function sendOrderConfirmationNotifications(orderId: string, supabaseClient: any) {
  try {
    // Get order details with user info
    const { data: order, error } = await supabaseClient
      .from('orders')
      .select(`
        *,
        user:users(*),
        pickup_address:addresses(*)
      `)
      .eq('id', orderId)
      .single()

    if (error || !order) {
      console.error('Error fetching order for notifications:', error)
      return
    }

    // In a real implementation, you would call your notification service here
    console.log(`Sending confirmation notifications for order ${orderId} to user ${order.user.email}`)
    
    // Example: Call notification function
    // await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notifications`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     action: 'send-email',
    //     recipient: order.user.email,
    //     subject: 'Order Confirmed - ScrapPickup',
    //     message: `Your order #${orderId.slice(-8)} has been confirmed!`
    //   })
    // })
  } catch (error) {
    console.error('Error sending notifications:', error)
  }
}