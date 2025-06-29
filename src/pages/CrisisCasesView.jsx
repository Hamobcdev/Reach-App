// src/pages/CrisisCasesView.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  MapPin,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  HeartHandshake,
  ClipboardList,
  Globe,
  Filter,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const CrisisCasesView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cases, setCases] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    crisisType: 'all',
    region: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  useEffect(() => {
    fetchCrisisCases();
  }, [filters]);

  const fetchCrisisCases = async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('emergency_cases')
        .select(`
          *,
          crisis_badges (
            id, badge_type, crisis_type, severity_level, issued_by_algorand_address, created_at
          ),
          ngos (
            id, name, algorand_address
          )
        `);

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.crisisType !== 'all') {
        query = query.eq('crisis_type', filters.crisisType);
      }
      if (filters.region !== 'all') {
        query = query.eq('location', filters.region); // Assuming location can be used for region
      }

      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

      const { data, error: casesError } = await query;

      if (casesError) throw casesError;
      setCases(data);
    } catch (err) {
      console.error('Error fetching crisis cases:', err);
      setError('Failed to load crisis cases.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSortChange = (sortBy) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity) => {
    if (severity >= 4) return 'text-red-600';
    if (severity === 3) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 flex items-center">
        <Globe className="h-8 w-8 mr-3 text-blue-600" />
        Global Crisis Overview
      </h1>
      <p className="text-gray-600 mb-6">
        View and track emergency cases and humanitarian aid efforts worldwide.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="ml-3 text-gray-700">Loading cases...</p>
        </div>
      )}

      {/* Filters and Sort */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-wrap items-center gap-4">
        <h3 className="font-semibold text-gray-700 flex items-center"><Filter size={18} className="mr-2" /> Filters:</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Crisis Type</label>
          <select name="crisisType" value={filters.crisisType} onChange={handleFilterChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="all">All</option>
            <option value="natural_disaster">Natural Disaster</option>
            <option value="medical_emergency">Medical Emergency</option>
            <option value="conflict">Conflict Zone</option>
            <option value="economic_hardship">Economic Hardship</option>
            <option value="refugee">Refugee</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Region</label>
          <select name="region" value={filters.region} onChange={handleFilterChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="all">All</option>
            <option value="Apia, Samoa">Samoa</option>
            <option value="Nairobi, Kenya">Kenya</option>
            <option value="Manila, Philippines">Philippines</option>
            <option value="Global">Global</option>
          </select>
        </div>
        <button onClick={() => fetchCrisisCases()} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
          <RefreshCw size={16} className="mr-2" /> Apply Filters
        </button>
      </div>

      {/* Cases List */}
      {!loading && cases.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>No crisis cases found matching your criteria.</p>
        </div>
      )}

      {!loading && cases.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">All Crisis Cases ({cases.length})</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Sort by:</span>
              <button onClick={() => handleSortChange('created_at')} className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-sm flex items-center">
                Date {filters.sortBy === 'created_at' && (filters.sortOrder === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />)}
              </button>
              <button onClick={() => handleSortChange('severity_level')} className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-sm flex items-center">
                Severity {filters.sortBy === 'severity_level' && (filters.sortOrder === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />)}
              </button>
            </div>
          </div>
          <ul className="space-y-4">
            {cases.map((caseItem) => (
              <li key={caseItem.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-xl text-gray-900">{caseItem.title}</p>
                    <p className="text-gray-700 text-sm">{caseItem.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(caseItem.status)}`}>
                    {caseItem.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                  <p><MapPin className="inline-block mr-1" size={16} /> Location: {caseItem.location}</p>
                  <p><ClipboardList className="inline-block mr-1" size={16} /> Type: {caseItem.crisis_type}</p>
                  <p><AlertCircle className="inline-block mr-1" size={16} /> Severity: <span className={`font-bold ${getSeverityColor(caseItem.severity_level)}`}>{caseItem.severity_level}</span></p>
                  <p><DollarSign className="inline-block mr-1" size={16} /> Requested: {caseItem.requested_amount} ALGO</p>
                  <p><DollarSign className="inline-block mr-1" size={16} /> Disbursed: {caseItem.disbursed_amount} ALGO</p>
                  <p><Users className="inline-block mr-1" size={16} /> User Wallet: {caseItem.user_wallet.substring(0, 10)}...</p>
                  {caseItem.ngos && caseItem.ngos.name && (
                    <p><HeartHandshake className="inline-block mr-1" size={16} /> Assigned NGO: {caseItem.ngos.name}</p>
                  )}
                </div>

                {caseItem.crisis_badges && caseItem.crisis_badges.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 text-sm mb-2">Crisis Badges:</h4>
                    <div className="flex flex-wrap gap-2">
                      {caseItem.crisis_badges.map(badge => (
                        <span key={badge.id} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center">
                          <Award size={12} className="mr-1" /> {badge.badge_type} ({badge.severity_level}) by {badge.issued_by_algorand_address.substring(0, 6)}...
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CrisisCasesView;
