import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface MaterialRequest {
  action: 'list' | 'get' | 'create' | 'update' | 'delete'
  materialId?: string
  materialData?: {
    name: string
    category: string
    price_per_kg: number
    minimum_quantity: number
    is_active?: boolean
  }
  filters?: {
    category?: string
    is_active?: boolean
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

    const { action, materialId, materialData, filters }: MaterialRequest = await req.json()

    // For create, update, delete operations, verify admin access
    if (['create', 'update', 'delete'].includes(action)) {
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

      // Check if user is admin
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userError || userData.role !== 'ADMIN') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    switch (action) {
      case 'list': {
        let query = supabaseClient
          .from('material_prices')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true })

        if (filters?.category) {
          query = query.eq('category', filters.category)
        }

        if (filters?.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active)
        }

        const { data: materials, error: listError } = await query

        if (listError) {
          return new Response(
            JSON.stringify({ error: listError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ materials }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get': {
        if (!materialId) {
          return new Response(
            JSON.stringify({ error: 'Material ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: material, error: getError } = await supabaseClient
          .from('material_prices')
          .select('*')
          .eq('id', materialId)
          .single()

        if (getError) {
          return new Response(
            JSON.stringify({ error: 'Material not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ material }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create': {
        if (!materialData) {
          return new Response(
            JSON.stringify({ error: 'Material data required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: material, error: createError } = await supabaseClient
          .from('material_prices')
          .insert([{
            name: materialData.name,
            category: materialData.category,
            price_per_kg: materialData.price_per_kg,
            minimum_quantity: materialData.minimum_quantity,
            is_active: materialData.is_active ?? true
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
          JSON.stringify({ material }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        if (!materialId || !materialData) {
          return new Response(
            JSON.stringify({ error: 'Material ID and data required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: material, error: updateError } = await supabaseClient
          .from('material_prices')
          .update({
            ...materialData,
            updated_at: new Date().toISOString()
          })
          .eq('id', materialId)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ material }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        if (!materialId) {
          return new Response(
            JSON.stringify({ error: 'Material ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Soft delete by setting is_active to false
        const { data: material, error: deleteError } = await supabaseClient
          .from('material_prices')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', materialId)
          .select()
          .single()

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ material }),
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