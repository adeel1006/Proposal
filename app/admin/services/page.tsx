'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProposalItem } from '@/app/lib/proposalTypes';
import { PageHeaderSkeleton, SelectSkeleton, ServiceListSkeleton } from '@/app/components/LoadingSkeletons';
import { useCompanies } from '@/lib/hooks/useCompanies';
import { useServices } from '@/lib/hooks/useServices';

type ServiceFormState = ProposalItem & {
  companyId: string;
};

const emptyService: ServiceFormState = {
  id: '',
  companyId: '',
  name: '',
  description: '',
  price: 0,
  currency: 'USD',
  category: 'General',
  quantity: 1,
};

export default function ServicesPage() {
  const { companies, loading: companiesLoading } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const { services: companyServices, loading: servicesLoading, createService, updateService, deleteService } = useServices(selectedCompanyId);
  const [showAddService, setShowAddService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newService, setNewService] = useState<ServiceFormState>(emptyService);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || null;

  const setTimedMessage = (nextMessage: { type: 'success' | 'error'; text: string }) => {
    setMessage(nextMessage);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find((item) => item.id === companyId) || null;
    setSelectedCompanyId(companyId);
    setShowAddService(false);
    setEditingServiceId(null);
    setNewService({
      ...emptyService,
      companyId,
      currency: company?.currency || 'USD',
    });
  };

  const resetServiceForm = () => {
    setShowAddService(false);
    setEditingServiceId(null);
    setNewService({
      ...emptyService,
      companyId: selectedCompanyId,
      currency: selectedCompany?.currency || 'USD',
    });
  };

  const openAddServiceForm = () => {
    setEditingServiceId(null);
    setNewService({
      ...emptyService,
      companyId: selectedCompanyId,
      currency: selectedCompany?.currency || 'USD',
    });
    setShowAddService(true);
  };

  const handleEditService = (service: ProposalItem) => {
    setEditingServiceId(service.id);
    setNewService({
      id: service.id,
      companyId: selectedCompanyId,
      name: service.name,
      description: service.description,
      price: service.price,
      currency: service.currency || selectedCompany?.currency || 'USD',
      category: service.category || 'General',
      quantity: service.quantity || 1,
    });
    setShowAddService(true);
  };

  const handleSaveService = () => {
    if (!newService.name.trim() || !newService.description.trim()) {
      setTimedMessage({ type: 'error', text: 'Please fill in service name and description' });
      return;
    }

    if (!selectedCompanyId) {
      setTimedMessage({ type: 'error', text: 'Please select a company first' });
      return;
    }

    const payload: Omit<ProposalItem, 'id'> & { companyId: string } = {
      companyId: selectedCompanyId,
      name: newService.name.trim(),
      description: newService.description.trim(),
      price: Number.isFinite(newService.price) ? newService.price : 0,
      currency: selectedCompany?.currency || 'USD',
      category: newService.category?.trim() || 'General',
      quantity: newService.quantity || 1,
    };

    const saveAction = editingServiceId
      ? updateService({
          ...payload,
          id: editingServiceId,
        })
      : createService(payload);

    saveAction
      .then(() => {
        setTimedMessage({
          type: 'success',
          text: editingServiceId ? 'Service updated successfully' : 'Service added successfully',
        });
        resetServiceForm();
      })
      .catch(() => {
        setTimedMessage({
          type: 'error',
          text: editingServiceId ? 'Failed to update service' : 'Failed to add service',
        });
      });
  };

  const handleDeleteService = (id: string) => {
    if (window.confirm('Delete this service?')) {
      deleteService(id)
        .then(() => {
          setTimedMessage({ type: 'success', text: 'Service deleted successfully' });
        })
        .catch(() => {
          setTimedMessage({ type: 'error', text: 'Failed to delete service' });
        });
    }
  };

  if (companiesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <PageHeaderSkeleton />
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <SelectSkeleton />
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-6 flex items-center justify-between">
              <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-32 animate-pulse rounded bg-slate-200" />
            </div>
            <ServiceListSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Services Dashboard</h1>
          <p className="text-gray-600">Manage services/products for each company</p>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg p-4 ${
              message.type === 'success'
                ? 'border border-green-300 bg-green-100 text-green-800'
                : 'border border-red-300 bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select Company
          </label>
          {companies.length === 0 ? (
            <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
              No companies found.{' '}
              <Link href="/admin/companies" className="font-medium text-blue-600 hover:underline">
                Create a company first
              </Link>
            </div>
          ) : (
            <select
              value={selectedCompanyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="w-full rounded border px-4 py-2 text-lg"
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

        {selectedCompany && (
          <div className="mb-6 rounded-lg border-l-4 border-blue-600 bg-white p-6 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">Business Name</p>
                <p className="text-lg font-bold text-gray-900">{selectedCompany.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Currency</p>
                <p className="text-lg font-bold text-gray-900">{selectedCompany.currency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="truncate text-gray-900">{selectedCompany.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-gray-900">{selectedCompany.mobileNumber}</p>
              </div>
            </div>

            {(selectedCompany.instagram || selectedCompany.linkedin || selectedCompany.twitter || selectedCompany.facebook || selectedCompany.youtube || selectedCompany.pinterest) && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-sm text-gray-600">Social Media</p>
                <div className="flex flex-wrap gap-3">
                  {selectedCompany.instagram && (
                    <a href={selectedCompany.instagram} target="_blank" rel="noopener noreferrer" className="font-medium text-pink-600 hover:text-pink-800">
                      Instagram
                    </a>
                  )}
                  {selectedCompany.linkedin && (
                    <a href={selectedCompany.linkedin} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 hover:text-blue-900">
                      LinkedIn
                    </a>
                  )}
                  {selectedCompany.twitter && (
                    <a href={selectedCompany.twitter} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-400 hover:text-blue-600">
                      Twitter
                    </a>
                  )}
                  {selectedCompany.facebook && (
                    <a href={selectedCompany.facebook} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-800">
                      Facebook
                    </a>
                  )}
                  {selectedCompany.youtube && (
                    <a href={selectedCompany.youtube} target="_blank" rel="noopener noreferrer" className="font-medium text-red-600 hover:text-red-800">
                      YouTube
                    </a>
                  )}
                  {selectedCompany.pinterest && (
                    <a href={selectedCompany.pinterest} target="_blank" rel="noopener noreferrer" className="font-medium text-red-700 hover:text-red-900">
                      Pinterest
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

        {selectedCompanyId && (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Services/Products</h2>
              <button
                onClick={() => (showAddService ? resetServiceForm() : openAddServiceForm())}
                className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
              >
                {showAddService ? 'Cancel' : '+ Add Service'}
              </button>
            </div>

            {showAddService && (
              <div className="mb-6 rounded-lg border-2 border-dashed bg-gray-50 p-4">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingServiceId ? 'Edit Service' : 'Add Service'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {editingServiceId
                        ? 'Update the selected service details.'
                        : 'Create a reusable service for the selected company.'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                    {selectedCompany?.currency || 'USD'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Service Name *
                    </label>
                    <input
                      type="text"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      className="w-full rounded border px-3 py-2"
                      placeholder="e.g., Web Design"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <input
                      type="text"
                      value={newService.category || ''}
                      onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                      className="w-full rounded border px-3 py-2"
                      placeholder="e.g., Design"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Description *
                    </label>
                    <textarea
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      className="w-full rounded border px-3 py-2"
                      placeholder="Describe this service..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newService.price}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          price: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded border px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={selectedCompany?.currency || 'USD'}
                      disabled
                      className="w-full rounded border bg-gray-100 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleSaveService}
                    className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    {editingServiceId ? 'Update Service' : 'Save Service'}
                  </button>
                  <button
                    onClick={resetServiceForm}
                    className="rounded bg-gray-400 px-4 py-2 text-white hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {servicesLoading && <ServiceListSkeleton />}

            {!servicesLoading && companyServices.length === 0 && (
              <div className="rounded border-2 border-dashed bg-gray-50 py-12 text-center">
                <p className="text-lg text-gray-500">No services added yet</p>
                <button
                  onClick={openAddServiceForm}
                  className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Add First Service
                </button>
              </div>
            )}

            {!servicesLoading && companyServices.length > 0 && (
              <div className="space-y-3">
                {companyServices.map((service) => (
                  <div key={service.id} className="rounded-lg border p-4 transition hover:shadow-md">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600">{service.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {service.currency || 'CAD'} {service.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <p className="mb-3 text-gray-700">{service.description}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditService(service)}
                        className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
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

        <div className="mt-8 flex gap-3">
          <Link href="/admin/companies" className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
            Back to Companies
          </Link>
          <Link href="/" className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
