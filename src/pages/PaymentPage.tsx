import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CreditCard, Shield, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../lib/utils'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface OrderDetails {
  id: string
  scheduled_date: string
  scheduled_time_slot: string
  estimated_amount: number
  items?: any[]
}

export function PaymentPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending')
  const [error, setError] = useState<string | null>(null)

  const { orderId, amount, orderDetails } = location.state || {}

  useEffect(() => {
    if (!user || !orderId) {
      navigate('/login')
      return
    }

    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [user, orderId, navigate])

  const createRazorpayOrder = async () => {
    try {
      // In a real implementation, this would call your backend API
      // For demo purposes, we'll simulate the order creation
      const orderData = {
        id: `order_${Date.now()}`,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: `receipt_${orderId}`,
      }

      return orderData
    } catch (error) {
      throw new Error('Failed to create payment order')
    }
  }

  const handlePayment = async () => {
    if (!window.Razorpay) {
      setError('Payment gateway not loaded. Please refresh and try again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const razorpayOrder = await createRazorpayOrder()

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_demo', // Demo key
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'ScrapPickup',
        description: `Scrap Pickup Order #${orderId.slice(-8)}`,
        order_id: razorpayOrder.id,
        handler: async (response: any) => {
          await handlePaymentSuccess(response)
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: {
          color: '#059669', // Green color matching our theme
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            setPaymentStatus('pending')
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', handlePaymentFailure)
      razorpay.open()
    } catch (error) {
      setError('Failed to initiate payment. Please try again.')
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async (response: any) => {
    setPaymentStatus('processing')

    try {
      // Update order status in database
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          payment_status: 'PAID',
          payment_id: response.razorpay_payment_id,
          status: 'CONFIRMED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (orderError) throw orderError

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          order_id: orderId,
          payment_gateway: 'razorpay',
          gateway_payment_id: response.razorpay_payment_id,
          gateway_order_id: response.razorpay_order_id,
          amount: amount,
          currency: 'INR',
          status: 'SUCCESS',
        }])

      if (paymentError) throw paymentError

      setPaymentStatus('success')
      
      // Redirect to success page after a delay
      setTimeout(() => {
        navigate('/dashboard', { 
          state: { 
            message: 'Payment successful! Your pickup has been confirmed.',
            orderId 
          } 
        })
      }, 3000)
    } catch (error) {
      console.error('Error updating payment status:', error)
      setPaymentStatus('failed')
      setError('Payment was successful but there was an error updating your order. Please contact support.')
    }
  }

  const handlePaymentFailure = (response: any) => {
    setPaymentStatus('failed')
    setError(response.error?.description || 'Payment failed. Please try again.')
    setLoading(false)
  }

  const handleRetry = () => {
    setPaymentStatus('pending')
    setError(null)
    handlePayment()
  }

  if (!user || !orderId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
          <p className="text-gray-600">
            Secure payment to confirm your scrap pickup booking
          </p>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Payment Successful!</h3>
                <p className="text-green-700">Your pickup has been confirmed. Redirecting to dashboard...</p>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Payment Failed</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Processing Payment...</h3>
                <p className="text-blue-700">Please wait while we confirm your payment.</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
          
          {orderDetails && (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Order ID</span>
                <span className="font-medium">#{orderId.slice(-8)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Pickup Date</span>
                <span className="font-medium">
                  {new Date(orderDetails.scheduled_date).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Time Slot</span>
                <span className="font-medium">{orderDetails.scheduled_time_slot}</span>
              </div>

              {orderDetails.items && orderDetails.items.length > 0 && (
                <div className="py-2 border-b border-gray-100">
                  <span className="text-gray-600 block mb-2">Items</span>
                  <div className="space-y-1">
                    {orderDetails.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.materialName} ({item.quantity} kg)</span>
                        <span>{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
          
          <div className="space-y-4">
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="h-6 w-6 text-green-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">UPI / Cards / Net Banking</h3>
                    <p className="text-sm text-gray-600">Powered by Razorpay - Secure & Fast</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <img src="https://razorpay.com/assets/razorpay-glyph.svg" alt="Razorpay" className="h-6" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Secure Payment</p>
              <p className="text-blue-700">
                Your payment information is encrypted and secure. We don't store your card details.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {paymentStatus === 'pending' && (
            <Button
              onClick={handlePayment}
              className="w-full"
              size="lg"
              loading={loading}
              disabled={loading}
            >
              Pay {formatCurrency(amount)}
            </Button>
          )}

          {paymentStatus === 'failed' && (
            <Button
              onClick={handleRetry}
              className="w-full"
              size="lg"
            >
              Retry Payment
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => navigate('/booking')}
            className="w-full"
            disabled={paymentStatus === 'processing'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Booking
          </Button>
        </div>

        {/* Terms */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            By proceeding with payment, you agree to our{' '}
            <a href="/terms" className="text-green-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}