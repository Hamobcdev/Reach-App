import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FlexibleKYCForm from '@/components/FlexibleKYCForm';

function KYCFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const formData = location.state?.formData || {};

  const handleKYCSuccess = (kycData) => {
    navigate('/generate', { state: { kycData, formData } });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-4">Complete KYC Verification</h1>
      <FlexibleKYCForm onSuccess={handleKYCSuccess} />
    </div>
  );
}

export default KYCFormPage;