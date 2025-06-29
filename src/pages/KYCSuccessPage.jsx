import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, CreditCard, ArrowRight, Shield } from 'lucide-react';

const KYCSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tier, score, kycData } = location.state || {};

  const tierInfo = {
    BASIC: {
      name: "Quick Start",
      limits: { daily: 100, monthly: 500, transaction: 50 },
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    STANDARD: {
      name: "Standard Access",
      limits: { daily: 1000, monthly: 5000, transaction: 500 },
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    ENHANCED: {
      name: "Full Access",
      limits: { daily: 10000, monthly: 50000, transaction: 5000 },
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    }
  };

  const currentTier = tierInfo[tier] || tierInfo.BASIC;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              KYC Application Submitted!
            </h1>
            <p className="text-gray-600">
              Your verification has been successfully submitted and is being processed.
            </p>
          </div>

          <div className={`p-6 rounded-lg border-2 ${currentTier.bgColor} ${currentTier.borderColor} mb-6`}>
            <div className="flex items-center justify-center mb-4">
              <Shield className={`h-8 w-8 ${currentTier.color} mr-2`} />
              <h2 className={`text-2xl font-semibold ${currentTier.color}`}>
                {currentTier.name} Tier
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700">Daily Limit</div>
                <div className={`text-lg font-bold ${currentTier.color}`}>
                  ${currentTier.limits.daily}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Monthly Limit</div>
                <div className={`text-lg font-bold ${currentTier.color}`}>
                  ${currentTier.limits.monthly}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">Per Transaction</div>
                <div className={`text-lg font-bold ${currentTier.color}`}>
                  ${currentTier.limits.transaction}
                </div>
              </div>
            </div>

            {score && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Your verification score: <span className="font-semibold">{score} points</span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start text-left">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900">Application Received</h3>
                <p className="text-sm text-gray-600">
                  Your KYC documents have been securely uploaded and are being reviewed.
                </p>
              </div>
            </div>
            
            <div className="flex items-start text-left">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900">Tier Assigned</h3>
                <p className="text-sm text-gray-600">
                  You've been assigned {currentTier.name} tier based on your verification level.
                </p>
              </div>
            </div>

            {tier === 'BASIC' ? (
              <div className="flex items-start text-left">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Ready to Use</h3>
                  <p className="text-sm text-gray-600">
                    Your account is approved and ready for virtual card generation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start text-left">
                <div className="h-5 w-5 border-2 border-yellow-400 rounded-full mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
                  <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Under Review</h3>
                  <p className="text-sm text-gray-600">
                    Your application is being manually reviewed. You'll receive an update within 1-3 business days.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/generate')}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Generate Virtual Card
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Return to Home
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Application ID: {kycData?.id || 'N/A'} • 
              Submitted: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCSuccessPage;