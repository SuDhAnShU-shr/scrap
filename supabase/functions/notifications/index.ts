import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface NotificationRequest {
  action: 'send-sms' | 'send-email' | 'send-push'
  recipient: string
  message: string
  subject?: string
  type?: 'order_confirmation' | 'payment_success' | 'pickup_reminder' | 'order_completed'
  orderId?: string
}

// Mock SMS service - replace with actual SMS provider (Twilio, etc.)
const sendSMS = async (phone: string, message: string) => {
  console.log(`SMS to ${phone}: ${message}`)
  return { success: true, messageId: `sms_${Date.now()}` }
}

// Mock email service - replace with actual email provider (SendGrid, etc.)
const sendEmail = async (email: string, subject: string, message: string) => {
  console.log(`Email to ${email}: ${subject} - ${message}`)
  return { success: true, messageId: `email_${Date.now()}` }
}

// Mock push notification service
const sendPushNotification = async (userId: string, message: string) => {
  console.log(`Push to ${userId}: ${message}`)
  return { success: true, messageId: `push_${Date.now()}` }
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

    const { action, recipient, message, subject, type, orderId }: NotificationRequest = await req.json()

    switch (action) {
      case 'send-sms': {
        if (!recipient || !message) {
          return new Response(
            JSON.stringify({ error: 'Recipient and message required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const result = await sendSMS(recipient, message)

        return new Response(
          JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'send-email': {
        if (!recipient || !message || !subject) {
          return new Response(
            JSON.stringify({ error: 'Recipient, subject, and message required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const result = await sendEmail(recipient, subject, message)

        return new Response(
          JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'send-push': {
        if (!recipient || !message) {
          return new Response(
            JSON.stringify({ error: 'Recipient and message required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const result = await sendPushNotification(recipient, message)

        return new Response(
          JSON.stringify({ success: true, result }),
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