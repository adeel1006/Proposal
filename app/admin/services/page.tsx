'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProposalItem } from '@/app/lib/proposalTypes';
import { useCompanies } from '@/lib/hooks/useCompanies';
import { useServices } from '@/lib/hooks/useServices';

export default function ServicesPage() {
  const { companies, loading: companiesLoading } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const { services: companyServices, loading: servicesLoading, createService, deleteService } = useServices(selectedCompanyId);
  
  const [showAddService, setShowAddService] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newService, setNewService] = useState<ProposalItem>({
    id: '',
    name: '',
    description: '',
    price: 0,
    currency: 'USD',
    category: 'General',
    quantity: 1,
  });

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null;

  const handleAddService = () => {
    if (!newService.name || !newService.description) {
      setMessage({ type: 'error', text: 'Please fill in service name and description' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!selectedCompanyId) {
      setMessage({ type: 'error', text: 'Please select a company first' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const service: Omit<ProposalItem, 'id'> & { companyId: string } = {
      ...newService,
      companyId: selectedCompanyId,
      currency: selectedCompany?.currency || 'USD',
    };

    createService(service)
      .then(() => {
        setMessage({ type: 'success', text: 'Service added successfully' });
        setTimeout(() => setMessage(null), 3000);
        setNewService({
          id: '',
          name: '',
          description: '',
          price: 0,
          currency: selectedCompany?.currency || 'USD',
          category: 'General',
          quantity: 1,
        });
        setShowAddService(false);
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'Failed to add service' });
        setTimeout(() => setMessage(null), 3000);
      });
  };

  const handleDeleteService = (id: string) => {
    if (window.confirm('Delete this service?')) {
      deleteService(id)
        .then(() => {
          setMessage({ type: 'success', text: 'Service deleted successfully' });
          setTimeout(() => setMessage(null), 3000);
        })
        .catch(() => {
          setMessage({ type: 'error', text: 'Failed to delete service' });
          setTimeout(() => setMessage(null), 3000);
        });
    }
  };

  if (companiesLoading) {
    return <div className="p-6 text-center">Loading companies...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Services Dashboard</h1>
          <p className="text-gray-600">
            Manage services/products for each company
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

        {/* Company Selector */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Company
          </label>
          {companies.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded text-yellow-800">
              No companies found. <Link href="/admin/companies" className="text-blue-600 hover:underline font-medium">Create a company first</Link>
            </div>
          ) : (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full border rounded px-4 py-2 text-lg"
            >
              <option value="">-- Select a company --</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.businessName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Company Information Card */}
        {selectedCompany && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Business Name</p>
                <p className="font-bold text-lg text-gray-900">{selectedCompany.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Currency</p>
                <p className="font-bold text-lg text-gray-900">{selectedCompany.currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900 truncate">{selectedCompany.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-gray-900">{selectedCompany.mobileNumber}</p>
              </div>
            </div>

            {/* Social Media Links */}
            {(selectedCompany.instagram || selectedCompany.linkedin || selectedCompany.twitter || selectedCompany.facebook || selectedCompany.youtube || selectedCompany.pinterest) && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Social Media</p>
                <div className="flex gap-3 flex-wrap">
                  {selectedCompany.instagram && (
                    <a href={selectedCompany.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800 font-medium">
                      📷 Instagram
                    </a>
                  )}
                  {selectedCompany.linkedin && (
                    <a href={selectedCompany.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 font-medium">
                      💼 LinkedIn
                    </a>
                  )}
                  {selectedCompany.twitter && (
                    <a href={selectedCompany.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 font-medium">
                      𝕏 Twitter
                    </a>
                  )}
                  {selectedCompany.facebook && (
                    <a href={selectedCompany.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">
                      👍 Facebook
                    </a>
                  )}
                  {selectedCompany.youtube && (
                    <a href={selectedCompany.youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800 font-medium">
                      ▶️ YouTube
                    </a>
                  )}
                  {selectedCompany.pinterest && (
                    <a href={selectedCompany.pinterest} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:text-red-900 font-medium">
                      📌 Pinterest
                    </a>
                  )}
                </div>
              </div>
            )}

            {selectedCompany.website && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">Website</p>
                <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {selectedCompany.website}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Services Section */}
        {selectedCompanyId && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Services/Products</h2>
              <button
                onClick={() => setShowAddService(!showAddService)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                {showAddService ? '✕ Cancel' : '+ Add Service'}
              </button>
            </div>

            {/* Add Service Form */}
            {showAddService && (
              <div className="mb-6 p-4 bg-gray-50 border-2 border-dashed rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Name *
                    </label>
                    <input
                      type="text"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="e.g., Web Design"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={newService.category || ''}
                      onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="e.g., Design"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Describe this service..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={selectedCompany?.currency || 'USD'}
                      disabled
                      className="w-full border rounded px-3 py-2 bg-gray-100"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleAddService}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                  >
                    Save Service
                  </button>
                  <button
                    onClick={() => setShowAddService(false)}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {servicesLoading && (
              <div className="text-center py-12 bg-gray-50 rounded">
                <p className="text-gray-500">Loading services...</p>
              </div>
            )}

            {/* Services List */}
            {!servicesLoading && companyServices.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded border-2 border-dashed">
                <p className="text-gray-500 text-lg">No services added yet</p>
                <button
                  onClick={() => setShowAddService(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add First Service
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {companyServices.map((service) => (
                  <div
                    key={service.id}
                    className="p-4 border rounded-lg hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600">{service.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {service.currency || 'CAD'} {service.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-3">{service.description}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Edit functionality can be added here
                          alert('Edit functionality coming soon');
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          <Link
            href="/admin/companies"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Companies
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
