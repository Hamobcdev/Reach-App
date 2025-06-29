import React from 'react';
import { Shield, Scale, Lock } from 'lucide-react';

const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-lg text-gray-600">
          Last updated: March 15, 2025
        </p>
      </div>

      <div className="prose prose-blue max-w-none">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <Shield className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">1. Service Overview</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Samoa Virtual BankCard provides a digital payment solution that enables users to make online purchases through virtual cards. Our service is designed to help the unbanked population access digital payment methods safely and securely.
          </p>
          <ul className="list-disc pl-5 text-gray-600">
            <li>One-time use virtual cards for online purchases</li>
            <li>No bank account required</li>
            <li>Secure payment processing</li>
            <li>10-minute validity period for enhanced security</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <Scale className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">2. User Responsibilities</h2>
          </div>
          <p className="text-gray-600 mb-4">
            By using our service, you agree to:
          </p>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Provide accurate and truthful information</li>
            <li>Not use the service for illegal activities</li>
            <li>Keep your card details secure and confidential</li>
            <li>Use each virtual card only once</li>
            <li>Report any suspicious activity immediately</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <Lock className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">3. Privacy & Security</h2>
          </div>
          <p className="text-gray-600 mb-4">
            We are committed to protecting your privacy and maintaining the security of your information:
          </p>
          <ul className="list-disc pl-5 text-gray-600">
            <li>End-to-end encryption for all transactions</li>
            <li>No permanent storage of card details</li>
            <li>Automatic card expiration after 10 minutes</li>
            <li>Regular security audits and updates</li>
          </ul>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Contact Us</h2>
          <p className="text-blue-800">
            If you have any questions about these Terms, please contact us at:
          </p>
          <ul className="mt-2 space-y-2 text-blue-800">
            <li>Email: legal@samoavirtualcard.com</li>
            <li>Phone: +685 123 4567</li>
            <li>Address: Beach Road, Apia, Samoa</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;