import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from("virtual_cards")
      .select("*")
      .limit(1);
    if (error) throw error;
    return { success: true, message: "Supabase connected successfully" };
  } catch (error) {
    return {
      success: false,
      message: `Supabase connection failed: ${error.message}`,
    };
  }
};

// Card utility functions
const generateCardNumber = () => {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.floor(1000 + Math.random() * 9000).toString());
  }
  return segments.join("-");
};

const generateCVV = () => {
  return Math.floor(100 + Math.random() * 900).toString();
};

const generateExpiryDate = () => {
  const now = new Date();
  const expiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const month = (expiryTime.getMonth() + 1).toString().padStart(2, "0");
  const year = expiryTime.getFullYear().toString().substring(2);
  return `${month}/${year}`;
};

const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

const generateCardForFlow = (flowType, amount, customerEmail) => {
  return {
    id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cardNumber: generateCardNumber(),
    cvv: generateCVV(),
    expiryDate: generateExpiryDate(),
    amount: parseFloat(amount),
    customerEmail,
    createdAt: new Date(),
    status: "active",
    type: flowType,
  };
};

const validateCardData = (cardData) => {
  const errors = {};
  if (!cardData.amount || cardData.amount < 1) {
    errors.amount = "Amount must be at least $1";
  }
  if (!cardData.customerEmail || !cardData.customerEmail.includes("@")) {
    errors.email = "Valid email is required";
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const TEST_CARDS = {
  SUCCESS: "4242424242424242",
  DECLINED: "4000000000000002",
  INSUFFICIENT_FUNDS: "4000000000009995",
  EXPIRED: "4000000000000069",
  PROCESSING_ERROR: "4000000000000119",
  AUTHENTICATION_REQUIRED: "4000002500003155",
};

const getTestCardDescription = (cardNumber) => {
  switch (cardNumber) {
    case TEST_CARDS.SUCCESS:
      return "This card will always succeed";
    case TEST_CARDS.DECLINED:
      return "This card will be declined";
    case TEST_CARDS.INSUFFICIENT_FUNDS:
      return "This card will be declined for insufficient funds";
    case TEST_CARDS.EXPIRED:
      return "This card will be declined as expired";
    case TEST_CARDS.PROCESSING_ERROR:
      return "This card will fail with a processing error";
    case TEST_CARDS.AUTHENTICATION_REQUIRED:
      return "This card will require authentication";
    default:
      return "Unknown test card";
  }
};

const IntegrationTests = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState("unknown");
  const [supabaseStatus, setSupabaseStatus] = useState("unknown");

  const [testData, setTestData] = useState({
    amount: 50,
    email: "test@example.com",
    cardNumber: TEST_CARDS.SUCCESS,
  });

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/test`);
      if (response.ok) {
        setServerStatus("connected");
      } else {
        setServerStatus("error");
      }
    } catch (error) {
      setServerStatus("disconnected");
    }

    const supabaseTest = await testConnection();
    setSupabaseStatus(supabaseTest.success ? "connected" : "error");
  };

  const runTest = async (testName, testFunction) => {
    setLoading(true);
    setTestResults((prev) => ({ ...prev, [testName]: { status: "running" } }));

    try {
      const result = await testFunction();
      setTestResults((prev) => ({
        ...prev,
        [testName]: { status: "success", data: result },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [testName]: { status: "error", error: error.message },
      }));
    }

    setLoading(false);
  };

  const testServerConnection = async () => {
    const response = await fetch(`${API_BASE_URL}/api/test`);
    if (!response.ok) throw new Error("Server not responding");
    return await response.json();
  };

  const testPaymentIntent = async () => {
    const response = await fetch(`${API_BASE_URL}/api/cards/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "test-user",
        amount: testData.amount,
        currency: "usd",
        merchantId: "test-merchant",
      }),
    });
    if (!response.ok)
      throw new Error(
        (await response.json()).error || "Payment intent creation failed"
      );
    return await response.json();
  };

  const testVirtualCardCreation = async () => {
    const response = await fetch(`${API_BASE_URL}/api/cards/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "test-user",
        amount: testData.amount,
        currency: "usd",
        merchantId: "test-merchant",
      }),
    });
    if (!response.ok)
      throw new Error(
        (await response.json()).error || "Virtual card creation failed"
      );
    return await response.json();
  };

  const testSupabaseOperations = async () => {
    const cardData = generateCardForFlow(
      "instant",
      testData.amount,
      testData.email
    );
    const { data: insertData, error: insertError } = await supabase
      .from("virtual_cards")
      .insert([
        {
          card_number: cardData.cardNumber,
          cvv: cardData.cvv,
          expiry_date: cardData.expiryDate,
          amount: cardData.amount,
          customer_email: cardData.customerEmail,
          status: cardData.status,
        },
      ])
      .select();
    if (insertError) throw new Error(insertError.message);

    const { data: selectData, error: selectError } = await supabase
      .from("virtual_cards")
      .select("*")
      .eq("customer_email", testData.email)
      .limit(1);
    if (selectError) throw new Error(selectError.message);

    return { inserted: insertData, selected: selectData };
  };

  const testCardUtilities = async () => {
    const cardData = generateCardForFlow(
      "premium",
      testData.amount,
      testData.email
    );
    const validation = validateCardData(cardData);
    return {
      generatedCard: cardData,
      validation: validation,
      formattedAmount: formatCurrency(cardData.amount),
    };
  };

  const testFullFlow = async () => {
    const paymentIntent = await testPaymentIntent();
    const virtualCard = await testVirtualCardCreation();
    const { data, error } = await supabase
      .from("virtual_cards")
      .insert([
        {
          card_number: virtualCard.card.cardNumber,
          cvv: virtualCard.card.cvv,
          expiry_date: virtualCard.card.expiryDate,
          amount: virtualCard.card.amount,
          customer_email: testData.email,
          status: virtualCard.card.status,
          payment_intent_id: paymentIntent.card.paymentIntentId,
        },
      ])
      .select();
    if (error) throw new Error(error.message);
    return {
      paymentIntent,
      virtualCard,
      savedToDatabase: data,
    };
  };

  const StatusBadge = ({ status, children }) => {
    const colors = {
      connected: "bg-green-100 text-green-800",
      disconnected: "bg-red-100 text-red-800",
      error: "bg-red-100 text-red-800",
      unknown: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}
      >
        {children}
      </span>
    );
  };

  const TestResult = ({ testName, result }) => {
    if (!result) return null;
    const { status, data, error } = result;
    return (
      <div className="border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">{testName}</h4>
          <StatusBadge status={status}>
            {status === "running" ? "Running..." : status}
          </StatusBadge>
        </div>
        {status === "success" && data && (
          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
        {status === "error" && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Integration Tests Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Server Status</h3>
            <StatusBadge status={serverStatus}>
              {serverStatus === "connected"
                ? "✅ Connected"
                : serverStatus === "disconnected"
                ? "❌ Disconnected"
                : serverStatus === "error"
                ? "⚠️ Error"
                : "⏳ Checking..."}
            </StatusBadge>
            <p className="text-xs text-gray-600 mt-1">{API_BASE_URL}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Supabase Status</h3>
            <StatusBadge status={supabaseStatus}>
              {supabaseStatus === "connected"
                ? "✅ Connected"
                : supabaseStatus === "error"
                ? "❌ Error"
                : "⏳ Checking..."}
            </StatusBadge>
            <p className="text-xs text-gray-600 mt-1">Database connection</p>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-4">Test Configuration</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                value={testData.amount}
                onChange={(e) =>
                  setTestData((prev) => ({
                    ...prev,
                    amount: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={testData.email}
                onChange={(e) =>
                  setTestData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Test Card
              </label>
              <select
                value={testData.cardNumber}
                onChange={(e) =>
                  setTestData((prev) => ({
                    ...prev,
                    cardNumber: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                {Object.entries(TEST_CARDS).map(([key, value]) => (
                  <option key={key} value={value}>
                    {key.replace("_", " ")}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                {getTestCardDescription(testData.cardNumber)}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => runTest("server", testServerConnection)}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            Test Server
          </button>
          <button
            onClick={() => runTest("payment", testPaymentIntent)}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-sm"
          >
            Test Payment
          </button>
          <button
            onClick={() => runTest("card", testVirtualCardCreation)}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 text-sm"
          >
            Test Card Creation
          </button>
          <button
            onClick={() => runTest("supabase", testSupabaseOperations)}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 text-sm"
          >
            Test Supabase
          </button>
          <button
            onClick={() => runTest("utilities", testCardUtilities)}
            disabled={loading}
            className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:opacity-50 text-sm"
          >
            Test Utilities
          </button>
          <button
            onClick={() => runTest("fullFlow", testFullFlow)}
            disabled={loading}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 text-sm"
          >
            Test Full Flow
          </button>
        </div>
        <div className="mb-6">
          <button
            onClick={checkConnections}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
          >
            🔄 Refresh Connections
          </button>
        </div>
        <div>
          <h3 className="font-medium mb-4">Test Results</h3>
          {Object.entries(testResults).map(([testName, result]) => (
            <TestResult key={testName} testName={testName} result={result} />
          ))}
          {Object.keys(testResults).length === 0 && (
            <p className="text-gray-500 text-center py-8">
              Run some tests to see results here
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationTests;
