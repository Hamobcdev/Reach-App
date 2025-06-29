// src/pages/NgoDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CrisisManagementClient, algorandUtils } from '../lib/algorandContract';
import { supabase } from '../lib/supabase';
import {
  Users,
  Award,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  MapPin,
  HeartHandshake,
  ClipboardList
} from 'lucide-react';

const NgoDashboard = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ngoAlgorandAccount, setNgoAlgorandAccount] = useState(null);
  const [ngoStatus, setNgoStatus] = useState([0, 0]); // [authorizedStatus, rating]
  const [assignedCases, setAssignedCases] = useState([]);

  // Form states
  const [badgeUserAddress, setBadgeUserAddress] = useState('');
  const [badgeCaseId, setBadgeCaseId] = useState('');
  const [badgeCrisisType, setBadgeCrisisType] = useState('natural_disaster');
  const [badgeSeverity, setBadgeSeverity] = useState(3);

  const [disbursalUserAddress, setDisbursalUserAddress] = useState('');
  const [disbursalAmount, setDisbursalAmount] = useState('');
  const [disbursalCaseId, setDisbursalCaseId] = useState('');

  const crisisClient = ngoAlgorandAccount ? new CrisisManagementClient(ngoAlgorandAccount) : null;

  useEffect(() => {
    if (userProfile && userProfile.algorand_address && userProfile.algorand_mnemonic) {
      try {
        const importedAccount = algorandUtils.importAccount(userProfile.algorand_mnemonic);
        setNgoAlgorandAccount(importedAccount);
      } catch (err) {
        setError('Invalid Algorand mnemonic in NGO profile. Please update your profile.');
        console.error('Mnemonic import error:', err);
      }
    }
  }, [userProfile]);

  useEffect(() => {
    if (ngoAlgorandAccount) {
      loadNgoData();
    }
  }, [ngoAlgorandAccount]);

  const loadNgoData = async () => {
    if (!ngoAlgorandAccount || !crisisClient) return;
    setLoading(true);
    try {
      const status = await crisisClient.getNgoStatus(ngoAlgorandAccount.addr);
      setNgoStatus(status);

      // Fetch assigned cases from Supabase
      const { data: casesData, error: casesError } = await supabase
        .from('emergency_cases')
        .select('*')
        .eq('assigned_ngo_id', userProfile.ngo_id) // Assuming userProfile has ngo_id
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;
      setAssignedCases(casesData);

    } catch (err) {
      console.error('Error loading NGO data:', err);
      setError('Failed to load NGO data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueBadge = async () => {
    if (!crisisClient || !badgeUserAddress || !algorandUtils.isValidAddress(badgeUserAddress) || !badgeCaseId) {
      setError('Please fill all badge issuance fields.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await crisisClient.issueCrisisBadge(
        badgeUserAddress,
        badgeCaseId,
        badgeCrisisType,
        badgeSeverity
      );
      if (result.success) {
        setSuccess(`Crisis badge issued to ${badgeUserAddress} for case ${badgeCaseId}! TX: ${result.transactionId}`);
        // Clear form
        setBadgeUserAddress('');
        setBadgeCaseId('');
        loadNgoData();
      } else {
        setError(result.error || 'Failed to issue badge.');
      }
    } catch (err) {
      setError('An unexpected error occurred during badge issuance.');
      console.error('Issue badge error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyDisbursal = async () => {
    if (!crisisClient || !disbursalUserAddress || !algorandUtils.isValidAddress(disbursalUserAddress) || !disbursalAmount || parseFloat(disbursalAmount) <= 0 || !disbursalCaseId) {
      setError('Please fill all disbursal fields.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await crisisClient.emergencyDisbursal(
        disbursalUserAddress,
        parseFloat(disbursalAmount),
        disbursalCaseId
      );
      if (result.success) {
        setSuccess(`Emergency disbursal of ${disbursalAmount} to ${disbursalUserAddress} for case ${disbursalCaseId}! TX: ${result.transactionId}`);
        // Clear form
        setDisbursalUserAddress('');
        setDisbursalAmount('');
        setDisbursalCaseId('');
        loadNgoData();
      } else {
        setError(result.error || 'Failed to disburse funds.');
      }
    } catch (err) {
      setError('An unexpected error occurred during disbursal.');
      console.error('Emergency disbursal error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-700">Loading NGO dashboard...</p>
      </div>
    );
  }

  if (!user || userProfile?.role !== 'ngo') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AlertCircle className="h-10 w-10 text-red-600" />
        <p className="ml-3 text-gray-700">Access Denied. Only NGOs can view this page.</p>
      </div>
    );
  }

  if (!ngoAlgorandAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AlertCircle className="h-10 w-10 text-yellow-600" />
        <p className="ml-3 text-gray-700">NGO Algorand account not configured. Please link your Algorand wallet in your profile.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">NGO Dashboard</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* NGO Status Card */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <HeartHandshake className="h-5 w-5 mr-2" />
              Your NGO Status
            </h3>
            <button onClick={loadNgoData} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-green-100 text-sm">Authorization Status</div>
              <div className="text-2xl font-bold">
                {ngoStatus[0] === 1 ? 'Authorized' : 'Pending/Unauthorized'}
              </div>
            </div>
            <div>
              <div className="text-green-100 text-sm">Rating</div>
              <div className="text-2xl font-bold">
                {ngoStatus[1]} / 10
              </div>
            </div>
            <div>
              <div className="text-green-100 text-sm">Algorand Address</div>
              <div className="font-mono text-sm break-all">
                {ngoAlgorandAccount?.addr}
              </div>
            </div>
          </div>
        </div>

        {/* Issue Crisis Badge */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Issue Crisis Badge
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">User Algorand Address</label>
              <input type="text" value={badgeUserAddress} onChange={(e) => setBadgeUserAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="User's Algorand Address" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Case ID (UUID)</label>
              <input type="text" value={badgeCaseId} onChange={(e) => setBadgeCaseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g., a0eebc99-..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Crisis Type</label>
              <select value={badgeCrisisType} onChange={(e) => setBadgeCrisisType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="natural_disaster">Natural Disaster</option>
                <option value="medical_emergency">Medical Emergency</option>
                <option value="conflict">Conflict Zone</option>
                <option value="economic_hardship">Economic Hardship</option>
                <option value="refugee">Refugee</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Severity (1-5)</label>
              <input type="number" value={badgeSeverity} onChange={(e) => setBadgeSeverity(parseInt(e.target.value))}
                min="1" max="5" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <button onClick={handleIssueBadge} disabled={loading || ngoStatus[0] !== 1}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Issuing...' : 'Issue Badge'}
            </button>
          </div>
        </div>

        {/* Emergency Disbursal */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Emergency Disbursal
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">User Algorand Address</label>
              <input type="text" value={disbursalUserAddress} onChange={(e) => setDisbursalUserAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="User's Algorand Address" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (ALGO equivalent)</label>
              <input type="number" value={disbursalAmount} onChange={(e) => setDisbursalAmount(e.target.value)}
                min="0.000001" step="0.000001" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Case ID (UUID)</label>
              <input type="text" value={disbursalCaseId} onChange={(e) => setDisbursalCaseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g., a0eebc99-..." />
            </div>
            <button onClick={handleEmergencyDisbursal} disabled={loading || ngoStatus[0] !== 1}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Disbursing...' : 'Disburse Funds'}
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Cases List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <ClipboardList className="h-5 w-5 mr-2" />
          Assigned Emergency Cases
        </h3>
        {assignedCases.length > 0 ? (
          <ul className="space-y-4">
            {assignedCases.map((caseItem) => (
              <li key={caseItem.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium text-lg">{caseItem.title}</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    caseItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    caseItem.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                    caseItem.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {caseItem.status}
                  </span>
                </div>
                <p className="text-gray-700 text-sm mb-2">{caseItem.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <p><MapPin className="inline-block mr-1" size={14} /> Location: {caseItem.location}</p>
                  <p><Users className="inline-block mr-1" size={14} /> User Wallet: {caseItem.user_wallet}</p>
                  <p><DollarSign className="inline-block mr-1" size={14} /> Requested: {caseItem.requested_amount} ALGO</p>
                  <p><DollarSign className="inline-block mr-1" size={14} /> Disbursed: {caseItem.disbursed_amount} ALGO</p>
                </div>
                {/* Add buttons for quick actions like "Issue Badge" or "Disburse" pre-filling forms */}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No emergency cases assigned to your NGO.</p>
        )}
      </div>
    </div>
  );
};

export default NgoDashboard;
