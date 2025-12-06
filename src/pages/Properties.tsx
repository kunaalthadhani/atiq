import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Building2, MapPin, Home, X, Edit2, Trash2, ArrowRight, Upload, Trash, ChevronDown } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { Property, Unit } from '@/types';

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);
  const [unitSearch, setUnitSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitImages, setUnitImages] = useState<string[]>([]);
  const unitFileInputRef = useRef<HTMLInputElement>(null);
  const [unitPropertyId, setUnitPropertyId] = useState<string | null>(null);
  const [isNewUnit, setIsNewUnit] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const [propertiesData, unitsData] = await Promise.all([
        dataService.getProperties(),
        dataService.getUnits()
      ]);
      setProperties(propertiesData);
      setUnits(unitsData);
    } catch (error) {
      console.error('Error loading properties:', error);
      setProperties([]);
      setUnits([]);
    }
  };

  // Client-side filtering (simpler than async search)
  const filteredProperties = properties.filter(property => {
    // Text search
    const lowerQuery = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      property.name.toLowerCase().includes(lowerQuery) ||
      property.address.toLowerCase().includes(lowerQuery) ||
      property.city.toLowerCase().includes(lowerQuery) ||
      property.shortCode?.toLowerCase().includes(lowerQuery);
    
    // Status filter
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' 
        ? (property.isActive ?? true)
        : !(property.isActive ?? true);
    
    return matchesSearch && matchesStatus;
  });

  // Generate property code from name (e.g., "Marina Heights Tower" -> "MHT-001")
  const generatePropertyCode = (name: string, index: number): string => {
    const words = name.split(' ');
    const initials = words.map(w => w[0]?.toUpperCase() || '').join('');
    const code = initials.length >= 3 ? initials.substring(0, 3) : initials.padEnd(3, 'X');
    return `${code}-${String(index + 1).padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);

      const propertyData = {
        name: formData.get('name') as string,
        address: formData.get('address') as string,
        addressLine2: (formData.get('addressLine2') as string) || undefined,
        city: formData.get('city') as string,
        country: formData.get('country') as string,
        images: uploadedImages,
        shortCode: (formData.get('shortCode') as string) || undefined,
        state: (formData.get('state') as string) || undefined,
        postalCode: (formData.get('postalCode') as string) || undefined,
        notes: (formData.get('notes') as string) || undefined,
        isActive: isActive,
      };

      if (editingProperty) {
        await dataService.updateProperty(editingProperty.id, propertyData);
      } else {
        await dataService.createProperty(propertyData);
      }

      await loadProperties();
      setShowForm(false);
      setEditingProperty(null);
      setUploadedImages([]);
      setIsActive(true);
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Failed to save property. Please try again.');
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setUploadedImages(property.images || []);
    setIsActive(property.isActive ?? true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      try {
        const success = await dataService.deleteProperty(id);
        if (success) {
          await loadProperties();
        } else {
          alert('Cannot delete property with associated units');
        }
      } catch (error) {
        console.error('Error deleting property:', error);
        alert('Failed to delete property. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProperty(null);
    setUploadedImages([]);
    setIsActive(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (uploadedImages.length >= 5) {
        alert('Maximum 5 images allowed');
        return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const openUnitModal = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitImages(unit.images || []);
    setUnitPropertyId(unit.propertyId);
    setIsNewUnit(false);
  };

  const closeUnitModal = () => {
    setEditingUnit(null);
    setUnitImages([]);
    setUnitPropertyId(null);
    setIsNewUnit(false);
    if (unitFileInputRef.current) unitFileInputRef.current.value = '';
  };

  const handleUnitImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (unitImages.length >= 5) {
        alert('Maximum 5 images allowed for a unit');
        return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUnitImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });

    if (unitFileInputRef.current) {
      unitFileInputRef.current.value = '';
    }
  };

  const handleRemoveUnitImage = (index: number) => {
    setUnitImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleViewDetails = (property: Property) => {
    setViewingProperty(property);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 text-sm mt-1">
            {properties.length} registered {properties.length === 1 ? 'property' : 'properties'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProperty(null);
            setUploadedImages([]);
            setIsActive(true);
            setShowForm(true);
          }}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Not Active</option>
        </select>
      </div>

      {/* Properties List */}
      <div className="space-y-3">
        {filteredProperties.map((property, index) => {
          const propertyUnits = units.filter(u => u.propertyId === property.id);
          const occupiedUnits = propertyUnits.filter(u => u.isOccupied).length;
          const propertyCode = generatePropertyCode(property.name, index);

          return (
            <div key={property.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                {/* Left: Icon/Image */}
                <div className="flex items-center flex-1 min-w-0">
                  {property.images.length > 0 ? (
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      className="w-12 h-12 rounded-lg object-cover mr-4 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mr-4 flex-shrink-0">
                      <Building2 className="w-6 h-6 text-green-600" />
                    </div>
                  )}

                  {/* Property Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1 flex-wrap gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        {propertyCode}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        (property.isActive ?? true)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {(property.isActive ?? true) ? 'Active' : 'Not Active'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                      <span className="truncate">{property.address}, {property.city}</span>
                    </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Home className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        <span>{propertyUnits.length} units {occupiedUnits} occupied</span>
                      </div>
                  </div>
                </div>

                {/* Right: Action Icons */}
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(property)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setExpandedPropertyId(
                        expandedPropertyId === property.id ? null : property.id,
                      )
                    }
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={expandedPropertyId === property.id ? 'Hide Units' : 'Show Units'}
                  >
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${
                        expandedPropertyId === property.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded units view */}
              {expandedPropertyId === property.id && (
                <div className="mt-4 bg-gray-50 rounded-lg border border-gray-100 px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          Apartments ({propertyUnits.length})
                        </h3>
                      </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search units..."
                          value={unitSearch}
                          onChange={(e) => setUnitSearch(e.target.value)}
                          className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-56"
                        />
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        onClick={() => {
                          setIsNewUnit(true);
                          setEditingUnit(null);
                          setUnitImages([]);
                          setUnitPropertyId(property.id);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Unit
                      </button>
                    </div>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {propertyUnits
                        .filter((unit) => {
                        if (!unitSearch) return true;
                        const q = unitSearch.toLowerCase();
                        return (
                          unit.unitNumber.toLowerCase().includes(q) ||
                          unit.type.toLowerCase().includes(q)
                        );
                      })
                      .map((unit) => {
                        // Derive floor from unit number if possible (e.g. 101 -> Floor 1)
                        const match = unit.unitNumber.match(/\d+/);
                        const number = match ? match[0] : '';
                        const floor =
                          number.length >= 2 ? `Floor ${number[0]}` : 'Floor 1';

                        return (
                          <div
                            key={unit.id}
                            className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col justify-between"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mr-2">
                                  <Home className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    Unit {unit.unitNumber}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {floor} · {unit.type}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Edit unit"
                                  onClick={() => openUnitModal(unit)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete unit"
                                  onClick={() =>
                                    alert('Delete this unit from the Units page for now.')
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  unit.isOccupied
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-green-50 text-green-700'
                                }`}
                              >
                                {unit.isOccupied ? 'Occupied' : 'Vacant'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try a different search term' : 'Get started by adding your first property'}
          </p>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {/* First row: name + short code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingProperty?.name}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Marina Heights Tower"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Code *
                  </label>
                  <input
                    type="text"
                    name="shortCode"
                    defaultValue={editingProperty?.shortCode}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="MHT-001"
                  />
                </div>
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingProperty?.address}
                  required
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="45 Marina Walk"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  defaultValue={editingProperty?.addressLine2}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Suite 101"
                />
              </div>

              {/* City / State */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    defaultValue={editingProperty?.city}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Dubai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    defaultValue={editingProperty?.state}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Dubai"
                  />
                </div>
              </div>

              {/* Postal Code / Country */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    defaultValue={editingProperty?.postalCode}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="00000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    name="country"
                    defaultValue={editingProperty?.country}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="UAE"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  defaultValue={editingProperty?.notes}
                  rows={3}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Any notes about this property..."
                />
              </div>

              {/* Property Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Images
                </label>
                {uploadedImages.length > 0 && (
                  <div className="mb-2">
                    <div className="relative inline-block">
                      <img
                        src={uploadedImages[0]}
                        alt="Property"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(0)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {uploadedImages.length}/5 images
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add
                </label>
                {uploadedImages.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    No images uploaded yet
                  </p>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 pt-1">
                <label className="text-sm font-medium text-gray-700">
                  Active
                </label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    isActive ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  {editingProperty ? 'Update' : 'Add Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Property Details</h2>
              <button
                onClick={() => setViewingProperty(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                {viewingProperty.images.length > 0 ? (
                  <img
                    src={viewingProperty.images[0]}
                    alt={viewingProperty.name}
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <Building2 className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{viewingProperty.name}</h3>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{viewingProperty.address}, {viewingProperty.city}, {viewingProperty.country}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Units</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {units.filter(u => u.propertyId === viewingProperty.id).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Occupied Units</p>
                    <p className="text-2xl font-bold text-green-600">
                      {units.filter(u => u.propertyId === viewingProperty.id && u.isOccupied).length}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Units</h4>
                  <div className="space-y-2">
                    {units.filter(u => u.propertyId === viewingProperty.id).map(unit => (
                      <div key={unit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Unit {unit.unitNumber}</p>
                          <p className="text-sm text-gray-600">{unit.type} • {unit.squareFeet} sq ft</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          unit.isOccupied 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {unit.isOccupied ? 'Occupied' : 'Vacant'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Unit Modal */}
      {(editingUnit || unitPropertyId) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Apartment</h2>
              <button
                onClick={closeUnitModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              className="p-5 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const formData = new FormData(e.currentTarget as HTMLFormElement);
                      const unitNumber = (formData.get('unitNumber') as string).trim();
                      const floor = (formData.get('floor') as string).trim();
                      const type = formData.get('type') as Unit['type'];
                      const status = formData.get('status') as 'vacant' | 'occupied';
                      const notes = (formData.get('unitNotes') as string) || undefined;

                      const isOccupied = status === 'occupied';

                      if (editingUnit && !isNewUnit) {
                        await dataService.updateUnit(editingUnit.id, {
                          unitNumber,
                          floor,
                          type,
                          isOccupied,
                          images: unitImages,
                          notes,
                        });
                      } else if (unitPropertyId && unitNumber) {
                        await dataService.createUnit({
                          propertyId: unitPropertyId,
                          unitNumber,
                          type,
                          floor,
                          bedrooms: 1,
                          bathrooms: 1,
                          squareFeet: 0,
                          monthlyRent: 0,
                          isOccupied,
                          images: unitImages,
                          notes,
                        });
                      }

                      await loadProperties();
                      closeUnitModal();
                    } catch (error) {
                      console.error('Error saving unit:', error);
                      alert('Failed to save unit. Please try again.');
                    }
                  }}
            >
              {/* Unit number & floor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Number *
                  </label>
                  <input
                    type="text"
                    name="unitNumber"
                      defaultValue={editingUnit?.unitNumber || ''}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="text"
                    name="floor"
                      defaultValue={editingUnit?.floor?.toString() || ''}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    name="type"
                    defaultValue={editingUnit?.type || '1BR'}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="studio">Studio</option>
                    <option value="1BR">1BR</option>
                    <option value="2BR">2BR</option>
                    <option value="3BR">3BR</option>
                    <option value="4BR">4BR</option>
                    <option value="penthouse">Penthouse</option>
                    <option value="villa">Villa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingUnit?.isOccupied ? 'occupied' : 'vacant'}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                  </select>
                </div>
              </div>

              {/* Unit images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Images
                </label>
                {unitImages.length > 0 && (
                  <div className="mb-2 flex gap-2 flex-wrap">
                    {unitImages.map((img, idx) => (
                      <div key={idx} className="relative inline-block">
                        <img
                          src={img}
                          alt={`Unit ${editingUnit.unitNumber}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveUnitImage(idx)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={unitFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUnitImageUpload}
                  className="hidden"
                  id="unit-image-upload"
                />
                <label
                  htmlFor="unit-image-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors text-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {unitImages.length}/5 images
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="unitNotes"
                  defaultValue={editingUnit?.notes}
                  rows={3}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={closeUnitModal}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
