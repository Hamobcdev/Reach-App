import React from "react";
import { Copy } from "lucide-react";
import { formatCardNumber, getTimeRemaining } from "../utils/cardUtils";

const CardVisual = ({ card, showFullDetails = false, onCopy }) => {
  const statusColors = {
    valid: "bg-green-100 text-green-800",
    expired: "bg-red-100 text-red-800",
    used: "bg-gray-100 text-gray-800",
  };

  const timeRemaining =
    card.status === "valid" ? getTimeRemaining(card.createdAt) : null;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-800/20 rounded-xl transform rotate-1 scale-105 blur-md"></div>
      <div className="relative bg-gradient-to-br from-blue-800 to-blue-900 rounded-xl shadow-lg p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>

        <div className="flex justify-between items-center mb-8">
          <div className="text-white font-bold text-lg">Samoa Virtual Bank</div>
          <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center">
            <span className="text-blue-900 font-bold text-xs">SVB</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="text-xs text-blue-200 font-medium">Card Number</div>
            {onCopy && (
              <button
                onClick={() => onCopy("Card Number", card.cardNumber)}
                className="text-white opacity-70 hover:opacity-100 transition-opacity"
              >
                <Copy size={14} />
              </button>
            )}
          </div>
          <div className="text-white text-lg font-mono tracking-wider mt-1">
            {showFullDetails
              ? card.cardNumber
              : formatCardNumber(card.cardNumber, true)}
          </div>
        </div>

        <div className="flex justify-between mb-6">
          <div>
            <div className="text-xs text-blue-200 font-medium">Expiry</div>
            <div className="text-white">{card.expiryDate}</div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-blue-200 font-medium">CVV</div>
              {onCopy && showFullDetails && (
                <button
                  onClick={() => onCopy("CVV", card.cvv)}
                  className="text-white opacity-70 hover:opacity-100 transition-opacity ml-2"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
            <div className="text-white">
              {showFullDetails ? card.cvv : "•••"}
            </div>
          </div>
          <div>
            <div className="text-xs text-blue-200 font-medium">Amount</div>
            <div className="text-white">${card.amount.toFixed(2)}</div>
          </div>
        </div>

        <div className="mb-2">
          <div className="text-xs text-blue-200 font-medium">Card Holder</div>
          <div className="text-white font-medium">{card.holderName}</div>
        </div>

        <div className="flex justify-between items-center">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              statusColors[card.status]
            }`}
          >
            {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
          </span>

          {timeRemaining && (
            <span className="text-xs text-white bg-black/30 px-2 py-1 rounded-full">
              Expires in: {timeRemaining.minutes}m {timeRemaining.seconds}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardVisual;
