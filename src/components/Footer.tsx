import { NavLink } from "react-router-dom";
import { Zap } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-10 mt-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Left */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Samoa Virtual Bankcard</h3>
          <p className="text-sm text-gray-400">
            Secure virtual cards for everyone — no bank account needed.
          </p>

          <div className="mt-5 flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg shadow-md border border-yellow-400">
            <Zap className="h-6 w-6 text-yellow-400 animate-pulse" />
            <span className="text-sm font-semibold text-yellow-300">
              Built with Bolt.new
            </span>
          </div>
        </div>

        {/* Center */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Useful Links</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <NavLink to="/terms" className="text-gray-400 hover:text-white">
                Terms of Service
              </NavLink>
            </li>
            <li>
              <NavLink to="/privacy" className="text-gray-400 hover:text-white">
                Privacy Policy
              </NavLink>
            </li>
            <li>
              <NavLink to="/faq" className="text-gray-400 hover:text-white">
                FAQ
              </NavLink>
            </li>
            <li>
              <NavLink to="/help" className="text-gray-400 hover:text-white">
                Contact Us
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Right */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Connect</h3>
          <p className="text-sm text-gray-400 mb-4">
            Follow us on social media
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-gray-400 hover:text-white">
              <span className="sr-only">Twitter</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Samoa Virtual Bankcard. All rights
        reserved.
      </div>
    </footer>
  );
};

export default Footer;
