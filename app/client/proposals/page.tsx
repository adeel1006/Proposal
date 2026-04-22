'use client';

import { useState, useEffect } from 'react';
import ClientProposalView from '@/app/components/ClientProposalView';
import { Proposal, CompanyBranding } from '@/app/lib/proposalTypes';

export default function ClientProposalPage() {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [company, setCompany] = useState<CompanyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadProposalAndCompany = async () => {
      const savedProposal = localStorage.getItem('currentProposal');

      if (savedProposal) {
        try {
          const parsedProposal = JSON.parse(savedProposal);
          setProposal(parsedProposal);

          if (parsedProposal.companyId) {
            const response = await fetch('/api/companies');
            const result = await response.json();
            if (response.ok && Array.isArray(result.data)) {
              const foundCompany = result.data.find(
                (c: CompanyBranding) => c.id === parsedProposal.companyId
              );
              if (foundCompany) {
                setCompany(foundCompany);
              }
            }
          }
        } catch (e) {
          console.error('Error loading proposal:', e);
        }
      }

      setLoading(false);
      setIsHydrated(true);
    };

    loadProposalAndCompany();
  }, []);

  const handleAccept = () => {
    if (proposal) {
      setResponseMessage('✅ Proposal accepted! We will be in touch soon.');
      setTimeout(() => setResponseMessage(''), 5000);
      // In a real app, you would send this to your backend
      console.log('Proposal accepted:', proposal.id);
    }
  };

  const handleReject = () => {
    if (proposal) {
      setResponseMessage('❌ Proposal declined. Contact us if you would like to discuss further.');
      setTimeout(() => setResponseMessage(''), 5000);
      // In a real app, you would send this to your backend
      console.log('Proposal rejected:', proposal.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">Loading proposal...</div>
        </div>
      </div>
    );
  }

  if (!isHydrated) {
    return null;
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md text-center">
          <div className="text-4xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Proposal Found</h1>
          <p className="text-gray-600 mb-4">
            This proposal does not exist or has not been shared with you yet.
          </p>
          <p className="text-sm text-gray-500">
            Contact your service provider for a proposal link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-blue-600 text-white p-6 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-2">Project Proposal</h1>
          <p className="text-blue-100">{proposal.projectTitle}</p>
        </div>

        {responseMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            responseMessage.startsWith('✅')
              ? 'bg-green-100 text-green-900 border border-green-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}>
            {responseMessage}
          </div>
        )}

        {/* Client View */}
        <ClientProposalView
          clientName={proposal.clientName}
          clientEmail={proposal.clientEmail}
          clientPhoneNumber={proposal.clientPhoneNumber}
          projectTitle={proposal.projectTitle}
          projectDescription={proposal.projectDescription}
          selectedItems={proposal.selectedItems}
          items={proposal.items}
          notes={proposal.notes}
          proposalDate={proposal.proposalDate}
          createdAt={proposal.createdAt}
          company={company || undefined}
          terms={proposal.terms}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}
