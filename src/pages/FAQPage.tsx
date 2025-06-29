import React from "react";
import { useNavigate } from "react-router-dom";

const faqItems = [
  {
    question: "What is the Samoa Virtual Bankcard?",
    answer:
      "It's a secure, KYC-enabled virtual payment card system for users without access to traditional banking.",
  },
  {
    question: "How do I generate a virtual card?",
    answer:
      "Click 'Generate' from the homepage after signing in. You’ll go through a secure KYC process.",
  },
  {
    question: "Is Stripe used for payments?",
    answer:
      "Yes, we use Stripe to securely handle all transactions and top-ups.",
  },
  {
    question: "Where can I get support or ask questions?",
    answer:
      "Use the 'Contact Us' page or click the Ask AI Assistant button below.",
  },
];

type FAQItem = {
  question: string;
  answer: string;
};

type FAQProps = {
  items: FAQItem[];
};

const FAQ: React.FC<FAQProps> = ({ items }) => (
  <div>
    {items.map((item, idx) => (
      <div key={idx} className="mb-4">
        <h2 className="font-semibold">{item.question}</h2>
        <p className="text-gray-700">{item.answer}</p>
      </div>
    ))}
  </div>
);

const FAQPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Frequently Asked Questions
      </h1>

      <FAQ items={faqItems} />

      <div className="mt-10 text-center">
        <button
          onClick={() => navigate("/help")}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 shadow"
        >
          Ask the AI Assistant
        </button>
      </div>
    </section>
  );
};

export default FAQPage;
