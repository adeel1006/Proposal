'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CompanyBranding } from '@/app/lib/proposalTypes';
import CompanyBrandingForm from '@/app/components/CompanyBrandingForm';
import { CompanyGridSkeleton, PageHeaderSkeleton } from '@/app/components/LoadingSkeletons';
import { useCompanies } from '@/lib/hooks/useCompanies';

export default function CompaniesPage() {
  const { companies, loading, error, createCompany, updateCompany, deleteCompany } = useCompanies();
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyBranding | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAdd = () => {
    setEditingCompany(null);
    setShowForm(true);
  };

  const handleEdit = (company: CompanyBranding) => {
    setEditingCompany(company);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this company branding?')) {
      deleteCompany(id)
        .then(() => {
          setMessage({ type: 'success', text: 'Company deleted successfully' });
          setTimeout(() => setMessage(null), 3000);
        })
        .catch(() => {
          setMessage({ type: 'error', text: 'Failed to delete company' });
          setTimeout(() => setMessage(null), 3000);
        });
    }
  };

  const handleSave = (company: CompanyBranding) => {
    const saveAction = editingCompany
      ? updateCompany(company)
      : createCompany(company);

    saveAction
      .then(() => {
        setMessage({
          type: 'success',
          text: editingCompany ? 'Company updated successfully' : 'Company created successfully',
        });
        setTimeout(() => setMessage(null), 3000);
        setShowForm(false);
        setEditingCompany(null);
      })
      .catch(() => {
        setMessage({
          type: 'error',
          text: editingCompany ? 'Failed to update company' : 'Failed to create company',
        });
        setTimeout(() => setMessage(null), 3000);
      });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCompany(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl">
          <PageHeaderSkeleton />
          <div className="mb-6 h-12 w-44 animate-pulse rounded-lg bg-slate-200" />
          <CompanyGridSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Brandings</h1>
          <p className="text-gray-600">
            Manage your company brandings and use them when creating proposals
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg border border-red-300">
            Error: {error}
          </div>
        )}

        {/* Show form if in edit/add mode */}
        {showForm ? (
          <div className="mb-8">
            <CompanyBrandingForm
              company={editingCompany || undefined}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          <button
            onClick={handleAdd}
            className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add New Company
          </button>
        )}

        {/* Companies Grid */}
        {companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No company brandings yet</p>
            {!showForm && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Your First Company
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition"
              >
                {/* Logo Section */}
                <div className="bg-gray-200 h-32 flex items-center justify-center overflow-hidden">
                  {company.logo ? (
                    <img
                      src={company.logo}
                      alt={company.businessName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 font-semibold text-center px-4">
                      {company.businessName}
                    </div>
                  )}
                </div>

                {/* Company Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 text-gray-900">
                    {company.businessName}
                  </h3>

                  {/* Contact Details */}
                  <div className="space-y-2 text-sm text-gray-700 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-fit">Email:</span>
                      <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline break-all">
                        {company.email}
                      </a>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-fit">Phone:</span>
                      <a href={`tel:${company.mobileNumber}`} className="text-blue-600 hover:underline">
                        {company.mobileNumber}
                      </a>
                    </div>

                    {company.whatsapp && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium min-w-fit">WhatsApp:</span>
                        <a
                          href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline"
                        >
                          {company.whatsapp}
                        </a>
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <div className="flex items-start gap-2">
                        <span className="font-medium">Address:</span>
                        <span className="text-gray-600">{company.address}</span>
                      </div>
                    </div>

                    {company.website && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium min-w-fit">🌐</span>
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {company.website}
                        </a>
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-fit">Currency:</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {company.currency}
                      </span>
                    </div>
                  </div>

                  {/* Social Media Links */}
                  {(company.instagram || company.linkedin || company.twitter || company.facebook || company.youtube || company.pinterest) && (
                    <div className="mb-4 pt-4 border-t">
                      <p className="text-xs font-medium text-gray-600 mb-2">Follow Us</p>
                      <div className="flex gap-2 flex-wrap">
                        {company.instagram && (
                          <a
                            href={company.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 hover:text-pink-800 text-xl"
                            title="Instagram"
                          >
                            📷
                          </a>
                        )}
                        {company.linkedin && (
                          <a
                            href={company.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:text-blue-900 text-xl"
                            title="LinkedIn"
                          >
                            💼
                          </a>
                        )}
                        {company.twitter && (
                          <a
                            href={company.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-600 text-xl"
                            title="Twitter/X"
                          >
                            𝕏
                          </a>
                        )}
                        {company.facebook && (
                          <a
                            href={company.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xl"
                            title="Facebook"
                          >
                            👍
                          </a>
                        )}
                        {company.youtube && (
                          <a
                            href={company.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-600 hover:text-red-800 text-xl"
                            title="YouTube"
                          >
                            ▶️
                          </a>
                        )}
                        {company.pinterest && (
                          <a
                            href={company.pinterest}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-700 hover:text-red-900 text-xl"
                            title="Pinterest"
                          >
                            📌
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleEdit(company)}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(company.id)}
                      className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Company ID */}
                  <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600 break-all">
                    ID: {company.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          <Link
            href="/admin/proposals"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Proposals
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
