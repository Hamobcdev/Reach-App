// src/pages/PayPage.tsx

/// <reference types="vite/client" />

import React, { useState } from "react";
import axios from "axios";
import { Check, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PayPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userId: "",
    amount: "",
    currency: "usd",
    merchantId: "",
  });
  const [cardStatus, setCardStatus] = useState < any > null;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = (useState < string) | (null > null);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
        }/api/cards/create`,
        formData
      );
      setCardStatus(response.data.card);
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          Pay with Virtual Card
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Securely generate and redeem a one-time virtual card for your
          transaction.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {!cardStatus ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white shadow p-6 rounded-md"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              User ID
            </label>
            <input
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount (USD)
            </label>
            <input
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Merchant ID
            </label>
            <input
              name="merchantId"
              value={formData.merchantId}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Processing..." : "Generate Virtual Card"}
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center space-y-4">
          <div className="flex justify-center items-center space-x-2">
            <Check className="text-green-500 h-6 w-6" />
            <h2 className="text-lg font-semibold text-gray-800">
              Card Created Successfully
            </h2>
          </div>
          <p className="text-sm text-gray-500">Card ID: {cardStatus.id}</p>
          <p className="text-sm text-gray-500">Amount: ${cardStatus.amount}</p>
          <p className="text-sm text-gray-500">Status: {cardStatus.status}</p>
          <p className="text-sm text-gray-500">
            Expires: {new Date(cardStatus.expiresAt).toLocaleString()}
          </p>
          <button
            onClick={() => navigate(`/card/${cardStatus.id}`)}
            className="mt-4 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            View Card
          </button>
        </div>
      )}
    </div>
  );
};

export default PayPage;
