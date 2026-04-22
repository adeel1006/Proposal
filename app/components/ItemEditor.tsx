'use client';

import { useState } from 'react';
import { ProposalItem } from '@/app/lib/proposalTypes';

interface ItemEditorProps {
  item: ProposalItem;
  onSave: (item: ProposalItem) => void;
  onDelete: (id: string) => void;
  isNew?: boolean;
}

export default function ItemEditor({ item, onSave, onDelete, isNew }: ItemEditorProps) {
  const [editedItem, setEditedItem] = useState<ProposalItem>(item);
  const [isEditing, setIsEditing] = useState(isNew);

  const handleChange = (field: keyof ProposalItem, value: string | number) => {
    setEditedItem((prev) => ({
      ...prev,
      [field]:
        field === 'price' || field === 'quantity'
          ? parseFloat(String(value)) || 0
          : value,
    }));
  };

  const handleSave = () => {
    onSave(editedItem);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="border rounded p-4 bg-gray-50 hover:bg-gray-100 transition">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Price:</span>
            <div className="font-semibold">{item.currency || 'USD'} {item.price.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-600">Qty:</span>
            <div className="font-semibold">{item.quantity || 1}</div>
          </div>
          <div>
            <span className="text-gray-600">Subtotal:</span>
            <div className="font-semibold">{item.currency || 'USD'} {(item.price * (item.quantity || 1)).toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-600">Category:</span>
            <div className="font-semibold">{item.category || 'Other'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-blue-400 rounded p-4 bg-blue-50">
      <h3 className="font-semibold text-lg mb-4">Edit Item</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
            <input
              type="text"
              value={editedItem.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={editedItem.category || ''}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Development"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={editedItem.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
            <input
              type="number"
              step="0.01"
              value={editedItem.price}
              onChange={(e) => handleChange('price', e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={editedItem.currency || 'USD'}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
              <option value="QAR">QAR</option>
              <option value="PKR">PKR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              step="1"
              min="1"
              value={editedItem.quantity || 1}
              onChange={(e) => handleChange('quantity', e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
            <div className="border rounded px-3 py-2 bg-gray-100 font-semibold">
              {editedItem.currency || 'USD'} {(editedItem.price * (editedItem.quantity || 1)).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditedItem(item);
              setIsEditing(false);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </button>
          {!isNew && (
            <button
              onClick={() => {
                onDelete(item.id);
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ml-auto"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
