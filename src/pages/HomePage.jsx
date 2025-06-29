import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Shield,
  PlayCircle,
  HelpCircle,
  CheckCircle,
  Globe,
  Smartphone,
  Lock,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import CardVisual from "../components/CardVisual";
import {
  generateCardNumber,
  generateCVV,
  generateExpiryDate,
} from "../utils/cardUtils";
import { LanguageContext } from "../context/LanguageContext";

const translations = {
  en: {
    hero: {
      title: "Secure Online Payments Without a Bank Account",
      subtitle:
        "Get a one-time secure virtual card for online payments — no bank account needed. Perfect for Samoa and beyond.",
      getCard: "Get Your Virtual Card",
      watchHow: "Watch How It Works",
    },
    features: {
      title: "How It Works",
      subtitle: "Simple, secure, and accessible for everyone",
      requestCard: {
        title: "Request a Card",
        description:
          "Fill in basic information and choose your card amount. No bank account or complicated paperwork needed.",
      },
      secureShop: {
        title: "Secure Online Shopping",
        description:
          "Use your virtual card details to shop online anywhere that accepts credit cards - securely and worry-free.",
      },
      getHelp: {
        title: "Get Help Anytime",
        description:
          "Our voice assistant and video tutorials help you through every step of the process in your language.",
      },
    },
    benefits: {
      title: "Why Choose Samoa Virtual Bankcard?",
      items: [
        {
          title: "No Bank Account Required",
          description:
            "Perfect for the unbanked population in Samoa and Pacific islands",
        },
        {
          title: "Instant Generation",
          description: "Get your virtual card in minutes, not days",
        },
        {
          title: "Multi-language Support",
          description: "Available in English, Samoan, Swahili, and Tagalog",
        },
        {
          title: "Secure Transactions",
          description: "Bank-level security for all your online purchases",
        },
      ],
    },
    testimonials: {
      title: "What People Are Saying",
      subtitle: "Join others who've simplified their online payments",
      items: [
        {
          name: "Tuala S.",
          location: "Apia, Samoa",
          text: "Finally I can shop online without needing a traditional bank account! This service changed everything for my family.",
          rating: 5,
        },
        {
          name: "Mele F.",
          location: "Suva, Fiji",
          text: "The process was so simple and the support in my language really helped. Got my card in just minutes!",
          rating: 5,
        },
        {
          name: "Junior T.",
          location: "Nuku'alofa, Tonga",
          text: "Perfect for online subscriptions and secure payments. I feel safe using this for all my online shopping.",
          rating: 5,
        },
      ],
    },
    cta: {
      title: "Ready to simplify online payments?",
      subtitle: "Get your secure virtual card in minutes",
      button: "Get Your Virtual Card",
    },
  },
  sm: {
    hero: {
      title: "Totogi Saogalemu i le Initaneti E Leai se Teugatupe",
      subtitle:
        "Maua sau debit card saogalemu mo totogi i le initaneti — e le manaomia se teugatupe. E talafeagai mo Samoa ma isi atunuu.",
      getCard: "Maua Lau Virtual Card",
      watchHow: "Matamata i le Auala e Fai ai",
    },
    features: {
      title: "Auala e Galue ai",
      subtitle: "Faigofie, saogalemu, ma avanoa i tagata uma",
      requestCard: {
        title: "Talosaga mo se Card",
        description:
          "Faatumu faamatalaga faigofie ma filifili lau aofai tupe. E le manaomia se teugatupe po o ni pepa faigatā.",
      },
      secureShop: {
        title: "Faatau Saogalemu i le Initaneti",
        description:
          "Faaaoga au faamatalaga card e faatau ai i soo se nofoaga e talia ai kata - saogalemu ma le popole.",
      },
      getHelp: {
        title: "Maua le Fesoasoani i Soo se Taimi",
        description:
          "O la matou fesoasoani leo ma vitio e fesoasoani ia te oe i vaega uma o le faagasologa i lau gagana.",
      },
    },
    benefits: {
      title: "Aisea e Filifili ai Samoa Virtual Bankcard?",
      items: [
        {
          title: "E Le Manaomia se Teugatupe",
          description:
            "E talafeagai mo tagata Samoa ma atumotu o le Pasefika e leai ni teugatupe",
        },
        {
          title: "Vave Ona Maua",
          description: "Maua lau virtual card i ni nai minute, ae le ni aso",
        },
        {
          title: "Fesoasoani i Gagana Eseese",
          description: "E maua i le Igilisi, Samoa, Swahili, ma Tagalog",
        },
        {
          title: "Totogi Saogalemu",
          description:
            "Saogalemu pei o teugatupe mo au faatau uma i le initaneti",
        },
      ],
    },
    testimonials: {
      title: "O le a le Tala a Tagata",
      subtitle:
        "Auai faatasi ma isi ua faafaigofie a latou totogi i le initaneti",
      items: [
        {
          name: "Tuala S.",
          location: "Apia, Samoa",
          text: "O le mea sili! Ua mafai nei ona ou faatau i le initaneti e aunoa ma se teugatupe masani!",
          rating: 5,
        },
        {
          name: "Mele F.",
          location: "Suva, Fiji",
          text: "Sa faigofie tele le faagasologa ma ua fesoasoani le gagana Samoa.",
          rating: 5,
        },
        {
          name: "Junior T.",
          location: "Nuku'alofa, Tonga",
          text: "E lelei mo totogi i le initaneti ma saogalemu.",
          rating: 5,
        },
      ],
    },
    cta: {
      title: "Ua e sauni e faafaigofie totogi i le initaneti?",
      subtitle: "Maua lau card peimeni i ni nai minute",
      button: "Maua Lau Card",
    },
  },
};

const HomePage = () => {
  const { language } = useContext(LanguageContext);
  const t = translations[language] || translations.en;
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const sampleCard = {
    id: "demo",
    cardNumber: generateCardNumber(),
    cvv: generateCVV(),
    expiryDate: generateExpiryDate(),
    holderName: "JOHN DOE",
    phoneNumber: "+685 7654321",
    amount: 100,
    status: "valid",
    createdAt: new Date(),
  };

  // Auto-rotate testimonials every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % t.testimonials.items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [t.testimonials.items.length]);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % t.testimonials.items.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial(
      (prev) => (prev - 1 + t.testimonials.items.length) % t.testimonials.items.length
    );
  };

  // Pacific Islander testimonial images from Unsplash
  const testimonialImages = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format&q=80", // Pacific Islander man
    "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face&auto=format&q=80", // Pacific Islander woman
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format&q=80", // Pacific Islander young man
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section
        className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 py-20 px-4 text-white relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(30, 58, 138, 0.85), rgba(55, 48, 163, 0.85)), url('https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-transparent" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              {t.hero.title}
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/generate"
                className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold py-4 px-8 rounded-lg inline-flex items-center justify-center transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                <CreditCard className="mr-3 h-6 w-6" />
                {t.hero.getCard}
              </Link>
              <Link
                to="/help"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-900 py-4 px-8 rounded-lg inline-flex items-center justify-center font-semibold transition-all duration-200"
              >
                <PlayCircle className="mr-3 h-6 w-6" />
                {t.hero.watchHow}
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="transform hover:scale-105 transition-transform duration-300">
              <CardVisual card={sampleCard} onCopy={() => {}} />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t.features.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                {t.features.requestCard.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.requestCard.description}
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                {t.features.secureShop.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.secureShop.description}
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <HelpCircle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                {t.features.getHelp.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.features.getHelp.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t.benefits.title}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.benefits.items.map((benefit, index) => {
              const icons = [Globe, Smartphone, Lock, CheckCircle];
              const Icon = icons[index];
              const colors = ["blue", "green", "purple", "yellow"];
              const color = colors[index];

              return (
                <div key={index} className="text-center">
                  <div
                    className={`w-16 h-16 bg-${color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon className={`h-8 w-8 text-${color}-600`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section with Pacific Islander Images */}
      <section 
        className="py-20 relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.9)), url('https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-blue-800/80" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              {t.testimonials.title}
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {t.testimonials.subtitle}
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={prevTestimonial}
                  className="p-3 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="h-6 w-6 text-blue-600" />
                </button>
                
                <div className="text-center flex-1 mx-8">
                  <div className="mb-6">
                    <img
                      src={testimonialImages[currentTestimonial]}
                      alt={t.testimonials.items[currentTestimonial].name}
                      className="w-20 h-20 rounded-full mx-auto object-cover shadow-lg ring-4 ring-blue-100"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.testimonials.items[currentTestimonial].name)}&background=3b82f6&color=fff&size=80`;
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-center mb-4">
                    {[...Array(t.testimonials.items[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  <blockquote className="text-xl text-gray-800 mb-6 italic leading-relaxed">
                    "{t.testimonials.items[currentTestimonial].text}"
                  </blockquote>
                  
                  <div>
                    <div className="font-semibold text-lg text-gray-900">
                      {t.testimonials.items[currentTestimonial].name}
                    </div>
                    <div className="text-blue-600 font-medium">
                      {t.testimonials.items[currentTestimonial].location}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={nextTestimonial}
                  className="p-3 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="h-6 w-6 text-blue-600" />
                </button>
              </div>
              
              {/* Testimonial indicators */}
              <div className="flex justify-center space-x-2">
                {t.testimonials.items.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                      index === currentTestimonial
                        ? "bg-blue-600"
                        : "bg-blue-200 hover:bg-blue-300"
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-4">{t.cta.title}</h2>
          <p className="text-xl text-blue-100 mb-8">{t.cta.subtitle}</p>
          <Link
            to="/generate"
            className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold py-4 px-8 rounded-lg inline-flex items-center justify-center text-lg transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <CreditCard className="mr-3 h-6 w-6" />
            {t.cta.button}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;