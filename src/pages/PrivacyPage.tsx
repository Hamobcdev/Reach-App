import React from 'react';
import { Shield, UserCheck, Database } from 'lucide-react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-lg text-gray-600">
          Last updated: March 15, 2025
        </p>
      </div>

      <div className="prose prose-blue max-w-none">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <Shield className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
          </div>
          <p className="text-gray-600 mb-4">
            We collect minimal information to provide our virtual card service:
          </p>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Full name (for card issuance)</li>
            <li>Phone number (for verification and support)</li>
            <li>Transaction amounts</li>
            <li>Usage patterns (for security)</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <UserCheck className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Your information is used solely for:
          </p>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Generating virtual cards</li>
            <li>Verifying identity</li>
            <li>Preventing fraud</li>
            <li>Customer support</li>
            <li>Service improvements</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <Database className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">3. Data Protection</h2>
          </div>
          <p className="text-gray-600 mb-4">
            We implement strict security measures:
          </p>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Encryption of all personal data</li>
            <li>Regular security assessments</li>
            <li>Limited data retention periods</li>
            <li>Access controls and monitoring</li>
          </ul>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Your Rights</h2>
          <p className="text-blue-800 mb-4">
            You have the right to:
          </p>
          <ul className="space-y-2 text-blue-800">
            <li>Access your personal data</li>
            <li>Request data deletion</li>
            <li>Object to data processing</li>
            <li>Receive data in a portable format</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;