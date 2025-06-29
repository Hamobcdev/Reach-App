import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle, MessageCircle, CreditCard } from "lucide-react";
import VideoTutorial from "../components/VideoTutorial";
import FAQ from "../pages/FAQPage";
import VoiceAssistant from "../components/VoiceAssistant";

const HelpPage: React.FC = () => {
  const faqItems = [
    {
      question: "What is a virtual card?",
      answer:
        "A virtual card is a digital payment card that works just like a physical credit card but exists only online. It provides the same card number, expiration date, and security code needed for online purchases, but without requiring a plastic card or bank account.",
    },
    {
      question: "How do I get a virtual card?",
      answer:
        'Click on "Get Your Virtual Card" and fill in the required information. Once submitted, your virtual card will be generated instantly with a unique card number, expiry date, and CVV code.',
    },
    {
      question: "Is my virtual card secure?",
      answer:
        "Yes! Your virtual card is designed with security in mind. It can only be used once and expires after 10 minutes if not used, limiting the risk of fraud. All your data is encrypted and protected.",
    },
    {
      question: "How long is my virtual card valid?",
      answer:
        "For security reasons, your virtual card is valid for 10 minutes from the time of creation. If not used within that time, it will automatically expire to protect against unauthorized use.",
    },
    {
      question: "Can I use my virtual card for recurring payments?",
      answer:
        'No, the virtual cards are designed for one-time use only. Each card can only be used for a single transaction and will be marked as "used" afterward.',
    },
    {
      question: "What information do I need to provide?",
      answer:
        "We require your name and phone number for basic identity verification. This helps prevent fraud and ensures the service is used appropriately.",
    },
    {
      question: "What if my payment is declined?",
      answer:
        "If your payment is declined, check that you entered the card details correctly. Some merchants may have restrictions on virtual cards or specific regions. If problems persist, you can generate a new card and try again.",
    },
    {
      question: "Is there a fee for using this service?",
      answer:
        "For the MVP version, we're offering this service without fees. In the future, a small convenience fee may be added to sustain the service.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
        <p className="mt-2 text-lg text-gray-600">
          Learn how to use your virtual card and get answers to common questions
        </p>
      </div>

      {/* Video Tutorials Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Video Tutorials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <VideoTutorial
            title="How to Get Your Virtual Card"
            description="A step-by-step guide to requesting and using your Samoa Virtual BankCard."
            placeholderSrc="https://images.pexels.com/photos/8867433/pexels-photo-8867433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          />
          <VideoTutorial
            title="Using Your Card for Online Shopping"
            description="Learn how to use your virtual card details at online checkout."
            placeholderSrc="https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          />
        </div>
      </section>

      {/* Voice Assistant Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Voice Assistant
        </h2>
        <p className="text-gray-600 mb-4">
          Ask our voice assistant any questions about using your virtual card.
          Type your question or click the microphone to speak.
        </p>
        <VoiceAssistant />
      </section>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Frequently Asked Questions
        </h2>
        <FAQ items={faqItems} />
      </section>

      {/* Contact Support */}
      <section className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Still Need Help?
        </h2>
        <p className="text-gray-600 mb-6">
          Our support team is here to help you with any questions or issues you
          might have.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="flex items-center">
              <MessageCircle className="h-6 w-6 text-blue-500 mr-2" />
              <h3 className="font-medium text-gray-900">Chat Support</h3>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Chat with our support team via WhatsApp for immediate assistance.
            </p>
            <a
              href="#"
              className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Open WhatsApp Chat
            </a>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="flex items-center">
              <HelpCircle className="h-6 w-6 text-blue-500 mr-2" />
              <h3 className="font-medium text-gray-900">Email Support</h3>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Send us an email and we'll respond within 24 hours.
            </p>
            <a
              href="mailto:support@samoavirtualcard.com"
              className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              support@samoavirtualcard.com
            </a>
          </div>
        </div>
      </section>

      {/* Ready to get started CTA */}
      <div className="text-center mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to Get Started?
        </h2>
        <Link
          to="/generate"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Get Your Virtual Card
        </Link>
      </div>
    </div>
  );
};

export default HelpPage;
