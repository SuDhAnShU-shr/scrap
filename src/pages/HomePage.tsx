import React from 'react'
import { Link } from 'react-router-dom'
import { Calculator, Clock, Shield, Truck, Star, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Turn Your <span className="text-green-600">Scrap</span> Into <span className="text-blue-600">Cash</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Schedule hassle-free scrap pickup from your doorstep. Get instant price quotes, 
                book online, and earn money while contributing to a cleaner environment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/calculator">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Calculator className="h-5 w-5 mr-2" />
                    Get Price Quote
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Book Pickup Now
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="flex items-center space-x-8 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Free Pickup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Best Prices</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Same Day Service</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&w=800" 
                alt="Scrap collection and recycling"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Star className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">4.9/5 Rating</p>
                    <p className="text-sm text-gray-600">From 1000+ customers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ScrapPickup?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We make scrap collection simple, transparent, and rewarding with our modern approach to recycling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Pricing</h3>
              <p className="text-gray-600">
                Get real-time price quotes for your scrap materials with our smart calculator.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quick Pickup</h3>
              <p className="text-gray-600">
                Schedule pickup at your convenience. Same-day service available in most areas.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-gray-600">
                Safe and secure UPI payments directly to your account after pickup completion.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Doorstep Service</h3>
              <p className="text-gray-600">
                Our trained professionals collect scrap directly from your location.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Materials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What We Collect
            </h2>
            <p className="text-xl text-gray-600">
              We accept a wide variety of recyclable materials at competitive prices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: 'Metal Scrap',
                items: ['Iron', 'Steel', 'Aluminum', 'Copper', 'Brass'],
                price: '₹25-45/kg',
                image: 'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=400'
              },
              {
                name: 'Paper & Cardboard',
                items: ['Newspapers', 'Books', 'Cardboard', 'Office Paper'],
                price: '₹8-15/kg',
                image: 'https://images.pexels.com/photos/167538/pexels-photo-167538.jpeg?auto=compress&cs=tinysrgb&w=400'
              },
              {
                name: 'Plastic Materials',
                items: ['Bottles', 'Containers', 'Bags', 'Packaging'],
                price: '₹12-25/kg',
                image: 'https://images.pexels.com/photos/802221/pexels-photo-802221.jpeg?auto=compress&cs=tinysrgb&w=400'
              },
              {
                name: 'Electronic Waste',
                items: ['Computers', 'Phones', 'Cables', 'Components'],
                price: '₹15-50/kg',
                image: 'https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg?auto=compress&cs=tinysrgb&w=400'
              },
              {
                name: 'Glass Items',
                items: ['Bottles', 'Jars', 'Windows', 'Mirrors'],
                price: '₹5-12/kg',
                image: 'https://images.pexels.com/photos/1000084/pexels-photo-1000084.jpeg?auto=compress&cs=tinysrgb&w=400'
              },
              {
                name: 'Appliances',
                items: ['Refrigerators', 'Washing Machines', 'ACs', 'TVs'],
                price: '₹100-500/piece',
                image: 'https://images.pexels.com/photos/4107123/pexels-photo-4107123.jpeg?auto=compress&cs=tinysrgb&w=400'
              }
            ].map((material, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <img 
                  src={material.image} 
                  alt={material.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{material.name}</h3>
                  <p className="text-gray-600 mb-3">
                    {material.items.join(', ')}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-600">{material.price}</span>
                    <Button size="sm" variant="outline">Learn More</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Turn Your Scrap Into Cash?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of satisfied customers who trust us with their scrap collection needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/calculator">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-green-600 hover:bg-gray-100">
                <Calculator className="h-5 w-5 mr-2" />
                Calculate Price
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-green-600">
                Book Pickup Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}