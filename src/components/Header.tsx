import React, { useContext, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut, Bot, User, Smartphone, Wallet } from "lucide-react";
import { LanguageContext, type Language } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { language, setLanguage } = useContext(LanguageContext);
  const { user, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  interface ToggleLanguageFn {
    (lang: Language): void;
  }

  const toggleLanguage: ToggleLanguageFn = (lang) => {
    setLanguage(lang);
    setMobileMenuOpen(false);
  };

  interface HandleNavigateFn {
    (path: string): void;
  }

  const handleNavigate: HandleNavigateFn = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const translations = {
    en: {
      home: "Home",
      mobileMoney: "Mobile Money",
      guide: "Guide & AI",
      login: "Login",
      logout: "Logout",
      profile: "Profile",
      algorand: "Algorand",
    },
    sm: {
      home: "Itūlā",
      mobileMoney: "Tupe Telefoni",
      guide: "Taiala & AI",
      login: "Ulufale",
      logout: "Alu ese",
      profile: "Fa'amatalaga",
      algorand: "Algorand",
    },
    sw: {
      home: "Nyumbani",
      mobileMoney: "Pesa za Simu",
      guide: "Mwongozo & AI",
      login: "Ingia",
      logout: "Toka",
      profile: "Wasifu",
      algorand: "Algorand",
    },
    tl: {
      home: "Bahay",
      mobileMoney: "Mobile Money",
      guide: "Gabay & AI",
      login: "Mag-login",
      logout: "Mag-logout",
      profile: "Profile",
      algorand: "Algorand",
    },
  };

  const t = translations[language] || translations.en;

  const renderAuthSection = () => {
    if (loading) {
      return (
        <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
      );
    }

    if (user) {
      return (
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 hidden md:block">
            {user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-700 transition-colors font-medium flex items-center bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t.logout}
          </button>
        </div>
      );
    }

    return (
      <NavLink
        to="/login"
        className="text-blue-600 hover:text-blue-700 transition-colors font-medium flex items-center bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg"
      >
        <LogIn className="w-4 h-4 mr-2" />
        {t.login}
      </NavLink>
    );
  };

  const renderMobileAuthSection = () => {
    if (loading) {
      return (
        <div className="animate-pulse bg-gray-200 h-8 w-full rounded"></div>
      );
    }

    if (user) {
      return (
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2">
            {user.email}
          </div>
          <button
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-700 py-2 flex items-center w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t.logout}
          </button>
        </div>
      );
    }

    return (
      <div className="pt-4 border-t border-gray-200">
        <NavLink 
          to="/login" 
          onClick={() => handleNavigate("/login")}
          className="text-blue-600 hover:underline py-2 flex items-center"
        >
          <LogIn className="w-4 h-4 mr-2" />
          {t.login}
        </NavLink>
      </div>
    );
  };

  const renderMobileMenu = () => (
    <div className="absolute top-0 right-0 bg-white w-64 h-screen shadow-lg z-50 p-6">
      <button
        onClick={() => setMobileMenuOpen(false)}
        className="absolute top-4 right-4"
      >
        <X className="h-6 w-6 text-gray-700" />
      </button>
      <nav className="mt-12 flex flex-col space-y-4">
        <NavLink 
          to="/" 
          onClick={() => handleNavigate("/")}
          className="text-gray-700 hover:text-blue-600 py-2"
        >
          {t.home}
        </NavLink>
        
        {user && (
          <NavLink
            to="/mobile-money"
            onClick={() => handleNavigate("/mobile-money")}
            className="text-gray-700 hover:text-blue-600 py-2 flex items-center"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            {t.mobileMoney}
          </NavLink>
        )}
        
        {user && (
          <NavLink
            to="/algorand"
            onClick={() => handleNavigate("/algorand")}
            className="text-gray-700 hover:text-blue-600 py-2 flex items-center"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {t.algorand}
          </NavLink>
        )}
        
        <NavLink
          to="/help"
          onClick={() => handleNavigate("/help")}
          className="text-gray-700 hover:text-blue-600 py-2 flex items-center"
        >
          <Bot className="w-4 h-4 mr-2" />
          {t.guide}
        </NavLink>
        
        {renderMobileAuthSection()}
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => toggleLanguage(e.target.value as Language)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="sm">Samoan</option>
            <option value="sw">Swahili</option>
            <option value="tl">Tagalog</option>
          </select>
        </div>
      </nav>
    </div>
  );

  return (
    <header className="bg-white shadow-md py-4 px-6 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-blue-700 hover:text-blue-800 transition-colors">
          Reach your Card
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8 items-center">
          <NavLink 
            to="/" 
            className={({ isActive }) =>
              `text-gray-700 hover:text-blue-600 transition-colors font-medium ${
                isActive ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : ''
              }`
            }
          >
            {t.home}
          </NavLink>
          
          {user && (
            <NavLink
              to="/mobile-money"
              className={({ isActive }) =>
                `text-gray-700 hover:text-blue-600 transition-colors font-medium flex items-center ${
                  isActive ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : ''
                }`
              }
            >
              <Smartphone className="w-4 h-4 mr-2" />
              {t.mobileMoney}
            </NavLink>
          )}
          
          {user && (
            <NavLink
              to="/algorand"
              className={({ isActive }) =>
                `text-gray-700 hover:text-blue-600 transition-colors font-medium flex items-center ${
                  isActive ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : ''
                }`
              }
            >
              <Wallet className="w-4 h-4 mr-2" />
              {t.algorand}
            </NavLink>
          )}
          
          <NavLink
            to="/help"
            className={({ isActive }) =>
              `text-gray-700 hover:text-blue-600 transition-colors font-medium flex items-center ${
                isActive ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : ''
              }`
            }
          >
            <Bot className="w-4 h-4 mr-2" />
            {t.guide}
          </NavLink>
          
          {renderAuthSection()}
          
          <select
            value={language}
            onChange={(e) => toggleLanguage(e.target.value as Language)}
            className="ml-4 border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="en">EN</option>
            <option value="sm">SM</option>
            <option value="sw">SW</option>
            <option value="tl">TL</option>
          </select>
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(true)} 
          className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && renderMobileMenu()}
    </header>
  );
};

export default Header;