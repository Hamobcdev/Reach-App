import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  User,
  MapPin,
  DollarSign,
  Shield,
  Loader2,
} from "lucide-react";

const FlexibleKYCForm = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [currentTier, setCurrentTier] = useState("BASIC");
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    region: "samoa",
  });

  // KYC Configuration based on the provided documents
  const KYC_TIERS = {
    BASIC: {
      name: "Quick Start",
      limits: { daily: 100, monthly: 500, transaction: 50 },
      requirements: {
        minimum: 1,
        categories: ["identity", "address_alternative"],
      },
      timeframe: "Instant (automated)",
      color: "bg-green-100 border-green-300 text-green-800",
    },
    STANDARD: {
      name: "Standard Access",
      limits: { daily: 1000, monthly: 5000, transaction: 500 },
      requirements: { minimum: 2, categories: ["identity", "address"] },
      timeframe: "1-24 hours",
      color: "bg-blue-100 border-blue-300 text-blue-800",
    },
    ENHANCED: {
      name: "Full Access",
      limits: { daily: 10000, monthly: 50000, transaction: 5000 },
      requirements: {
        minimum: 3,
        categories: ["identity", "address", "income_proof"],
      },
      timeframe: "1-3 business days",
      color: "bg-purple-100 border-purple-300 text-purple-800",
    },
  };

  const FLEXIBLE_DOCUMENT_TYPES = {
    identity: {
      category: "Identity Verification",
      required: true,
      options: [
        {
          key: "passport",
          title: "Passport",
          points: 100,
          difficulty: "high",
          accessible: false,
        },
        {
          key: "national_id",
          title: "National ID Card",
          points: 90,
          difficulty: "medium",
          accessible: true,
        },
        {
          key: "drivers_license",
          title: "Driver's License",
          points: 85,
          difficulty: "medium",
          accessible: true,
        },
        {
          key: "voter_id",
          title: "Voter Registration Card",
          points: 70,
          difficulty: "low",
          accessible: true,
        },
        {
          key: "birth_certificate",
          title: "Birth Certificate",
          points: 65,
          difficulty: "low",
          accessible: true,
        },
        {
          key: "community_id",
          title: "Community/Tribal ID",
          points: 50,
          difficulty: "low",
          accessible: true,
          requiresReview: true,
        },
      ],
    },
    address: {
      category: "Address Verification",
      required: false,
      options: [
        {
          key: "utility_bill",
          title: "Utility Bill",
          points: 100,
          difficulty: "high",
          accessible: false,
        },
        {
          key: "bank_statement",
          title: "Bank Statement",
          points: 95,
          difficulty: "high",
          accessible: false,
        },
        {
          key: "rental_agreement",
          title: "Rental Agreement",
          points: 80,
          difficulty: "medium",
          accessible: true,
        },
        {
          key: "employer_letter",
          title: "Employer Address Letter",
          points: 75,
          difficulty: "medium",
          accessible: true,
        },
        {
          key: "government_correspondence",
          title: "Government Mail",
          points: 70,
          difficulty: "low",
          accessible: true,
        },
      ],
    },
    address_alternative: {
      category: "Alternative Address Proof",
      required: false,
      options: [
        {
          key: "community_letter",
          title: "Community Leader Letter",
          points: 60,
          difficulty: "low",
          accessible: true,
          requiresReview: true,
        },
        {
          key: "neighbor_attestation",
          title: "Neighbor Attestation",
          points: 50,
          difficulty: "low",
          accessible: true,
          requiresReview: true,
        },
        {
          key: "religious_leader_letter",
          title: "Religious Leader Letter",
          points: 55,
          difficulty: "low",
          accessible: true,
          requiresReview: true,
        },
        {
          key: "school_records",
          title: "School Records",
          points: 65,
          difficulty: "low",
          accessible: true,
        },
        {
          key: "medical_records",
          title: "Medical Facility Records",
          points: 60,
          difficulty: "low",
          accessible: true,
        },
      ],
    },
    income_proof: {
      category: "Income Verification",
      required: false,
      options: [
        {
          key: "payslip",
          title: "Employment Pay Slip",
          points: 90,
          difficulty: "medium",
          accessible: true,
        },
        {
          key: "business_license",
          title: "Business/Trade License",
          points: 75,
          difficulty: "low",
          accessible: true,
        },
        {
          key: "market_vendor_permit",
          title: "Market Vendor Permit",
          points: 60,
          difficulty: "low",
          accessible: true,
        },
        {
          key: "agricultural_records",
          title: "Agricultural Activity Records",
          points: 55,
          difficulty: "low",
          accessible: true,
        },
      ],
    },
  };

  const calculateScore = (documents) => {
    let totalScore = 0;
    let hasIdentity = false;
    let hasAddress = false;

    documents.forEach((doc) => {
      Object.values(FLEXIBLE_DOCUMENT_TYPES).forEach((category) => {
        const docType = category.options.find((opt) => opt.key === doc.type);
        if (docType) {
          totalScore += docType.points;
          if (category.category === "Identity Verification") hasIdentity = true;
          if (category.category.includes("Address")) hasAddress = true;
        }
      });
    });

    const tier =
      totalScore >= 200
        ? "ENHANCED"
        : totalScore >= 130
        ? "STANDARD"
        : totalScore >= 50
        ? "BASIC"
        : "INSUFFICIENT";

    return { totalScore, hasIdentity, hasAddress, tier };
  };

  const handleFileUpload = async (categoryKey, docKey, files) => {
    if (files && files[0]) {
      const file = files[0];
      const fileId = `${Date.now()}_${file.name}`;
      
      try {
        // Check if the bucket exists first
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error('Error checking buckets:', bucketsError);
          setError('Failed to check storage buckets. Please try again.');
          return;
        }
        
        const kycBucketExists = buckets.some(bucket => bucket.name === 'kyc-documents');
        
        if (!kycBucketExists) {
          console.error('KYC documents bucket does not exist');
          setError('Storage bucket for KYC documents does not exist. Please contact support.');
          return;
        }
        
        // Upload file to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(fileId, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setError('Failed to upload document. Please try again.');
          return;
        }

        const newDoc = {
          id: Date.now(),
          type: docKey,
          category: categoryKey,
          file: file,
          fileName: file.name,
          uploadedAt: new Date(),
          storageId: fileId,
          storagePath: uploadData.path,
        };

        const updatedDocs = [...uploadedDocs, newDoc];
        setUploadedDocs(updatedDocs);

        const score = calculateScore(updatedDocs);
        setCurrentScore(score.totalScore);
        setCurrentTier(score.tier);
      } catch (err) {
        console.error('File upload error:', err);
        setError('Failed to upload document. Please try again.');
      }
    }
  };

  const removeDocument = async (docId) => {
    const docToRemove = uploadedDocs.find(doc => doc.id === docId);
    
    if (docToRemove && docToRemove.storageId) {
      try {
        // Check if the bucket exists first
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error('Error checking buckets:', bucketsError);
          // Continue with document removal from state even if storage removal fails
        } else {
          const kycBucketExists = buckets.some(bucket => bucket.name === 'kyc-documents');
          
          if (kycBucketExists) {
            // Remove from Supabase storage
            await supabase.storage
              .from('kyc-documents')
              .remove([docToRemove.storageId]);
          }
        }
      } catch (err) {
        console.error('Error removing file from storage:', err);
        // Continue with document removal from state even if storage removal fails
      }
    }

    const updatedDocs = uploadedDocs.filter((doc) => doc.id !== docId);
    setUploadedDocs(updatedDocs);

    const score = calculateScore(updatedDocs);
    setCurrentScore(score.totalScore);
    setCurrentTier(score.tier);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentScore < 50) {
      setError('Please upload at least one identity document to continue');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('Please log in to submit your KYC application');
        return;
      }

      // Prepare documents data for storage
      const documentsData = uploadedDocs.map(doc => ({
        type: doc.type,
        category: doc.category,
        fileName: doc.fileName,
        storageId: doc.storageId,
        storagePath: doc.storagePath,
        uploadedAt: doc.uploadedAt,
      }));

      // Submit KYC application to Supabase
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_applications')
        .upsert([
          {
            user_id: user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            address: formData.address,
            region: formData.region,
            tier: currentTier,
            score: currentScore,
            documents: documentsData,
            status: currentTier === 'BASIC' ? 'approved' : 'pending',
          }
        ])
        .select()
        .single();

      if (kycError) {
        console.error('KYC submission error:', kycError);
        setError('Failed to submit KYC application. Please try again.');
        return;
      }

      // Log the event
      await supabase.from('events').insert([
        {
          user_id: user.id,
          type: 'kyc_submitted',
          data: {
            tier: currentTier,
            score: currentScore,
            documents_count: uploadedDocs.length,
          }
        }
      ]);

      setSuccess(`KYC application submitted successfully! Tier: ${currentTier}`);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess({
          tier: currentTier,
          score: currentScore,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          region: formData.region,
          documents: uploadedDocs,
          kycData: kycData,
        });
      } else {
        // Default behavior: navigate to success page
        setTimeout(() => {
          navigate('/kyc-success', { 
            state: { 
              tier: currentTier, 
              score: currentScore,
              kycData: kycData 
            } 
          });
        }, 2000);
      }

    } catch (err) {
      console.error('Submission error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderDocumentOption = (categoryKey, doc) => {
    const isUploaded = uploadedDocs.some(
      (uploaded) => uploaded.type === doc.key
    );

    return (
      <div
        key={doc.key}
        className={`p-3 border rounded-lg ${
          isUploaded
            ? "bg-green-50 border-green-300"
            : "bg-white border-gray-200"
        } hover:shadow-sm transition-shadow`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{doc.title}</h4>
              <div
                className={`px-2 py-1 text-xs rounded-full ${
                  doc.accessible
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {doc.accessible ? "Accessible" : "May be difficult"}
              </div>
              {doc.requiresReview && (
                <div className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                  Manual Review
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">+{doc.points} points</p>
          </div>

          {!isUploaded ? (
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.webp,.heic"
                onChange={(e) =>
                  handleFileUpload(categoryKey, doc.key, e.target.files)
                }
              />
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                <Upload size={12} />
                Upload
              </div>
            </label>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <button
                onClick={() => {
                  const docToRemove = uploadedDocs.find(
                    (uploaded) => uploaded.type === doc.key
                  );
                  if (docToRemove) removeDocument(docToRemove.id);
                }}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTierStatus = () => {
    const tier = KYC_TIERS[currentTier] || KYC_TIERS.BASIC;

    return (
      <div className={`p-4 rounded-lg border-2 ${tier.color}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">{tier.name}</h3>
            <p className="text-sm opacity-75">
              Current Score: {currentScore} points
            </p>
          </div>
          <Shield size={24} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="font-medium">Daily Limit</div>
            <div>${tier.limits.daily}</div>
          </div>
          <div>
            <div className="font-medium">Monthly Limit</div>
            <div>${tier.limits.monthly}</div>
          </div>
          <div>
            <div className="font-medium">Per Transaction</div>
            <div>${tier.limits.transaction}</div>
          </div>
        </div>

        <div className="mt-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>Processing Time: {tier.timeframe}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Virtual Card Application
          </h1>
          <p className="text-gray-600">
            Flexible verification designed for everyone, including unbanked and
            underserved communities
          </p>
        </div>

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

        {/* Current Tier Status */}
        {renderTierStatus()}

        {/* Basic Information */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User size={20} />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+685 ..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <select
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="samoa">Samoa</option>
                <option value="fiji">Fiji</option>
                <option value="tonga">Tonga</option>
                <option value="vanuatu">Vanuatu</option>
                <option value="pacific">Other Pacific</option>
              </select>
            </div>
          </div>
        </div>

        {/* Document Upload Sections */}
        {Object.entries(FLEXIBLE_DOCUMENT_TYPES).map(
          ([categoryKey, category]) => (
            <div key={categoryKey} className="mt-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText size={20} />
                {category.category}
                {category.required && <span className="text-red-500">*</span>}
              </h2>

              <div className="mb-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <p>
                  <strong>Choose any document that you have available.</strong>{" "}
                  We understand that traditional documents may not be accessible
                  to everyone. Community-verified documents are welcome and will
                  be manually reviewed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {category.options.map((doc) =>
                  renderDocumentOption(categoryKey, doc)
                )}
              </div>
            </div>
          )
        )}

        {/* Uploaded Documents Summary */}
        {uploadedDocs.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Uploaded Documents</h2>
            <div className="space-y-2">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {
                        FLEXIBLE_DOCUMENT_TYPES[doc.category]?.options.find(
                          (opt) => opt.key === doc.type
                        )?.title
                      }
                    </div>
                    <div className="text-xs text-gray-600">{doc.fileName}</div>
                  </div>
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tier Progression Guide */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Verification Levels</h2>
          <div className="space-y-3">
            {Object.entries(KYC_TIERS).map(([tierKey, tier]) => (
              <div
                key={tierKey}
                className={`p-4 rounded-lg border ${
                  tierKey === currentTier
                    ? tier.color
                    : "bg-gray-50 border-gray-200 text-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{tier.name}</h3>
                    <p className="text-sm">
                      Daily: ${tier.limits.daily} | Monthly: $
                      {tier.limits.monthly} | Per Transaction: $
                      {tier.limits.transaction}
                    </p>
                  </div>
                  <div className="text-sm">
                    {tierKey === "BASIC" && "50+ points"}
                    {tierKey === "STANDARD" && "130+ points"}
                    {tierKey === "ENHANCED" && "200+ points"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              currentScore < 50 ||
              !formData.firstName ||
              !formData.lastName ||
              !formData.phone
            }
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Submitting Application...
              </>
            ) : currentScore < 50 ? (
              "Upload at least one identity document to continue"
            ) : (
              `Submit Application for ${KYC_TIERS[currentTier]?.name} Access`
            )}
          </button>

          {currentScore >= 50 && (
            <p className="text-center text-sm text-gray-600 mt-2">
              Processing time: {KYC_TIERS[currentTier]?.timeframe}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlexibleKYCForm;