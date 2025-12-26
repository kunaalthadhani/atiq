import { useState, useEffect } from 'react';
import { Plus, Search, Home, X, Edit2, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { Unit, Property } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function Units() {
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const unitsData = await dataService.getUnits(undefined, user?.role, user?.id);
      const propertiesData = await dataService.getProperties(user?.role);
      setUnits(unitsData);
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error loading units data:', error);
      setUnits([]);
      setProperties([]);
    }
  };

  const filteredUnits = units.filter(unit => {
    const matchesSearch = searchQuery
      ? unit.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.type.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const matchesProperty = filterProperty === 'all' || unit.propertyId === filterProperty;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'occupied' && unit.isOccupied) ||
      (filterStatus === 'vacant' && !unit.isOccupied);

    return matchesSearch && matchesProperty && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);

      const unitData = {
        propertyId: formData.get('propertyId') as string,
        unitNumber: formData.get('unitNumber') as string,
        type: formData.get('type') as any,
        bedrooms: parseInt(formData.get('bedrooms') as string),
        bathrooms: parseInt(formData.get('bathrooms') as string),
        squareFeet: parseInt(formData.get('squareFeet') as string),
        monthlyRent: parseFloat(formData.get('monthlyRent') as string),
        isOccupied: false,
        images: (formData.get('images') as string).split('\n').filter(Boolean),
      };

      if (editingUnit) {
        await dataService.updateUnit(editingUnit.id, unitData);
      } else {
        const result = await dataService.createUnit(unitData, user?.id, user?.role);
        if ('requiresApproval' in result) {
          alert(result.message || 'Unit creation request submitted for approval');
        }
      }

      await loadData();
      setShowForm(false);
      setEditingUnit(null);
    } catch (error) {
      console.error('Error saving unit:', error);
      alert('Failed to save unit. Please try again.');
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this unit?')) {
      try {
        const success = await dataService.deleteUnit(id);
        if (success) {
          await loadData();
        } else {
          alert('Cannot delete unit with associated contracts');
        }
      } catch (error) {
        console.error('Error deleting unit:', error);
        alert('Failed to delete unit. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUnit(null);
  };

  const getPropertyName = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.name || 'Unknown';
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Units</h1>
          <p className="text-gray-600 mt-1">Manage rental units across properties</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Unit
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <select
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">All Properties</option>
          {properties.map(property => (
            <option key={property.id} value={property.id}>{property.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="occupied">Occupied</option>
          <option value="vacant">Vacant</option>
        </select>
      </div>

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUnits.map((unit) => (
          <div key={unit.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Unit Image */}
            <div className="h-40 bg-gradient-to-br from-primary-400 to-primary-600 relative">
              {unit.images.length > 0 ? (
                <img
                  src={unit.images[0]}
                  alt={unit.unitNumber}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Home className="w-12 h-12 text-white opacity-50" />
                </div>
              )}
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                <span className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold flex items-center',
                  unit.isOccupied
                    ? 'bg-danger-100 text-danger-700'
                    : 'bg-success-100 text-success-700'
                )}>
                  {unit.isOccupied ? (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Occupied
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Vacant
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Unit Info */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Unit {unit.unitNumber}</h3>
                  <p className="text-sm text-gray-600">{getPropertyName(unit.propertyId)}</p>
                  {unit.approvalStatus === 'pending' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending Approval
                    </span>
                  )}
                </div>
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded">
                  {unit.type.toUpperCase()}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Bedrooms:</span>
                  <span className="font-medium text-gray-900">{unit.bedrooms}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bathrooms:</span>
                  <span className="font-medium text-gray-900">{unit.bathrooms}</span>
                </div>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span className="font-medium text-gray-900">{unit.squareFeet} sq ft</span>
                </div>
              </div>

              {/* Rent */}
              <div className="pt-4 border-t border-gray-200 mb-4">
                <p className="text-sm text-gray-600 mb-1">Monthly Rent</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(unit.monthlyRent)}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(unit)}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(unit.id)}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-danger-300 text-danger-600 rounded-lg hover:bg-danger-50 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <div className="text-center py-12">
          <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No units found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try a different search term' : 'Get started by adding your first unit'}
          </p>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingUnit ? 'Edit Unit' : 'Add New Unit'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property *
                </label>
                <select
                  name="propertyId"
                  defaultValue={editingUnit?.propertyId}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select Property</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Number *
                  </label>
                  <input
                    type="text"
                    name="unitNumber"
                    defaultValue={editingUnit?.unitNumber}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    name="type"
                    defaultValue={editingUnit?.type}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="studio">Studio</option>
                    <option value="1BR">1 Bedroom</option>
                    <option value="2BR">2 Bedrooms</option>
                    <option value="3BR">3 Bedrooms</option>
                    <option value="4BR">4 Bedrooms</option>
                    <option value="penthouse">Penthouse</option>
                    <option value="villa">Villa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrooms *
                  </label>
                  <input
                    type="number"
                    name="bedrooms"
                    defaultValue={editingUnit?.bedrooms}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bathrooms *
                  </label>
                  <input
                    type="number"
                    name="bathrooms"
                    defaultValue={editingUnit?.bathrooms}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Square Feet *
                  </label>
                  <input
                    type="number"
                    name="squareFeet"
                    defaultValue={editingUnit?.squareFeet}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rent (AED) *
                </label>
                <input
                  type="number"
                  name="monthlyRent"
                  defaultValue={editingUnit?.monthlyRent}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URLs (one per line)
                </label>
                <textarea
                  name="images"
                  defaultValue={editingUnit?.images.join('\n')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://example.com/image1.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">Enter image URLs, one per line</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  {editingUnit ? 'Update Unit' : 'Add Unit'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



