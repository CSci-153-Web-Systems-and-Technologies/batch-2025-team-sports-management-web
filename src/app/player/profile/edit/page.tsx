'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

interface FormData {
  phone_number: string;
  email: string;
}

interface ProfileData {
  full_name: string;
  phone_number: string;
  email: string;
  role: string;
}

export default function EditPlayerProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    phone_number: '',
    email: ''
  });
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const supabase = createSupabaseBrowserClient();

  // Format phone number to +63 format
  const formatPhoneNumber = (phone: string): string => {
    let cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '63' + cleanPhone.slice(1);
    }
    
    if (!cleanPhone.startsWith('63') && cleanPhone.length > 0) {
      cleanPhone = '63' + cleanPhone;
    }
    
    if (cleanPhone.length > 0 && !cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }
    
    return cleanPhone;
  };

  // Handle phone input with formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let formatted = value;
    
    const clean = value.replace(/[^\d+]/g, '');
    
    if (clean.startsWith('+63')) {
      formatted = clean;
    } else if (clean.startsWith('63')) {
      formatted = '+' + clean;
    } else if (clean.startsWith('0') && clean.length <= 11) {
      formatted = '+63' + clean.slice(1);
    } else {
      formatted = clean;
    }
    
    if (formatted.length <= 13) {
      setFormData(prev => ({ ...prev, phone_number: formatted }));
    }
  };

  // Fetch current profile
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('full_name, phone_number, email, role')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          return; // Just return without alert
        }

        if (profile) {
          setProfileData(profile);
          const formattedPhone = profile.phone_number 
            ? formatPhoneNumber(profile.phone_number)
            : '';
          
          setFormData({
            phone_number: formattedPhone,
            email: user.email || profile.email || ''
          });
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        // Alert removed - just log to console
      } finally {
        setFetching(false);
      }
    }

    fetchData();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Update user email in auth if changed
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (emailError) {
          if (emailError.message.includes('already registered')) {
            alert('This email is already registered. Please use a different email.');
            setLoading(false);
            return;
          }
          throw emailError;
        }
        
        alert('Verification email sent! Please check your inbox to confirm your new email.');
      }

      // Validate phone number format
      const formattedPhone = formatPhoneNumber(formData.phone_number);
      if (formattedPhone && !formattedPhone.startsWith('+63')) {
        alert('Please enter a valid Philippines phone number starting with +63');
        setLoading(false);
        return;
      }

      // Update profile in database (only phone number)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          phone_number: formattedPhone || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      alert('Profile updated successfully!');
      router.push('/player/profile');
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update your contact information
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section - SIMPLIFIED */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
              
              <div className="space-y-6">
                {/* Editable Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="your.email@example.com"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Changing email requires verification
                  </p>
                </div>

                {/* Editable Phone Number with Philippines format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number (Philippines)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      +63
                    </div>
                    <input
                      type="tel"
                      value={formData.phone_number.replace('+63', '')}
                      onChange={handlePhoneChange}
                      className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      placeholder="912 345 6789"
                      maxLength={13}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Format: +63 912 345 6789
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.push('/player/profile')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}