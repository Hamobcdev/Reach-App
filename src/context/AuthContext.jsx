import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, authHelpers, dbHelpers } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { session, error } = await authHelpers.getCurrentSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          // If user exists, fetch their profile
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // User signed in, fetch their profile
          await fetchUserProfile(session.user.id);
        } else {
          // User signed out, clear profile
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await dbHelpers.getUserProfile(userId);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      const { data, error } = await authHelpers.signUp(email, password, userData);
      
      if (error) throw error;
      
      // If signup successful and user is confirmed, create profile
      if (data.user && !data.user.email_confirmed_at) {
        // Email confirmation required
        return { 
          data, 
          error: null, 
          message: 'Please check your email for confirmation link' 
        };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await authHelpers.signIn(email, password);
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { data, error } = await authHelpers.signInWithGoogle();
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithMagicLink = async (email) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/generate`
        }
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error sending magic link:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await authHelpers.signOut();
      
      if (error) throw error;
      
      // Clear local state
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      // Update auth profile
      const { data: authData, error: authError } = await authHelpers.updateProfile(updates);
      
      if (authError) throw authError;
      
      // Update database profile
      const { data: dbData, error: dbError } = await dbHelpers.upsertUserProfile(
        user.id, 
        updates
      );
      
      if (dbError) throw dbError;
      
      // Update local state
      setUserProfile(dbData?.[0] || null);
      
      return { data: { auth: authData, profile: dbData }, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { data, error } = await authHelpers.resetPassword(email);
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { data: null, error };
    }
  };

  // Phone verification methods
  const sendPhoneOTP = async (phoneNumber) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error sending phone OTP:', error);
      return { data: null, error };
    }
  };

  const verifyPhone = async (phoneNumber, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token,
        type: 'sms'
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error verifying phone:', error);
      return { data: null, error };
    }
  };

  // Enable MFA
  const enableMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error enabling MFA:', error);
      return { data: null, error };
    }
  };

  // Verify MFA
  const verifyMFA = async (factorId, challengeId, code) => {
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code
      });
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error verifying MFA:', error);
      return { data: null, error };
    }
  };

  // Helper function to check if user has specific role
  const hasRole = (role) => {
    return userProfile?.role === role;
  };

  // Helper function to check if user is admin
  const isAdmin = () => {
    return hasRole('admin');
  };

  // Helper function to check if user is agent
  const isAgent = () => {
    return hasRole('agent');
  };

  // Helper function to check KYC status
  const getKYCStatus = () => {
    return userProfile?.kyc_status || 'pending';
  };

  // Helper function to check if MFA is enabled
  const isMFAEnabled = () => {
    return user?.factors && user.factors.length > 0;
  };

  const value = {
    // State
    user,
    session,
    loading,
    userProfile,
    
    // Auth methods
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    updateProfile,
    resetPassword,
    
    // Phone verification
    sendPhoneOTP,
    verifyPhone,
    
    // MFA methods
    enableMFA,
    verifyMFA,
    isMFAEnabled,
    
    // Helper methods
    hasRole,
    isAdmin,
    isAgent,
    getKYCStatus,
    fetchUserProfile,
    
    // Direct access to helpers
    authHelpers,
    dbHelpers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;