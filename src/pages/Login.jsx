import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  PlayCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Mail,
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthMethodToggle from "../components/AuthMethodToggle";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState('password'); // 'password', 'magic-link', 'google'
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    signIn, 
    signUp, 
    signInWithGoogle, 
    signInWithMagicLink,
    loading: authLoading 
  } = useAuth();

  // Check if user is already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const from = location.state?.from?.pathname || "/generate";
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  // Password validation
  useEffect(() => {
    if (password && isSignUp) {
      setPasswordValidation({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      });
    }
  }, [password, isSignUp]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password === confirmPassword;

  const handleEmailPasswordAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate password requirements
        if (!isPasswordValid) {
          setError("Please ensure your password meets all requirements");
          return;
        }

        if (!passwordsMatch) {
          setError("Passwords do not match");
          return;
        }

        const result = await signUp(email, password);
        
        if (result.error) {
          setError(result.error.message || "Sign up failed");
        } else if (result.message) {
          setError("");
          setMagicLinkSent(true);
        } else {
          // Sign up successful and user is confirmed
          const from = location.state?.from?.pathname || "/generate";
          navigate(from, { replace: true });
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error.message || "Invalid email or password");
        } else {
          const from = location.state?.from?.pathname || "/generate";
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signInWithMagicLink(email);
      if (result.error) {
        setError(result.error.message || "Failed to send magic link");
      } else {
        setMagicLinkSent(true);
        setError("");
      }
    } catch (err) {
      setError("Failed to send magic link. Please try again.");
      console.error("Magic link error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError("Google authentication failed. Please try again.");
      }
      // Note: For OAuth, the redirect happens automatically
      // The user will be redirected back to the app after authentication
    } catch (err) {
      setError("Google authentication failed. Please try again.");
      console.error("Google auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setMagicLinkSent(false);
  };

  const handleMethodChange = (method) => {
    setAuthMethod(method);
    resetForm();
  };

  const handleModeToggle = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  const renderPasswordValidation = () => (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-gray-600 mb-2">Password requirements:</p>
      <div className="grid grid-cols-1 gap-1 text-xs">
        {[
          { key: 'length', label: 'At least 8 characters' },
          { key: 'uppercase', label: 'One uppercase letter' },
          { key: 'lowercase', label: 'One lowercase letter' },
          { key: 'number', label: 'One number' },
          { key: 'special', label: 'One special character' }
        ].map(({ key, label }) => (
          <div key={key} className={`flex items-center ${
            passwordValidation[key] ? 'text-green-600' : 'text-gray-400'
          }`}>
            {passwordValidation[key] ? 
              <CheckCircle size={12} className="mr-1" /> : 
              <XCircle size={12} className="mr-1" />
            }
            {label}
          </div>
        ))}
      </div>
    </div>
  );

  const renderMagicLinkSuccess = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
        <Mail className="h-8 w-8 text-blue-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
        <p className="text-gray-600 mt-2">
          We've sent a secure login link to <strong>{email}</strong>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Click the link in your email to complete the {isSignUp ? 'signup' : 'login'} process.
        </p>
      </div>
      <div className="space-y-2">
        <button
          onClick={() => setMagicLinkSent(false)}
          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
        >
          ← Back to login
        </button>
        <div>
          <button
            onClick={authMethod === 'magic-link' ? handleMagicLinkAuth : handleEmailPasswordAuth}
            disabled={loading}
            className="text-blue-600 hover:text-blue-500 text-sm"
          >
            Resend email
          </button>
        </div>
      </div>
    </div>
  );

  const renderPasswordForm = () => (
    <form onSubmit={handleEmailPasswordAuth} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="mt-1 relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
            minLength={isSignUp ? 8 : undefined}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
        {isSignUp && password && renderPasswordValidation()}
      </div>

      {isSignUp && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="mt-1 relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`appearance-none block w-full px-3 py-2 pr-10 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || (isSignUp && (!isPasswordValid || !passwordsMatch))}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            {isSignUp ? "Creating account..." : "Signing in..."}
          </>
        ) : (
          isSignUp ? "Create account" : "Sign in"
        )}
      </button>
    </form>
  );

  const renderMagicLinkForm = () => (
    <form onSubmit={handleMagicLinkAuth} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email"
        />
      </div>

      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex">
          <Mail className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">How Magic Link works:</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>We'll send a secure link to your email</li>
              <li>Click the link to instantly sign in</li>
              <li>No password required</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Sending magic link...
          </>
        ) : (
          <>
            <Mail className="h-4 w-4 mr-2" />
            Send magic link
          </>
        )}
      </button>
    </form>
  );

  const renderGoogleAuth = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex">
          <Shield className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-medium">Google Authentication:</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>Secure OAuth 2.0 authentication</li>
              <li>No password needed</li>
              <li>Uses your existing Google account</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={handleGoogleAuth}
        disabled={loading}
        className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Connecting to Google...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </>
        )}
      </button>
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isSignUp ? "Create your account" : "Sign in to your account"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isSignUp 
            ? "Join VirtualCard Samoa today" 
            : "Access your virtual card dashboard"
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Security Notice */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 flex items-center text-blue-900">
              <Shield className="h-5 w-5 mr-2" />
              Multiple Login Options
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Choose the authentication method that works best for you. All methods are secure and encrypted.
            </p>
            <a
              href="https://www.youtube.com/watch?v=Q1qWlepb2tQ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-500 flex items-center text-sm font-medium"
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              Watch Security Demo
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {magicLinkSent ? (
            renderMagicLinkSuccess()
          ) : (
            <>
              {/* Auth Method Toggle */}
              <div className="mb-6">
                <AuthMethodToggle 
                  currentMethod={authMethod}
                  onMethodChange={handleMethodChange}
                  isSignUp={isSignUp}
                />
              </div>

              {/* Render appropriate form based on selected method */}
              {authMethod === 'password' && renderPasswordForm()}
              {authMethod === 'magic-link' && renderMagicLinkForm()}
              {authMethod === 'google' && renderGoogleAuth()}

              {/* Mode Toggle */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      {isSignUp ? "Already have an account?" : "New user?"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={handleModeToggle}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    {isSignUp 
                      ? "Sign in to existing account →" 
                      : "Create new account →"
                    }
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Security Features */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">🔒 Your security is our priority</p>
              <div className="flex justify-center space-x-4 text-xs text-gray-400">
                <span>• End-to-end encryption</span>
                <span>• OAuth 2.0</span>
                <span>• Magic links</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;