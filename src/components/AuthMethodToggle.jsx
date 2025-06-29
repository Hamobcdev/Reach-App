import React from 'react';
import { Mail, Key, Chrome } from 'lucide-react';

const AuthMethodToggle = ({ currentMethod, onMethodChange, isSignUp = false }) => {
  const methods = [
    {
      id: 'password',
      name: 'Email & Password',
      icon: Key,
      description: isSignUp ? 'Create account with password' : 'Sign in with your password'
    },
    {
      id: 'magic-link',
      name: 'Magic Link',
      icon: Mail,
      description: 'Get a secure link sent to your email'
    },
    {
      id: 'google',
      name: 'Google',
      icon: Chrome,
      description: 'Continue with your Google account'
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 text-center">
        Choose your {isSignUp ? 'signup' : 'login'} method
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {methods.map((method) => {
          const Icon = method.icon;
          return (
            <button
              key={method.id}
              onClick={() => onMethodChange(method.id)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                currentMethod === method.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <Icon className={`h-5 w-5 mr-3 ${
                  currentMethod === method.id ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <div>
                  <div className="font-medium">{method.name}</div>
                  <div className="text-xs text-gray-500">{method.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AuthMethodToggle;