'use client'

import React from 'react'
import { AlertCircle, Lock, CreditCard, Zap } from 'lucide-react'

/**
 * Coming Soon: Packages Section
 *
 * Premium assessment packages with Stripe payment integration.
 * Users can purchase packages to access specialized assessments.
 * Results are saved to their personal dashboard.
 *
 * Superadmin can:
 * - Create free use codes
 * - Create promo/discount codes
 * - Manage pricing
 * - View payment analytics
 */
export default function PackagesComingSoon() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-6">
            <Zap className="w-8 h-8 text-blue-400" />
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Premium Assessment Packages
          </h1>

          <p className="text-xl text-slate-300 mb-8">
            Coming Soon: Unlock advanced assessments with our new premium packages
          </p>

          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
            <AlertCircle className="w-5 h-5 text-blue-400 mr-2" />
            <span className="text-blue-300 text-sm font-medium">
              Available in the next release
            </span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Feature 1: Secure Payments */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 backdrop-blur">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-500/20">
                  <CreditCard className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Secure Stripe Payments
                </h3>
                <p className="text-slate-400 text-sm">
                  Industry-leading payment processing with Stripe integration. All transactions are PCI-DSS compliant.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2: Dashboard Storage */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 backdrop-blur">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/20">
                  <Lock className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Private Dashboard Storage
                </h3>
                <p className="text-slate-400 text-sm">
                  All assessment results are securely saved to your personal dashboard for easy access and tracking.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What's Coming */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 backdrop-blur mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">What to Expect</h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  ✓
                </div>
              </div>
              <div className="ml-4">
                <h4 className="font-semibold text-white">Premium Assessment Packages</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Access to specialized assessment bundles including advanced clinical instruments not available in free tier.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  ✓
                </div>
              </div>
              <div className="ml-4">
                <h4 className="font-semibold text-white">One-Time & Recurring Options</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Choose between one-time purchases for individual assessments or monthly/yearly subscriptions.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  ✓
                </div>
              </div>
              <div className="ml-4">
                <h4 className="font-semibold text-white">Comprehensive Result Analytics</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Detailed scoring, interpretation, and recommendations for each assessment with trend tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  ✓
                </div>
              </div>
              <div className="ml-4">
                <h4 className="font-semibold text-white">Flexible Promo Code System</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Superadmin can create free use codes and discount codes for promotional campaigns and special access.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  ✓
                </div>
              </div>
              <div className="ml-4">
                <h4 className="font-semibold text-white">Payment Analytics Dashboard</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Track revenue, payment status, promo code usage, and customer analytics in the admin panel.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Superadmin Features */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Superadmin Features</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-amber-200 mb-4">Promotional Codes</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-3" />
                  Create free use codes for unlimited access
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-3" />
                  Generate percentage or fixed-amount discounts
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-3" />
                  Set usage limits and expiration dates
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-3" />
                  Track code usage in real-time
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-amber-200 mb-4">Management & Analytics</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-3" />
                  View all customer payments and transactions
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-3" />
                  Monitor revenue and payment success rates
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-3" />
                  Manage package pricing and availability
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-3" />
                  Complete audit trail of all transactions
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Timeline</h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-24">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">
                  CURRENT
                </span>
              </div>
              <div className="ml-4 pb-8 border-l-2 border-slate-600 pl-8">
                <h4 className="font-semibold text-white">Payment Infrastructure Ready</h4>
                <p className="text-slate-400 text-sm mt-2">
                  Database schema, RLS policies, and Stripe integration complete. Promo code system ready for deployment.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-24">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-600 text-slate-300">
                  NEXT
                </span>
              </div>
              <div className="ml-4 pb-8 border-l-2 border-slate-600 pl-8">
                <h4 className="font-semibold text-white">Stripe UI Integration</h4>
                <p className="text-slate-400 text-sm mt-2">
                  Frontend components for package selection, checkout process, and payment confirmation.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-24">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-600 text-slate-300">
                  Q3 2026
                </span>
              </div>
              <div className="ml-4 pl-8">
                <h4 className="font-semibold text-white">Full Launch</h4>
                <p className="text-slate-400 text-sm mt-2">
                  Premium packages live with complete payment processing, dashboard integration, and analytics.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-6">
            We&apos;re building something great. Check back soon!
          </p>
          <button
            disabled
            className="inline-flex items-center px-6 py-3 rounded-lg bg-slate-700 text-slate-400 font-semibold cursor-not-allowed opacity-50"
          >
            Get Early Access (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  )
}
