'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, Upload, Download } from 'lucide-react';
import { Member } from '@/types';
import { useMembers } from '@/contexts/MembersContext';

export default function MembersPage() {
  const { members, refreshMembers } = useMembers();
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBatch, setFilterBatch] = useState<string>('');
  const [filterMembershipType, setFilterMembershipType] = useState<string>('');
  const [batches, setBatches] = useState<Array<{ batch: string | null; batchDisplay: string; count: number }>>([]);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors?: any[] } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    membership_type: 'GM' as 'GM' | 'LM' | 'FM' | 'OTHER',
    batch: '',
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/members/batches');
      const data = await response.json();
      if (data.batches && Array.isArray(data.batches)) {
        setBatches(data.batches);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  useEffect(() => {
    // Ensure members is an array before filtering
    if (!Array.isArray(members)) {
      setFilteredMembers([]);
      return;
    }
    
    let filtered = members;

    // Filter by batch
    if (filterBatch) {
      if (filterBatch === '(No Batch)') {
        filtered = filtered.filter(m => !m.batch || m.batch.trim() === '');
      } else {
        filtered = filtered.filter(m => m.batch === filterBatch);
      }
    }

    // Filter by membership type (supports pattern matching)
    if (filterMembershipType) {
      if (filterMembershipType === 'GM' || filterMembershipType === 'DM' || filterMembershipType === 'FM' || filterMembershipType === 'LM') {
        // Pattern matching for GM-*, DM-*, FM-*, LM-*
        filtered = filtered.filter(m => {
          const membershipType = m.membership_type || '';
          return membershipType.startsWith(`${filterMembershipType}-`);
        });
      } else {
        // Exact match for OTHER
        filtered = filtered.filter(m => m.membership_type === filterMembershipType);
      }
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member?.mobile?.includes(searchTerm) ||
          member?.membership_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member?.batch?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMembers(filtered);
  }, [searchTerm, members, filterBatch, filterMembershipType]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingMember
        ? `/api/members/${editingMember.id}`
        : '/api/members';
      const method = editingMember ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await refreshMembers(); // Refresh members from context
        await fetchBatches(); // Also refresh batches
        handleCloseModal();
        
        // Trigger custom event for real-time updates (context will also listen to this)
        window.dispatchEvent(new CustomEvent('memberUpdated'));
      }
    } catch (error) {
      console.error('Failed to save member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;

    try {
      await fetch(`/api/members/${id}`, { method: 'DELETE' });
      await refreshMembers(); // Refresh members from context
      await fetchBatches(); // Also refresh batches
      
      // Trigger custom event for real-time updates (context will also listen to this)
      window.dispatchEvent(new CustomEvent('memberUpdated'));
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      mobile: member.mobile,
      membership_type: member.membership_type,
      batch: member.batch || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setFormData({
      name: '',
      email: '',
      mobile: '',
      membership_type: 'GM',
      batch: '',
    });
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/members/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        await refreshMembers(); // Refresh members from context
        await fetchBatches(); // Also refresh batches
        
        // Trigger custom event for real-time updates (context will also listen to this)
        window.dispatchEvent(new CustomEvent('memberUpdated'));
        
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportResult(null);
        }, 3000);
      } else {
        alert(result.error || 'Failed to import members');
        setImportResult(result);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import members');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Create a simple Excel template
    const templateData = [
      ['Name', 'Email', 'Mobile', 'Membership Type', 'Batch', 'Image URL'],
      ['John Doe', 'john@example.com', '+1234567890', 'GM', 'Batch2023', ''],
      ['Jane Smith', 'jane@example.com', '+1234567891', 'LM', 'Batch2022', ''],
    ];

    // Create CSV content
    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <Upload className="w-5 h-5" />
            Import Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Member
          </button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, mobile, batch, or membership type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Batch
              </label>
              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Batches</option>
                <option value="(No Batch)">No Batch</option>
                {batches.map((b) => (
                  <option key={b.batch || '(No Batch)'} value={b.batch || '(No Batch)'}>
                    {b.batchDisplay} ({b.count} members)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Membership Type
              </label>
              <select
                value={filterMembershipType}
                onChange={(e) => setFilterMembershipType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Types</option>
                <option value="GM">GM (GM-*)</option>
                <option value="DM">DM (DM-*)</option>
                <option value="FM">FM (FM-*)</option>
                <option value="LM">LM (LM-*)</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterBatch('');
                  setFilterMembershipType('');
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-blue-600">{filteredMembers.length}</span> of <span className="font-semibold">{members.length}</span> members
              {filteredMembers.length !== members.length && (
                <span className="ml-2 text-xs text-gray-500">
                  ({members.length - filteredMembers.length} hidden by filters)
                </span>
              )}
            </div>
            {(searchTerm || filterBatch || filterMembershipType) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterBatch('');
                  setFilterMembershipType('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Image
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mobile
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Membership
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.isArray(filteredMembers) && filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.image_url ? (
                      <img
                        src={member.image_url}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                        {member.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.mobile}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {member.membership_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.batch || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  {Array.isArray(filteredMembers) ? 'No members found' : 'Loading members...'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingMember ? 'Edit Member' : 'Add Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Membership Type
                </label>
                <select
                  value={formData.membership_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      membership_type: e.target.value as 'GM' | 'LM' | 'FM' | 'OTHER',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="GM">GM</option>
                  <option value="LM">LM</option>
                  <option value="FM">FM</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch
                </label>
                <input
                  type="text"
                  value={formData.batch}
                  onChange={(e) =>
                    setFormData({ ...formData, batch: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Import Members from Excel</h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">Excel File Format:</h3>
              <p className="text-sm text-gray-700 mb-2">
                Your Excel file should have the following columns:
              </p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li><strong>Name</strong> (required) - Full name of the member</li>
                <li><strong>Email</strong> (required) - Email address</li>
                <li><strong>Mobile</strong> (required) - Phone number</li>
                <li><strong>Membership Type</strong> - GM, LM, FM, or OTHER (defaults to GM)</li>
                <li><strong>Batch</strong> - Batch identifier (optional)</li>
                <li><strong>Image URL</strong> - URL or base64 image data (optional)</li>
              </ul>
              <button
                onClick={downloadTemplate}
                className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <Download className="w-4 h-4" />
                Download CSV Template
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Excel File (.xlsx or .xls)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {importFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {importResult && (
              <div className={`mb-6 p-4 rounded-lg ${
                importResult.errors && importResult.errors.length > 0
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-green-50 border border-green-200'
              }`}>
                <p className="font-semibold">
                  {importResult.imported} members imported successfully
                </p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Errors:</p>
                    <ul className="text-sm list-disc list-inside mt-1">
                      {importResult.errors.slice(0, 5).map((err: any, idx: number) => (
                        <li key={idx}>Row {err.row}: {err.error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... and {importResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-green-400"
              >
                {importing ? 'Importing...' : 'Import Members'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
