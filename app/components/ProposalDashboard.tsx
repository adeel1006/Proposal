'use client';

import { useState, useEffect } from 'react';
import { ProposalItem, DEFAULT_ITEMS, getSelectedItemsTotal } from '@/app/lib/proposalTypes';

interface ProposalDashboardData {
  clientName: string;
  projectTitle: string;
  selectedItems: string[];
  items: ProposalItem[];
  notes: string;
  validUntil: string;
}

interface ProposalDashboardProps {
  items?: ProposalItem[];
  onItemsChange?: (data: ProposalDashboardData) => void;
}

export default function ProposalDashboard({ 
  items = DEFAULT_ITEMS,
  onItemsChange 
}: ProposalDashboardProps) {
  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [allItems, setAllItems] = useState(items);

  useEffect(() => {
    onItemsChange?.({ 
      clientName, 
      projectTitle, 
      selectedItems, 
      items: allItems, 
      notes, 
      validUntil 
    });
  }, [clientName, projectTitle, selectedItems, notes, validUntil, allItems, onItemsChange]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    const newItem: ProposalItem = {
      id: `item-${Date.now()}`,
      name: newItemName,
      description: newItemDesc,
      price: parseFloat(newItemPrice),
      category: 'Custom',
    };

    setAllItems([...allItems, newItem]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemDesc('');
    setShowAddForm(false);
  };

  const handleToggleItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteItem = (id: string) => {
    setAllItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedItems((prev) => prev.filter((i) => i !== id));
  };

  const total = getSelectedItemsTotal(selectedItems, allItems);
  const groupedItems = allItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ProposalItem[]>);

  return (
    <div className="space-y-6">
      {/* Client Info */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Client Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Project Title"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            placeholder="Valid Until"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <textarea
          placeholder="Additional Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded px-3 py-2 mt-4"
          rows={2}
        />
      </div>

      {/* Items Selection */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Select Services</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            + Add Item
          </button>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <form onSubmit={handleAddItem} className="mb-4 p-3 bg-gray-50 rounded border border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                placeholder="Item Name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="border rounded px-2 py-1"
                required
              />
              <input
                type="number"
                placeholder="Price"
                step="0.01"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="border rounded px-2 py-1"
                required
              />
              <input
                type="text"
                placeholder="Description"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                className="border rounded px-2 py-1 md:col-span-1"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Items by Category */}
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{category}</h3>
              <div className="space-y-2 ml-2">
                {categoryItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleToggleItem(item.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-600">{item.description}</div>
                      </div>
                      <div className="font-semibold text-sm whitespace-nowrap">
                        ${item.price.toFixed(2)}
                      </div>
                    </label>
                    {item.category === 'Custom' && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 text-xs rounded"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200">
          <div className="text-lg font-bold text-blue-900">
            Proposal Total: ${total.toFixed(2)}
          </div>
          <div className="text-sm text-blue-700">
            Selected {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
