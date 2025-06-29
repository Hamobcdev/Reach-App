// src/components/StripePaymentForm.jsx
import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";

const StripePaymentForm = ({ clientSecret, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage("Stripe not ready yet.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: "http://localhost:5173/success", // fallback
      },
      redirect: "if_required", // avoid redirect if not needed
    });

    if (error) {
      setMessage(error.message || "Payment failed. Try again.");
      setLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      if (onSuccess) {
        onSuccess(paymentIntent); // callback from parent
      } else {
        navigate("/success", {
          state: { payment: paymentIntent },
        });
      }
    } else {
      setMessage("Payment not completed.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <PaymentElement />

      {message && <div className="text-red-600 text-sm mt-2">{message}</div>}

      <button
        type="submit"
        disabled={!stripe || loading}
        className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md ${
          loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
        }`}
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
};

export default StripePaymentForm;
