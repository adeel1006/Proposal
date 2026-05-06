'use client';

import { useState } from 'react';
import { CompanyBranding } from '@/app/lib/proposalTypes';

interface CompanyBrandingFormProps {
  company?: CompanyBranding;
  onSave: (company: CompanyBranding) => void;
  onCancel: () => void;
}

export default function CompanyBrandingForm({ company, onSave, onCancel }: CompanyBrandingFormProps) {
  const [formData, setFormData] = useState<CompanyBranding>(
    company || {
      id: '',
      businessName: '',
      email: '',
      mobileNumber: '',
      whatsapp: '',
      address: '',
      currency: 'USD',
      logo: '',
    }
  );

  const handleChange = <K extends keyof CompanyBranding>(
    field: K,
    value: CompanyBranding[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          logo: base64,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName || !formData.email || !formData.mobileNumber || !formData.address) {
      alert('Please fill in all required fields');
      return;
    }
    onSave({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border-2 border-blue-400">
      <h2 className="text-xl font-bold mb-4">
        {company ? 'Edit Company Branding' : 'Add New Company Branding'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Logo */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo (Image)</label>
          {formData.logo && (
            <div className="mb-3">
              <img src={formData.logo} alt="Logo" className="h-20 w-auto border rounded p-1" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Max 2MB recommended</p>
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name *
          </label>
          <input
            type="text"
            value={formData.businessName ?? ''}
            onChange={(e) => handleChange('businessName', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Tech Solutions Inc."
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={formData.email ?? ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="company@example.com"
            required
          />
        </div>

        {/* Mobile Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile Number *
          </label>
          <input
            type="tel"
            value={formData.mobileNumber ?? ''}
            onChange={(e) => handleChange('mobileNumber', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="+1 (555) 123-4567"
            required
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
          <input
            type="tel"
            value={formData.whatsapp || ''}
            onChange={(e) => handleChange('whatsapp', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
          <select
            value={formData.currency ?? 'USD'}
            onChange={(e) => handleChange('currency', e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="USD">USD ($)</option>
            <option value="CAD">CAD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AED">AED (د.إ)</option>
            <option value="QAR">QAR (ر.ق)</option>
            <option value="PKR">PKR (₨)</option>
          </select>
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
          <textarea
            value={formData.address ?? ''}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="123 Business St, City, State 12345"
            rows={3}
            required
          />
        </div>

        {/* Registered Company Number */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Registered Company Number</label>
          <input
            type="text"
            value={formData.registrationNumber || ''}
            onChange={(e) => handleChange('registrationNumber', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., REG-12345-ABCD"
          />
          <p className="text-xs text-gray-500 mt-1">Optional: Company registration, license, or incorporation number</p>
        </div>

        {/* Website */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input
            type="url"
            value={formData.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., https://www.yourcompany.com"
          />
        </div>

        {/* Social Media Links Header */}
        <div className="md:col-span-2 mt-4 pt-4 border-t-2">
          <h3 className="font-semibold text-gray-900 mb-4">Social Media Links</h3>
        </div>

        {/* Instagram */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
          <input
            type="url"
            value={formData.instagram || ''}
            onChange={(e) => handleChange('instagram', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="https://instagram.com/yourprofile"
          />
        </div>

        {/* LinkedIn */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
          <input
            type="url"
            value={formData.linkedin || ''}
            onChange={(e) => handleChange('linkedin', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="https://linkedin.com/company/yourcompany"
          />
        </div>

        {/* Twitter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Twitter/X</label>
          <input
            type="url"
            value={formData.twitter || ''}
            onChange={(e) => handleChange('twitter', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="https://twitter.com/yourhandle"
          />
        </div>

        {/* Facebook */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
          <input
            type="url"
            value={formData.facebook || ''}
            onChange={(e) => handleChange('facebook', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="https://facebook.com/yourpage"
          />
        </div>

        {/* YouTube */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
          <input
            type="url"
            value={formData.youtube || ''}
            onChange={(e) => handleChange('youtube', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="https://youtube.com/@yourchannel"
          />
        </div>

        {/* Pinterest */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pinterest</label>
          <input
            type="url"
            value={formData.pinterest || ''}
            onChange={(e) => handleChange('pinterest', e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="https://pinterest.com/yourprofile"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-6">
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Save Company
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
