import React, { useState, useEffect } from 'react';
import { Shield, Phone, Key, Eye, EyeOff, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dbHelpers, securityUtils } from '../lib/supabase';

const SecuritySettings = () => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  
  // MFA state
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQRCode, setMfaQRCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  
  // Security events
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [userSessions, setUserSessions] = useState([]);

  useEffect(() => {
    if (user) {
      loadSecurityData();
    }
  }, [user]);

  const loadSecurityData = async () => {
    try {
      const [eventsResult, attemptsResult, sessionsResult] = await Promise.all([
        dbHelpers.getSecurityEvents(user.id, 10),
        dbHelpers.getLoginAttempts(user.id, 5),
        dbHelpers.getUserSessions(user.id)
      ]);

      if (eventsResult.data) setSecurityEvents(eventsResult.data);
      if (attemptsResult.data) setLoginAttempts(attemptsResult.data);
      if (sessionsResult.data) setUserSessions(sessionsResult.data);
    } catch (err) {
      console.error('Error loading security data:', err);
    }
  };

  const handlePhoneVerification = async () => {
    if (!securityUtils.validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const ipAddress = await securityUtils.getIPAddress();
      const userAgent = navigator.userAgent;

      const result = await dbHelpers.sendPhoneVerification(
        user.id,
        securityUtils.formatPhoneNumber(phoneNumber),
        ipAddress,
        userAgent
      );

      if (result.error) {
        setError(result.error.message);
      } else {
        setShowPhoneVerification(true);
        setSuccess('Verification code sent to your phone');
      }
    } catch (err) {
      setError('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setLoading(true);
    setError('');

    try {
      const ipAddress = await securityUtils.getIPAddress();
      const userAgent = navigator.userAgent;

      const result = await dbHelpers.verifyPhoneCode(
        user.id,
        securityUtils.formatPhoneNumber(phoneNumber),
        verificationCode,
        ipAddress,
        userAgent
      );

      if (result.data) {
        setSuccess('Phone number verified successfully!');
        setShowPhoneVerification(false);
        setVerificationCode('');
        // Refresh user profile
        window.location.reload();
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupMFA = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await dbHelpers.setupTOTP(user.id);
      
      if (result.error) {
        setError(result.error.message);
      } else {
        setMfaSecret(result.data.secret);
        setBackupCodes(result.data.backupCodes);
        setShowMFASetup(true);
        
        // Generate QR code URL for authenticator apps
        const qrCodeUrl = `otpauth://totp/VirtualCard%20Samoa:${user.email}?secret=${result.data.secret}&issuer=VirtualCard%20Samoa`;
        setMfaQRCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`);
      }
    } catch (err) {
      setError('Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await dbHelpers.verifyTOTP(user.id, mfaCode);
      
      if (result.error) {
        setError('Invalid MFA code');
      } else {
        setSuccess('MFA enabled successfully!');
        setShowMFASetup(false);
        setMfaCode('');
        // Refresh user profile
        window.location.reload();
      }
    } catch (err) {
      setError('MFA verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await dbHelpers.revokeSession(sessionId);
      setSuccess('Session revoked successfully');
      loadSecurityData();
    } catch (err) {
      setError('Failed to revoke session');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <Shield className="h-6 w-6 mr-2 text-blue-600" />
          Security Settings
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Phone Verification Section */}
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Phone Verification
          </h2>
          
          {userProfile?.phone_verified ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Phone number verified: {userProfile.phone_number}
            </div>
          ) : (
            <div className="space-y-4">
              {!showPhoneVerification ? (
                <div className="flex items-center space-x-4">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+685 123 4567"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handlePhoneVerification}
                    disabled={loading || !phoneNumber}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Code'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleVerifyPhone}
                    disabled={loading || verificationCode.length !== 6}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MFA Section */}
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Two-Factor Authentication (MFA)
          </h2>
          
          {userProfile?.mfa_enabled ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              MFA is enabled and active
            </div>
          ) : (
            <div className="space-y-4">
              {!showMFASetup ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Add an extra layer of security to your account with two-factor authentication.
                  </p>
                  <button
                    onClick={handleSetupMFA}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Setup MFA'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="mb-4">Scan this QR code with your authenticator app:</p>
                    <img src={mfaQRCode} alt="MFA QR Code" className="mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-4">
                      Or enter this secret manually: <code className="bg-gray-100 px-2 py-1 rounded">{mfaSecret}</code>
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="Enter code from authenticator"
                      maxLength={6}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleVerifyMFA}
                      disabled={loading || mfaCode.length !== 6}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>

                  {backupCodes.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <h3 className="font-semibold mb-2">Backup Codes</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                        {backupCodes.map((code, index) => (
                          <div key={index} className="bg-white p-2 rounded border">
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Sessions */}
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Smartphone className="h-5 w-5 mr-2" />
            Active Sessions
          </h2>
          
          {userSessions.length > 0 ? (
            <div className="space-y-3">
              {userSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium">{session.device_info?.platform || 'Unknown Device'}</div>
                    <div className="text-sm text-gray-600">
                      {session.ip_address} • Last seen: {new Date(session.last_seen).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No active sessions found.</p>
          )}
        </div>

        {/* Recent Security Events */}
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Recent Security Events</h2>
          
          {securityEvents.length > 0 ? (
            <div className="space-y-2">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-2 text-sm">
                  <div>
                    <span className="font-medium">{event.event_type.replace('_', ' ')}</span>
                    {event.success ? (
                      <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />
                    ) : (
                      <AlertCircle className="inline h-4 w-4 ml-2 text-red-600" />
                    )}
                  </div>
                  <div className="text-gray-600">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No recent security events.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;