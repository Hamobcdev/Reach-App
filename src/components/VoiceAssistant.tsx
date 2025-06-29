import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Send } from 'lucide-react';

const VoiceAssistant: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([
    { text: 'Hello! I\'m your virtual assistant. How can I help you with your Samoa Virtual BankCard?', isUser: false }
  ]);
  
  const toggleListening = () => {
    setIsListening(!isListening);
    
    if (!isListening) {
      // Simulate recording for demo purposes
      setTimeout(() => {
        setIsListening(false);
        handleAssistantResponse('What is a virtual card?');
      }, 3000);
    }
  };
  
  const handleSendMessage = () => {
    if (inputText.trim() === '') return;
    
    const newMessage = { text: inputText, isUser: true };
    setMessages([...messages, newMessage]);
    setInputText('');
    
    handleAssistantResponse(inputText);
  };
  
  const handleAssistantResponse = (query: string) => {
    // Simulate AI response based on common questions
    let response = '';
    
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('what is') && lowerQuery.includes('virtual card')) {
      response = 'A virtual card is a digital payment card that works like a physical credit card but exists only online. It provides a secure way to make online purchases without needing a bank account.';
    } else if (lowerQuery.includes('how') && lowerQuery.includes('use')) {
      response = 'To use your virtual card, simply copy the card number, expiration date, and CVV to the payment form when checking out online, just like you would with a physical card.';
    } else if (lowerQuery.includes('expire') || lowerQuery.includes('expiry')) {
      response = 'For security reasons, your virtual card expires 10 minutes after creation if not used. This helps protect against fraud.';
    } else if (lowerQuery.includes('secure') || lowerQuery.includes('security')) {
      response = 'Your virtual card is secure because it can only be used once and expires quickly. We also encrypt all your data and use industry-standard security protocols.';
    } else {
      response = 'I\'m sorry, I don\'t have information about that. Please try asking about how to use your virtual card, card security, or expiration details.';
    }
    
    setTimeout(() => {
      setMessages(prevMessages => [...prevMessages, { text: response, isUser: false }]);
    }, 1000);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[400px]">
      <div className="bg-blue-600 p-4 text-white">
        <div className="flex items-center">
          <Volume2 className="h-6 w-6 mr-2" />
          <h3 className="text-lg font-medium">Voice Assistant</h3>
        </div>
        <p className="text-sm text-blue-100 mt-1">Ask me anything about your virtual card</p>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          
          {isListening && (
            <div className="flex justify-center">
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center animate-pulse">
                <Mic className="h-4 w-4 mr-1" />
                Listening...
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <button
            onClick={toggleListening}
            className={`${
              isListening ? 'bg-red-500' : 'bg-blue-500'
            } text-white p-2 rounded-full mr-2 hover:opacity-90 transition-opacity`}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            onClick={handleSendMessage}
            disabled={inputText.trim() === ''}
            className="ml-2 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors disabled:bg-blue-300"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;