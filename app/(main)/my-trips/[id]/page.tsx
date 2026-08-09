'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getTripDestinations,
  addTripDestination,
  updateTripDestination,
  deleteTripDestination,
} from '../../../lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type Trip = {
  id: number;
  title: string;
  date_range: string;
  destinations_count: number;
  budget: number;
  rating: number;
  status: string;
};

type Destination = {
  id: number;
  trip_id: number;
  name: string;
  description: string;
  day_number: number;
  budget: number;
  actual_cost: number;
};

// Simple modal for adding/editing a destination
function DestinationModal({
  isOpen,
  onClose,
  onSave,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Destination, 'id' | 'trip_id'>) => void;
  initial?: Destination | null;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dayNumber, setDayNumber] = useState(1);
  const [budget, setBudget] = useState(0);
  const [actualCost, setActualCost] = useState(0);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description);
      setDayNumber(initial.day_number);
      setBudget(initial.budget);
      setActualCost(initial.actual_cost);
    } else {
      setName('');
      setDescription('');
      setDayNumber(1);
      setBudget(0);
      setActualCost(0);
    }
  }, [initial, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4">
          {initial ? 'Edit Destination' : 'Add Destination'}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Paris"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Activities, notes..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <input
                type="number"
                min={1}
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget £</label>
              <input
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual £</label>
              <input
                type="number"
                min={0}
                value={actualCost}
                onChange={(e) => setActualCost(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!name.trim()) return alert('Please enter a destination name.');
              onSave({ name, description, day_number: dayNumber, budget, actual_cost: actualCost });
            }}
            className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = Number(params.id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);

  useEffect(() => {
    if (!tripId) return;
    fetchAll();
  }, [tripId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tripRes, destsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/trips/${tripId}`).then((r) => r.json()),
        getTripDestinations(tripId),
      ]);
      setTrip(tripRes.error ? null : tripRes);
      setDestinations(Array.isArray(destsRes) ? destsRes : []);
    } catch {
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDestination = async (data: Omit<Destination, 'id' | 'trip_id'>) => {
    try {
      await addTripDestination(tripId, data);
      setIsAddOpen(false);
      fetchAll();
    } catch {
      alert('Failed to add destination.');
    }
  };

  const handleEditDestination = async (data: Omit<Destination, 'id' | 'trip_id'>) => {
    if (!editingDest) return;
    try {
      await updateTripDestination(tripId, editingDest.id, data);
      setEditingDest(null);
      fetchAll();
    } catch {
      alert('Failed to update destination.');
    }
  };

  const handleDeleteDestination = async (destId: number) => {
    if (!confirm('Delete this destination?')) return;
    try {
      await deleteTripDestination(tripId, destId);
      fetchAll();
    } catch {
      alert('Failed to delete destination.');
    }
  };

  // Calculate total budget and actual cost from destinations
  const totalBudget = destinations.reduce((s, d) => s + d.budget, 0);
  const totalActual = destinations.reduce((s, d) => s + d.actual_cost, 0);

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  if (!trip) {
    return (
      <div className="text-center py-16 text-gray-400">
        Trip not found.{' '}
        <button onClick={() => router.back()} className="text-blue-500 underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{trip.title}</h1>
            <p className="text-gray-500 mt-1">
              {trip.date_range} · {destinations.length} destinations
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/my-trips`)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Edit
            </button>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Share
            </button>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Export
            </button>
            <button
              onClick={async () => {
                if (!confirm('Delete this trip?')) return;
                await fetch(`${API_BASE_URL}/trips/${tripId}`, { method: 'DELETE' });
                router.push('/my-trips');
              }}
              className="border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 font-medium mb-1">Dates</p>
            <p className="text-gray-800">{trip.date_range}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 font-medium mb-1">Destinations</p>
            <p className="text-gray-800">{destinations.length} destinations</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 font-medium mb-1">Budget</p>
            <p className="text-gray-800">
              £{trip.budget} / Spent £{totalActual}
            </p>
          </div>
        </div>

        {/* Itinerary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Itinerary</h2>
            <button
              onClick={() => setIsAddOpen(true)}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800"
            >
              + Add Destination
            </button>
          </div>

          {destinations.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No destinations yet. Click &quot;+ Add Destination&quot; to start planning.
            </div>
          ) : (
            <div className="space-y-4">
              {destinations.map((dest) => (
                <div key={dest.id} className="flex gap-4">
                  {/* Day label */}
                  <div className="w-20 shrink-0 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center py-3">
                    <span className="text-sm font-bold text-gray-700">Day {dest.day_number}</span>
                  </div>
                  {/* Destination detail */}
                  <div className="flex-1 border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{dest.name}</h3>
                      {dest.description && (
                        <p className="text-sm text-gray-500 mt-1">{dest.description}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        Budget £{dest.budget} / Actual £{dest.actual_cost}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-4">
                      <button
                        onClick={() => setEditingDest(dest)}
                        className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDestination(dest.id)}
                        className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-sm hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Destination Modal */}
      <DestinationModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddDestination}
      />

      {/* Edit Destination Modal */}
      <DestinationModal
        isOpen={!!editingDest}
        onClose={() => setEditingDest(null)}
        onSave={handleEditDestination}
        initial={editingDest}
      />
    </div>
  );
}
