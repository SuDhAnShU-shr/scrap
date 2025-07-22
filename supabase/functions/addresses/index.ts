import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface AddressRequest {
  action: 'list' | 'get' | 'create' | 'update' | 'delete' | 'set-default'
  addressId?: string
  addressData?: {
    type: 'HOME' | 'OFFICE' | 'OTHER'
    address_line_1: string
    address_line_2?: string
    city: string
    state: string
    pincode: string
    landmark?: string
    is_default?: boolean
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

    const { action, addressId, addressData }: AddressRequest = await req.json()

    switch (action) {
      case 'list': {
        const { data: addresses, error: listError } = await supabaseClient
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })

        if (listError) {
          return new Response(
            JSON.stringify({ error: listError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ addresses }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get': {
        if (!addressId) {
          return new Response(
            JSON.stringify({ error: 'Address ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: address, error: getError } = await supabaseClient
          .from('addresses')
          .select('*')
          .eq('id', addressId)
          .eq('user_id', user.id)
          .single()

        if (getError) {
          return new Response(
            JSON.stringify({ error: 'Address not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ address }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create': {
        if (!addressData) {
          return new Response(
            JSON.stringify({ error: 'Address data required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // If this is set as default, unset other defaults
        if (addressData.is_default) {
          await supabaseClient
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id)
        }

        const { data: address, error: createError } = await supabaseClient
          .from('addresses')
          .insert([{
            user_id: user.id,
            type: addressData.type,
            address_line_1: addressData.address_line_1,
            address_line_2: addressData.address_line_2,
            city: addressData.city,
            state: addressData.state,
            pincode: addressData.pincode,
            landmark: addressData.landmark,
            is_default: addressData.is_default ?? false
          }])
          .select()
          .single()

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ address }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        if (!addressId || !addressData) {
          return new Response(
            JSON.stringify({ error: 'Address ID and data required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // If this is set as default, unset other defaults
        if (addressData.is_default) {
          await supabaseClient
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id)
            .neq('id', addressId)
        }

        const { data: address, error: updateError } = await supabaseClient
          .from('addresses')
          .update(addressData)
          .eq('id', addressId)
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
          JSON.stringify({ address }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        if (!addressId) {
          return new Response(
            JSON.stringify({ error: 'Address ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: deleteError } = await supabaseClient
          .from('addresses')
          .delete()
          .eq('id', addressId)
          .eq('user_id', user.id)

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'set-default': {
        if (!addressId) {
          return new Response(
            JSON.stringify({ error: 'Address ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Unset all defaults for user
        await supabaseClient
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)

        // Set new default
        const { data: address, error: updateError } = await supabaseClient
          .from('addresses')
          .update({ is_default: true })
          .eq('id', addressId)
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
          JSON.stringify({ address }),
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