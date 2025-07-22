import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Clock, MapPin, Plus, Edit } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'

const addressSchema = z.object({
  type: z.enum(['HOME', 'OFFICE', 'OTHER']),
  address_line_1: z.string().min(5, 'Address is required'),
  address_line_2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode is required'),
  landmark: z.string().optional(),
})

const bookingSchema = z.object({
  scheduled_date: z.string().min(1, 'Pickup date is required'),
  scheduled_time_slot: z.string().min(1, 'Time slot is required'),
  notes: z.string().optional(),
  address_id: z.string().optional(),
  new_address: addressSchema.optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

interface Address {
  id: string
  type: string
  address_line_1: string
  address_line_2?: string
  city: string
  state: string
  pincode: string
  landmark?: string
  is_default: boolean
}

const timeSlots = [
  '9:00 AM - 12:00 PM',
  '12:00 PM - 3:00 PM',
  '3:00 PM - 6:00 PM',
  '6:00 PM - 9:00 PM'
]

export function BookingPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { calculatorItems, totalAmount } = location.state || { calculatorItems: [], totalAmount: 0 }

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      scheduled_date: new Date().toISOString().split('T')[0],
    }
  })

  const selectedAddressId = watch('address_id')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchAddresses()
  }, [user, navigate])

  const fetchAddresses = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
      
      // Auto-select default address
      const defaultAddress = data?.find(addr => addr.is_default)
      if (defaultAddress) {
        setValue('address_id', defaultAddress.id)
      }
    } catch (error) {
      console.error('Error fetching addresses:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: BookingFormData) => {
    if (!user) return

    setSubmitting(true)
    try {
      let addressId = data.address_id

      // Create new address if needed
      if (showNewAddress && data.new_address) {
        const { data: newAddress, error: addressError } = await supabase
          .from('addresses')
          .insert([{
            user_id: user.id,
            ...data.new_address,
          }])
          .select()
          .single()

        if (addressError) throw addressError
        addressId = newAddress.id
      }

      if (!addressId) {
        throw new Error('Please select or add a pickup address')
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
          pickup_address_id: addressId,
          scheduled_date: data.scheduled_date,
          scheduled_time_slot: data.scheduled_time_slot,
          estimated_amount: totalAmount,
          notes: data.notes,
          status: 'PENDING',
          payment_status: 'PENDING',
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      if (calculatorItems.length > 0) {
        const orderItems = calculatorItems.map((item: any) => ({
          order_id: order.id,
          material_id: item.materialId,
          estimated_quantity: item.quantity,
          price_per_kg: item.pricePerKg,
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)

        if (itemsError) throw itemsError
      }

      // Redirect to payment
      navigate('/payment', { 
        state: { 
          orderId: order.id, 
          amount: totalAmount,
          orderDetails: {
            ...order,
            items: calculatorItems
          }
        } 
      })
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Pickup</h1>
          <p className="text-gray-600">
            Schedule a convenient time for us to collect your scrap materials
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Booking Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary */}
              {calculatorItems.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
                  <div className="space-y-3">
                    {calculatorItems.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="font-medium text-gray-900">{item.materialName}</p>
                          <p className="text-sm text-gray-500">{item.quantity} kg × {formatCurrency(item.pricePerKg)}/kg</p>
                        </div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-lg font-semibold text-gray-900">Total Estimate</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  <Clock className="h-5 w-5 inline mr-2" />
                  Schedule Pickup
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Pickup Date"
                      type="date"
                      min={getMinDate()}
                      error={errors.scheduled_date?.message}
                      {...register('scheduled_date')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Slot
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      {...register('scheduled_time_slot')}
                    >
                      <option value="">Select time slot</option>
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                    {errors.scheduled_time_slot && (
                      <p className="text-sm text-red-600 mt-1">{errors.scheduled_time_slot.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Selection */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    <MapPin className="h-5 w-5 inline mr-2" />
                    Pickup Address
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewAddress(!showNewAddress)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {showNewAddress ? 'Cancel' : 'Add New'}
                  </Button>
                </div>

                {!showNewAddress && addresses.length > 0 && (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedAddressId === address.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          value={address.id}
                          className="sr-only"
                          {...register('address_id')}
                        />
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900">{address.type}</span>
                              {address.is_default && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">
                              {address.address_line_1}
                              {address.address_line_2 && `, ${address.address_line_2}`}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {address.city}, {address.state} - {address.pincode}
                            </p>
                            {address.landmark && (
                              <p className="text-gray-500 text-sm">Near: {address.landmark}</p>
                            )}
                          </div>
                          <Edit className="h-4 w-4 text-gray-400" />
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {showNewAddress && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address Type
                        </label>
                        <select
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                          {...register('new_address.type')}
                        >
                          <option value="HOME">Home</option>
                          <option value="OFFICE">Office</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Address Line 1"
                        placeholder="House/Building number, Street"
                        error={errors.new_address?.address_line_1?.message}
                        {...register('new_address.address_line_1')}
                      />
                      <Input
                        label="Address Line 2 (Optional)"
                        placeholder="Area, Locality"
                        {...register('new_address.address_line_2')}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="City"
                        placeholder="City"
                        error={errors.new_address?.city?.message}
                        {...register('new_address.city')}
                      />
                      <Input
                        label="State"
                        placeholder="State"
                        error={errors.new_address?.state?.message}
                        {...register('new_address.state')}
                      />
                      <Input
                        label="Pincode"
                        placeholder="123456"
                        error={errors.new_address?.pincode?.message}
                        {...register('new_address.pincode')}
                      />
                    </div>

                    <Input
                      label="Landmark (Optional)"
                      placeholder="Near landmark for easy identification"
                      {...register('new_address.landmark')}
                    />
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Notes</h2>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  rows={3}
                  placeholder="Any special instructions for pickup (optional)"
                  {...register('notes')}
                />
              </div>
            </div>

            {/* Booking Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Amount</span>
                    <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pickup Charges</span>
                    <span className="font-semibold text-green-600">FREE</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total Payable</span>
                      <span className="font-bold text-green-600">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    loading={submitting}
                    disabled={submitting || (!selectedAddressId && !showNewAddress)}
                  >
                    Proceed to Payment
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    *Final amount will be calculated based on actual weight during pickup
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}