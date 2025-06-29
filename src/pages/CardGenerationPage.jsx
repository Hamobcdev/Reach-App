import React, { useState, useEffect, useContext } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import StripePaymentForm from "../components/StripePaymentForm";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  Lock,
  Upload,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import FlexibleKYCForm from "../components/FlexibleKYCForm";
import {
  generateCardNumber,
  generateCVV,
  generateExpiryDate,
  formatCurrency,
} from "../utils/cardUtils.js";
import { LanguageContext } from "../context/LanguageContext";

const CardGenerationPage = () => {
  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  const [clientSecret, setClientSecret] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useContext(LanguageContext);
  const { kycData: initialKycData } = location.state || {};
  const [step, setStep] = useState(1); // 1: KYC, 2: Card Generation, 3: Payment
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [kycData, setKycData] = useState(initialKycData || {});
  const [card, setCard] = useState(null);
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [country, setCountry] = useState("Samoa");
  const [birthdate, setBirthdate] = useState("");

  const translations = {
    en: {
      kycTitle: "KYC Verification",
      kycSubtitle:
        "Complete KYC to proceed (required for regulatory purposes).",
      cardTitle: "Generate Card",
      paymentTitle: "Payment",
      amountLabel: "Card Amount (USD) *",
      methodLabel: "Payment Method *",
      errorPrefix: "Error: ",
      countryLabel: "Country *",
      birthdateLabel: "Birthdate *",
      idFrontLabel: "ID Front *",
      idBackLabel: "ID Back *",
      selfieLabel: "Selfie *",
      retryMessage: "Please retry or choose an alternative method.",
      upgradeVerification: "Upgrade Verification Tier",
      firstNameLabel: "First Name *",
      lastNameLabel: "Last Name *",
      phoneLabel: "Phone Number *",
      submitKyc: "Submit KYC",
      kycDetails: "KYC Details",
      tier: "Tier",
      status: "Status",
      name: "Name",
      phone: "Phone",
      country: "Country",
      birthdate: "Birthdate",
      completeKycFirst:
        "Please complete KYC verification first to generate a card.",
      completeKycVerification: "Complete KYC Verification",
    },
    sm: {
      kycTitle: "Fa'amaonia KYC",
      kycSubtitle:
        "Fa'amaonia le KYC e fa'agasolo ai (mana'omia mo faiga fa'atonutonu).",
      cardTitle: "Fa'atupu Kāto",
      paymentTitle: "Totogi",
      amountLabel: "Aofa'i o le Kāto (USD) *",
      methodLabel: "Auala Totogi *",
      errorPrefix: "Sese: ",
      countryLabel: "Atunu'u *",
      birthdateLabel: "Aso Fanau *",
      idFrontLabel: "Pito i Luma o le ID *",
      idBackLabel: "Pito i Tuafafa o le ID *",
      selfieLabel: "Selfie *",
      retryMessage: "Fa'afetaui pe filifili se isi auala.",
      upgradeVerification: "Fa'aleleia le Tulaga Fa'amaonia",
      firstNameLabel: "Igoa Muamua *",
      lastNameLabel: "Igoa Muli *",
      phoneLabel: "Numera Telefoni *",
      submitKyc: "Auina le KYC",
      kycDetails: "Fa'amatalaga KYC",
      tier: "Tulaga",
      status: "Tulaga",
      name: "Igoa",
      phone: "Telefoni",
      country: "Atunu'u",
      birthdate: "Aso Fanau",
      completeKycFirst: "Fa'amaonia muamua le KYC e fa'atupu ai se kāto.",
      completeKycVerification: "Fa'amaonia le KYC",
    },
    sw: {
      kycTitle: "Uthibitisho wa KYC",
      kycSubtitle:
        "Maliza KYC ili kuendelea (inahitajika kwa madhumuni ya udhibiti).",
      cardTitle: "Tengeneza Kadi",
      paymentTitle: "Malipo",
      amountLabel: "Kiasi cha Kadi (USD) *",
      methodLabel: "Njia ya Malipo *",
      errorPrefix: "Hitilafu: ",
      countryLabel: "Nchi *",
      birthdateLabel: "Tarehe ya Kuzaliwa *",
      idFrontLabel: "Mbele ya Kitambulisho *",
      idBackLabel: "Nyuma ya Kitambulisho *",
      selfieLabel: "Selfie *",
      retryMessage: "Jaribu tena au chagua njia mbadala.",
      upgradeVerification: "Boresha Kiwango cha Uthibitisho",
      firstNameLabel: "Jina la Kwanza *",
      lastNameLabel: "Jina la Mwisho *",
      phoneLabel: "Nambari ya Simu *",
      submitKyc: "Wasilisha KYC",
      kycDetails: "Maelezo ya KYC",
      tier: "Kiwango",
      status: "Hali",
      name: "Jina",
      phone: "Simu",
      country: "Nchi",
      birthdate: "Tarehe ya Kuzaliwa",
      completeKycFirst:
        "Maliza uthibitisho wa KYC kwanza ili kutengeneza kadi.",
      completeKycVerification: "Maliza Uthibitisho wa KYC",
    },
    tl: {
      kycTitle: "Pag-verify ng KYC",
      kycSubtitle:
        "Kumpletuhin ang KYC upang magpatuloy (kinakailangan para sa mga layunin ng regulasyon).",
      cardTitle: "Gumawa ng Card",
      paymentTitle: "Pagbabayad",
      amountLabel: "Halaga ng Card (USD) *",
      methodLabel: "Paraan ng Pagbabayad *",
      errorPrefix: "Error: ",
      countryLabel: "Bansa *",
      birthdateLabel: "Petsa ng Kapanganakan *",
      idFrontLabel: "Harap ng ID *",
      idBackLabel: "Likod ng ID *",
      selfieLabel: "Selfie *",
      retryMessage: "Subukang muli o pumili ng alternatibong paraan.",
      upgradeVerification: "I-upgrade ang Verification Tier",
      firstNameLabel: "Unang Pangalan *",
      lastNameLabel: "Apelyido *",
      phoneLabel: "Numero ng Telepono *",
      submitKyc: "Isumite ang KYC",
      kycDetails: "Mga Detalye ng KYC",
      tier: "Tier",
      status: "Status",
      name: "Pangalan",
      phone: "Telepono",
      country: "Bansa",
      birthdate: "Petsa ng Kapanganakan",
      completeKycFirst:
        "Kumpletuhin muna ang KYC verification para makagawa ng card.",
      completeKycVerification: "Kumpletuhin ang KYC Verification",
    },
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (user) {
        setUser(user);
        // Check if KYC already exists
        supabase
          .from("kyc_data")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (data && data.status === "verified") {
              setKycData(data);
              setStep(2); // Skip to card generation
            }
          });
      }
    });
  }, []);

  const handleKYCSubmit = async (formData) => {
    if (!user) {
      setError(
        `${translations[language].errorPrefix}Please log in to submit KYC.`
      );
      return;
    }
    const tier = formData.tier || "INSUFFICIENT";
    const kycRecord = {
      user_id: user.id,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      tier,
      status: tier === "INSUFFICIENT" ? "pending" : "verified",
      country,
      birthdate,
      created_at: new Date(),
    };
    
    // Check if storage bucket exists before uploading
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error checking storage buckets:', bucketsError);
        setError(`${translations[language].errorPrefix}Failed to check storage buckets.`);
        return;
      }
      
      const kycBucketExists = buckets.some(bucket => bucket.name === 'kyc-documents');
      
      if (!kycBucketExists) {
        console.error('KYC documents bucket does not exist');
        setError(`${translations[language].errorPrefix}Storage bucket for KYC documents does not exist. Please contact support.`);
        return;
      }
      
      // Proceed with uploads if bucket exists
      const uploadPromises = [];
      if (idFront)
        uploadPromises.push(
          supabase.storage.from("kyc-documents").upload(`${user.id}/id_front.jpg`, idFront)
        );
      if (idBack)
        uploadPromises.push(
          supabase.storage.from("kyc-documents").upload(`${user.id}/id_back.jpg`, idBack)
        );
      if (selfie)
        uploadPromises.push(
          supabase.storage.from("kyc-documents").upload(`${user.id}/selfie.jpg`, selfie)
        );
      
      if (uploadPromises.length > 0) {
        const uploadResults = await Promise.all(uploadPromises);
        const uploadErrors = uploadResults
          .filter((result) => result.error)
          .map((result) => result.error);
        
        if (uploadErrors.length > 0) {
          console.error('Upload errors:', uploadErrors);
          setError(
            `${translations[language].errorPrefix}Failed to upload KYC documents: ${uploadErrors[0].message}`
          );
          return;
        }
      }
    } catch (error) {
      console.error('Error during document upload:', error);
      // Continue with KYC submission even if document upload fails
      console.log('Continuing with KYC submission without documents');
    }
    
    // Submit KYC data regardless of document upload status
    const { error: kycError } = await supabase
      .from("kyc_data")
      .upsert([kycRecord], { onConflict: "user_id" });
    
    if (kycError) {
      setError(
        `${translations[language].errorPrefix}Failed to submit KYC data: ${kycError.message}`
      );
      return;
    }
    
    await supabase.from("events").insert([
      {
        user_id: user.id,
        type: "kyc_submit",
        data: kycRecord,
        created_at: new Date(),
      },
    ]);
    
    setKycData(kycRecord);
    setStep(2);
    setError("");
  };

  const handleCardGenerate = async () => {
    if (!kycData || kycData.tier === "INSUFFICIENT") {
      setError(
        `${translations[language].errorPrefix}Complete KYC verification with at least BASIC tier.`
      );
      return;
    }
    const newCard = {
      user_id: user.id,
      cardNumber: "****-****-****-1234", // Placeholder for Chainlink VRF
      cvv: "456", // Placeholder
      expiryDate: "12/26", // Placeholder
      amount: parseFloat(amount) || 0,
      status: "pending",
      stripe_issuing_id: "tmp_issuing_id", // Placeholder
    };
    setCard(newCard);
    setStep(3);
    await supabase.from("events").insert([
      {
        user_id: user.id,
        type: "card_generate",
        data: newCard,
        created_at: new Date(),
      },
    ]);
  };

  const handlePayment = async () => {
    if (!card || !amount || parseFloat(amount) < 1) {
      setError(
        `${translations[language].errorPrefix}Please enter a valid amount.`
      );
      return;
    }
    if (paymentMethod === "crypto") {
      setError(
        `${translations[language].errorPrefix}Crypto payment flow coming soon (Algorand Wallet redirect).`
      );
      return;
    }
    if (paymentMethod === "stripe" && Math.random() > 0.7) {
      setError(
        `${translations[language].errorPrefix}Payment failed. ${translations[language].retryMessage}`
      );
      return;
    }
    const payment = {
      user_id: user.id,
      amount: parseFloat(amount),
      method: paymentMethod,
      status: "completed",
      created_at: new Date(),
    };
    const { error: paymentError } = await supabase
      .from("payments")
      .insert([payment]);
    if (paymentError) {
      setError(
        `${translations[language].errorPrefix}Payment recording failed.`
      );
      return;
    }
    await supabase.from("events").insert([
      {
        user_id: user.id,
        type: "payment_complete",
        data: payment,
        created_at: new Date(),
      },
    ]);
    navigate("/success", { state: { card, payment } });
  };

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) setter(file);
  };

  return (
    <div
      className="min-h-screen bg-gray-100 bg-[url('/assets/home-bg.jpg')] bg-cover bg-center p-6"
      style={{ backgroundColor: "#f0f4f8" }}
    >
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Get Your Virtual Card
        </h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              {translations[language].kycTitle}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {translations[language].kycSubtitle}
            </p>
            <FlexibleKYCForm
              onSubmit={handleKYCSubmit}
              initialData={kycData}
              translations={translations[language]}
              extraFields={
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations[language].countryLabel}
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Samoa">Samoa</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Philippines">Philippines</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations[language].birthdateLabel}
                    </label>
                    <input
                      type="date"
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations[language].idFrontLabel}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setIdFront)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Upload className="ml-2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations[language].idBackLabel}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setIdBack)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Upload className="ml-2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {translations[language].selfieLabel}
                    </label>
                    <div className="flex items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setSelfie)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Upload className="ml-2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </>
              }
            />
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              {translations[language].cardTitle}
            </h2>
            {kycData && Object.keys(kycData).length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <h3 className="text-lg font-semibold mb-2">
                  {translations[language].kycDetails}
                </h3>
                <p>
                  {translations[language].tier}: {kycData.tier}
                </p>
                <p>
                  {translations[language].status}: {kycData.status}
                </p>
                <p>
                  {translations[language].name}: {kycData.firstName}{" "}
                  {kycData.lastName}
                </p>
                <p>
                  {translations[language].phone}: {kycData.phone}
                </p>
                <p>
                  {translations[language].country}: {kycData.country}
                </p>
                <p>
                  {translations[language].birthdate}: {kycData.birthdate}
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  {translations[language].upgradeVerification}
                </button>
              </div>
            )}
            {!kycData.status || kycData.status !== "verified" ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <p className="text-yellow-800">
                  {translations[language].completeKycFirst}
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  {translations[language].completeKycVerification}
                </button>
              </div>
            ) : null}
            {kycData.status === "verified" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {translations[language].amountLabel}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">
                    Virtual Card (Preview)
                  </h3>
                  <p>Card Number: {card?.cardNumber || "Generating..."}</p>
                  <p>CVV: {card?.cvv || "XXX"}</p>
                  <p>Expiry: {card?.expiryDate || "MM/YY"}</p>
                  <p>Stripe Token: {card?.stripe_issuing_id || "Pending"}</p>
                </div>
                <button
                  onClick={handleCardGenerate}
                  className="mt-4 w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  {translations[language].cardTitle}
                </button>
              </>
            )}
          </>
        )}
        {step === 3 && card && (
          <>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              {translations[language].paymentTitle}
            </h2>
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <h3 className="text-lg font-semibold mb-2">Card Details</h3>
              <p>Card Number: {card.cardNumber}</p>
              <p>CVV: {card.cvv}</p>
              <p>Expiry: {card.expiryDate}</p>
              <p>Amount: {formatCurrency(card.amount)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations[language].methodLabel}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="stripe">
                  {translations[language].methodLabel === "Auala Totogi *" ||
                  translations[language].methodLabel === "Njia ya Malipo *" ||
                  translations[language].methodLabel ===
                    "Paraan ng Pagbabayad *"
                    ? "Stripe (Fiat)"
                    : "Stripe (Fiat)"}
                </option>
                <option value="mobile">Mobile Money</option>
                <option value="cash">Cash (via Agent)</option>
                <option value="crypto">Crypto (Algorand)</option>
              </select>
            </div>
            <button
              onClick={handlePayment}
              className="mt-4 w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Lock className="mr-2 h-5 w-5" />
              {translations[language].paymentTitle}
            </button>
            {error.includes("failed") && (
              <p className="mt-2 text-sm text-gray-600">
                {translations[language].retryMessage}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CardGenerationPage;