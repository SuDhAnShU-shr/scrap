// Webhook handlers for external services
import { supabase } from './supabase'
import { apiClient } from './api'

export interface WebhookPayload {
  event: string
  data: any
  timestamp: string
}

// Razorpay webhook handler
export async function handleRazorpayWebhook(payload: WebhookPayload) {
  const { event, data } = payload

  switch (event) {
    case 'payment.captured':
      await handlePaymentCaptured(data.payment)
      break
    case 'payment.failed':
      await handlePaymentFailed(data.payment)
      break
    case 'refund.processed':
      await handleRefundProcessed(data.refund)
      break
    default:
      console.log(`Unhandled Razorpay webhook event: ${event}`)
  }
}

async function handlePaymentCaptured(payment: any) {
  try {
    // Find order by payment ID
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('order_id')
      .eq('gateway_payment_id', payment.id)
      .single()

    if (existingPayment) {
      // Update payment status
      await supabase
        .from('payments')
        .update({
          status: 'SUCCESS',
          updated_at: new Date().toISOString()
        })
        .eq('gateway_payment_id', payment.id)

      // Update order status
      await supabase
        .from('orders')
        .update({
          payment_status: 'PAID',
          status: 'CONFIRMED',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.order_id)

      // Send confirmation notifications
      await sendOrderConfirmationNotifications(existingPayment.order_id)
    }
  } catch (error) {
    console.error('Error handling payment captured:', error)
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'FAILED',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_payment_id', payment.id)

    // Update order status
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('order_id')
      .eq('gateway_payment_id', payment.id)
      .single()

    if (paymentRecord) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'FAILED',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.order_id)
    }
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handleRefundProcessed(refund: any) {
  try {
    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'REFUNDED',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_payment_id', refund.payment_id)

    // Update order status
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('order_id')
      .eq('gateway_payment_id', refund.payment_id)
      .single()

    if (paymentRecord) {
      await supabase
        .from('orders')
        .update({
          status: 'CANCELLED',
          payment_status: 'REFUNDED',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.order_id)
    }
  } catch (error) {
    console.error('Error handling refund processed:', error)
  }
}

async function sendOrderConfirmationNotifications(orderId: string) {
  try {
    // Get order details with user info
    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        user:users(*),
        pickup_address:addresses(*)
      `)
      .eq('id', orderId)
      .single()

    if (order && order.user) {
      // Send SMS
      const smsMessage = `Your ScrapPickup order #${orderId.slice(-8)} has been confirmed! Pickup scheduled for ${new Date(order.scheduled_date).toLocaleDateString()} during ${order.scheduled_time_slot}.`
      
      await apiClient.sendSMS(order.user.phone, smsMessage)

      // Send Email
      const emailSubject = 'Order Confirmed - ScrapPickup'
      const emailMessage = `
        Dear ${order.user.name},
        
        Your scrap pickup order has been confirmed!
        
        Order Details:
        - Order ID: #${orderId.slice(-8)}
        - Pickup Date: ${new Date(order.scheduled_date).toLocaleDateString()}
        - Time Slot: ${order.scheduled_time_slot}
        - Amount: ₹${order.estimated_amount}
        
        Our team will arrive at your scheduled time to collect the materials.
        
        Thank you for choosing ScrapPickup!
      `
      
      await apiClient.sendEmail(order.user.email, emailSubject, emailMessage)
    }
  } catch (error) {
    console.error('Error sending confirmation notifications:', error)
  }
}

// SMS webhook handler (for delivery status updates)
export async function handleSMSWebhook(payload: WebhookPayload) {
  const { event, data } = payload

  switch (event) {
    case 'message.delivered':
      console.log(`SMS delivered: ${data.messageId}`)
      break
    case 'message.failed':
      console.log(`SMS failed: ${data.messageId}`)
      break
    default:
      console.log(`Unhandled SMS webhook event: ${event}`)
  }
}

// Email webhook handler (for delivery status updates)
export async function handleEmailWebhook(payload: WebhookPayload) {
  const { event, data } = payload

  switch (event) {
    case 'delivered':
      console.log(`Email delivered: ${data.messageId}`)
      break
    case 'bounced':
      console.log(`Email bounced: ${data.messageId}`)
      break
    case 'opened':
      console.log(`Email opened: ${data.messageId}`)
      break
    default:
      console.log(`Unhandled email webhook event: ${event}`)
  }
}