import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, ArrowLeft, AlertCircle } from "lucide-react";
import CardVisual from "../components/CardVisual";

const CardDisplayPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    // Load card from localStorage for demo purposes
    try {
      const existingCards = JSON.parse(
        localStorage.getItem("virtualCards") || "[]"
      );
      const foundCard = existingCards.find((c) => c.id === id);

      if (foundCard) {
        // Convert string date back to Date object
        foundCard.createdAt = new Date(foundCard.createdAt);
        setCard(foundCard);
      } else {
        setError("Card not found. It may have expired or been deleted.");
      }
    } catch (err) {
      setError("An error occurred while loading the card details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Update timer if card is valid
    if (card && card.status === "valid") {
      const timer = setInterval(() => {
        const now = new Date();
        const expiryTime = new Date(card.createdAt.getTime() + 10 * 60 * 1000); // 10 minutes

        const timeDiff = expiryTime.getTime() - now.getTime();

        if (timeDiff <= 0) {
          // Card expired
          clearInterval(timer);
          handleStatusChange("expired");
          setTimeRemaining(null);
        } else {
          const minutes = Math.floor(timeDiff / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
          setTimeRemaining({ minutes, seconds });
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [card]);

  const handleStatusChange = (newStatus) => {
    if (!card) return;

    try {
      // Update localStorage for demo purposes
      const existingCards = JSON.parse(
        localStorage.getItem("virtualCards") || "[]"
      );
      const updatedCards = existingCards.map((c) =>
        c.id === card.id ? { ...c, status: newStatus } : c
      );

      localStorage.setItem("virtualCards", JSON.stringify(updatedCards));

      // Update state
      setCard({ ...card, status: newStatus });
    } catch (err) {
      setError("An error occurred while updating the card status.");
    }
  };

  const handleCopyCardInfo = (field, value) => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        alert(`${field} copied to clipboard!`);
      })
      .catch(() => {
        alert("Failed to copy to clipboard");
      });
  };

  const handleGoBack = () => {
    navigate("/generate");
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-32 w-56 bg-gray-200 rounded-md"></div>
          <div className="h-4 w-24 bg-gray-200 rounded mt-4"></div>
          <div className="h-10 w-32 bg-gray-200 rounded mt-4"></div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700">{error || "Card not found"}</p>
              <button
                onClick={handleGoBack}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Generate New Card
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusMessages = {
    valid: {
      title: "Valid for Use",
      description: "This card is active and ready to use for online payments.",
      color: "text-green-800",
      bgColor: "bg-green-50",
    },
    expired: {
      title: "Card Expired",
      description: "This card has expired and can no longer be used.",
      color: "text-red-800",
      bgColor: "bg-red-50",
    },
    used: {
      title: "Card Used",
      description: "This card has been used and cannot be used again.",
      color: "text-gray-800",
      bgColor: "bg-gray-50",
    },
  };

  const currentStatus = statusMessages[card.status];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <button
        onClick={handleGoBack}
        className="mb-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Card Generation
      </button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Virtual Card</h1>
        <p className="mt-2 text-lg text-gray-600">
          Use these details for your online purchase
        </p>
      </div>

      <div className="mb-8">
        <CardVisual card={card} showFullDetails onCopy={handleCopyCardInfo} />
      </div>

      <div className={`p-4 rounded-md ${currentStatus.bgColor} mb-6`}>
        <div className="flex">
          {card.status === "valid" ? (
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100">
                <Check className="h-5 w-5 text-green-600" />
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100">
                <AlertCircle className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          )}

          <div className="ml-3">
            <h3 className={`text-sm font-medium ${currentStatus.color}`}>
              {currentStatus.title}
            </h3>
            <div className="mt-2 text-sm text-gray-600">
              <p>{currentStatus.description}</p>

              {card.status === "valid" && timeRemaining && (
                <p className="mt-1 font-medium">
                  Time remaining: {timeRemaining.minutes}m{" "}
                  {timeRemaining.seconds}s
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {card.status === "valid" && (
        <div className="flex justify-center">
          <button
            onClick={() => handleStatusChange("used")}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Check className="mr-2 h-4 w-4" />
            Mark as Used
          </button>
        </div>
      )}

      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-800">
          How to Use This Card
        </h3>
        <ol className="mt-4 space-y-4 text-sm text-blue-700">
          <li className="flex items-start">
            <span className="flex-shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full bg-blue-200 text-blue-600 mr-2">
              1
            </span>
            <span>
              Copy the card number, expiry date, and CVV using the copy buttons.
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full bg-blue-200 text-blue-600 mr-2">
              2
            </span>
            <span>
              Paste the details into the payment form during checkout just like
              a regular credit card.
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full bg-blue-200 text-blue-600 mr-2">
              3
            </span>
            <span>
              After successful payment, click "Mark as Used" to prevent further
              use.
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full bg-blue-200 text-blue-600 mr-2">
              4
            </span>
            <span>
              Remember that this card will automatically expire in 10 minutes if
              not used.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default CardDisplayPage;
