import React, { useState, useEffect } from 'react'
import { Calculator, Plus, Minus, Trash2, MapPin } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import { Link } from 'react-router-dom'

interface MaterialPrice {
  id: string
  name: string
  category: string
  price_per_kg: number
  minimum_quantity: number
}

interface CalculatorItem {
  materialId: string
  materialName: string
  pricePerKg: number
  quantity: number
  total: number
}

export function CalculatorPage() {
  const [materials, setMaterials] = useState<MaterialPrice[]>([])
  const [calculatorItems, setCalculatorItems] = useState<CalculatorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [quantity, setQuantity] = useState('')

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('material_prices')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })

      if (error) throw error
      setMaterials(data || [])
    } catch (error) {
      console.error('Error fetching materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    if (!selectedMaterial || !quantity) return

    const material = materials.find(m => m.id === selectedMaterial)
    if (!material) return

    const qty = parseFloat(quantity)
    if (qty < material.minimum_quantity) {
      alert(`Minimum quantity for ${material.name} is ${material.minimum_quantity} kg`)
      return
    }

    const existingItemIndex = calculatorItems.findIndex(item => item.materialId === selectedMaterial)
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...calculatorItems]
      updatedItems[existingItemIndex].quantity += qty
      updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * material.price_per_kg
      setCalculatorItems(updatedItems)
    } else {
      // Add new item
      const newItem: CalculatorItem = {
        materialId: material.id,
        materialName: material.name,
        pricePerKg: material.price_per_kg,
        quantity: qty,
        total: qty * material.price_per_kg
      }
      setCalculatorItems([...calculatorItems, newItem])
    }

    setSelectedMaterial('')
    setQuantity('')
  }

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return

    const updatedItems = [...calculatorItems]
    updatedItems[index].quantity = newQuantity
    updatedItems[index].total = newQuantity * updatedItems[index].pricePerKg
    setCalculatorItems(updatedItems)
  }

  const removeItem = (index: number) => {
    setCalculatorItems(calculatorItems.filter((_, i) => i !== index))
  }

  const totalAmount = calculatorItems.reduce((sum, item) => sum + item.total, 0)

  const groupedMaterials = materials.reduce((acc, material) => {
    if (!acc[material.category]) {
      acc[material.category] = []
    }
    acc[material.category].push(material)
    return acc
  }, {} as Record<string, MaterialPrice[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calculator className="h-12 w-12 text-green-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading materials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calculator className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Price Calculator</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get instant price estimates for your scrap materials. Add items to see how much you can earn.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Material Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Materials</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Material
                  </label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">Choose a material...</option>
                    {Object.entries(groupedMaterials).map(([category, items]) => (
                      <optgroup key={category} label={category}>
                        {items.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name} - {formatCurrency(material.price_per_kg)}/kg
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Input
                    label="Quantity (kg)"
                    type="number"
                    step="0.1"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.0"
                  />
                </div>
              </div>

              <Button onClick={addItem} disabled={!selectedMaterial || !quantity}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {/* Material Categories */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Rates</h3>
              <div className="space-y-6">
                {Object.entries(groupedMaterials).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-3 text-sm uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((material) => (
                        <div
                          key={material.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{material.name}</p>
                            <p className="text-xs text-gray-500">
                              Min: {material.minimum_quantity} kg
                            </p>
                          </div>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(material.price_per_kg)}/kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calculator Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Items</h3>
              
              {calculatorItems.length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No items added yet</p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {calculatorItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{item.materialName}</h4>
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(index, item.quantity - 0.5)}
                            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium">{item.quantity} kg</span>
                          <button
                            onClick={() => updateQuantity(index, item.quantity + 0.5)}
                            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.pricePerKg)}/kg
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {calculatorItems.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      *Final amount may vary based on actual weight and quality
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Link to="/booking" state={{ calculatorItems, totalAmount }}>
                      <Button className="w-full">
                        <MapPin className="h-4 w-4 mr-2" />
                        Book Pickup
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full">
                      Save Estimate
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}