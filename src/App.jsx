import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import Footer from "./components/Footer";

import HomePage from "./pages/HomePage";
import CardGenerationPage from "./pages/CardGenerationPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import HelpPage from "./pages/HelpPage";
import FAQPage from "./pages/FAQPage";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import MobileMoneyPage from "./pages/MobileMoneyPage";
import KYCSuccessPage from "./pages/KYCSuccessPage";
import CrisisCasesView from "./pages/CrisisCasesView";
import NgoDashboard from "./pages/NgoDashboard";
import AlgorandDashboard from "./pages/AlgorandDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import VideoTutorial from "./components/VideoTutorial";
import VoiceAssistant from "./components/VoiceAssistant";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const AppContent = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<CardGenerationPage />} />
          <Route path="/mobile-money" element={<MobileMoneyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/kyc-success" element={<KYCSuccessPage />} />
          <Route path="/crisis-cases" element={<CrisisCasesView />} />
          <Route path="/algorand" element={<AlgorandDashboard />} />

          {/* NGO Dashboard */}
          <Route
            path="/ngo-dashboard"
            element={
              <ProtectedRoute requiredRole="ngo">
                <NgoDashboard />
              </ProtectedRoute>
            }
          />

          {/* Guide & AI Routes */}
          <Route
            path="/video-assistance"
            element={
              <div className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-2 gap-8">
                  <VideoTutorial
                    title="How to Use Your Virtual Card"
                    description="Step-by-step video guide on using your Samoa Virtual Bankcard for online payments."
                  />
                  <VoiceAssistant />
                </div>
              </div>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <div className="container mx-auto px-4 py-8">
                  <h1 className="text-2xl font-bold mb-6">User Settings</h1>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-gray-600">
                      Settings page coming soon...
                    </p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Fallback Route */}
          <Route
            path="*"
            element={
              <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">
                  Page Not Found
                </h1>
                <p className="text-gray-600">
                  The page you're looking for doesn't exist.
                </p>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <LanguageProvider>
      <Router>
        <Elements stripe={stripePromise}>
          <AppContent />
        </Elements>
      </Router>
    </LanguageProvider>
  </AuthProvider>
);

export default App;