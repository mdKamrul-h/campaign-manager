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
  const [importResult, setImportResult] = useState<{ 
    imported: number; 
    updated?: number;
    skipped?: number;
    total?: number;
    errors?: any[]; 
    skippedDetails?: Array<{ row: number; name: string; email: string; mobile?: string; reason: string }>;
    requiresConfirmation?: boolean;
    duplicateNames?: Array<{ row: number; name: string; email: string; mobile: string; firstOccurrenceRow: number; reason: string }>;
    message?: string;
    validMembersCount?: number;
  } | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [editingDuplicateName, setEditingDuplicateName] = useState<number | null>(null);
  const [editedDuplicateNames, setEditedDuplicateNames] = useState<Array<{ row: number; name: string; email: string; mobile: string; firstOccurrenceRow: number; reason: string }>>([]);

  const [formData, setFormData] = useState({
    name: '',
    name_bangla: '',
    email: '',
    mobile: '',
    membership_type: '',
    batch: '',
    group: '',
    roll_no: '',
    blood_group: '',
    birthday_month: '',
    birthday_day: '',
    higher_study_1: '',
    hs_1_institute: '',
    higher_study_2: '',
    hs_2_institute: '',
    school: '',
    home_district: '',
    organization: '',
    position: '',
    department: '',
    profession: '',
    nrb_country: '',
    living_in_area: '',
    job_location: '',
    other_club_member: '',
    remarks: '',
    image_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

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
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member?.name?.toLowerCase().includes(searchLower) ||
          member?.name_bangla?.toLowerCase().includes(searchLower) ||
          member?.email?.toLowerCase().includes(searchLower) ||
          member?.mobile?.includes(searchTerm) ||
          member?.membership_type?.toLowerCase().includes(searchLower) ||
          member?.batch?.toLowerCase().includes(searchLower) ||
          member?.group?.toLowerCase().includes(searchLower) ||
          member?.roll_no?.toLowerCase().includes(searchLower) ||
          member?.blood_group?.toLowerCase().includes(searchLower) ||
          member?.job_location?.toLowerCase().includes(searchLower) ||
          member?.higher_study_1?.toLowerCase().includes(searchLower) ||
          member?.hs_1_institute?.toLowerCase().includes(searchLower) ||
          member?.higher_study_2?.toLowerCase().includes(searchLower) ||
          member?.hs_2_institute?.toLowerCase().includes(searchLower) ||
          member?.school?.toLowerCase().includes(searchLower) ||
          member?.home_district?.toLowerCase().includes(searchLower) ||
          member?.organization?.toLowerCase().includes(searchLower) ||
          member?.position?.toLowerCase().includes(searchLower) ||
          member?.department?.toLowerCase().includes(searchLower) ||
          member?.profession?.toLowerCase().includes(searchLower) ||
          member?.nrb_country?.toLowerCase().includes(searchLower) ||
          member?.living_in_area?.toLowerCase().includes(searchLower) ||
          member?.other_club_member?.toLowerCase().includes(searchLower) ||
          member?.remarks?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredMembers(filtered);
  }, [searchTerm, members, filterBatch, filterMembershipType]);


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.image_url;

      // Upload image if a new file is selected
      if (imageFile) {
        setUploadingImage(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', imageFile);

        const uploadResponse = await fetch('/api/members/upload-image', {
          method: 'POST',
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.url;
        } else {
          const errorData = await uploadResponse.json();
          alert(`Failed to upload image: ${errorData.error}`);
          setLoading(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      const url = editingMember
        ? `/api/members/${editingMember.id}`
        : '/api/members';
      const method = editingMember ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          image_url: imageUrl,
        }),
      });

      if (response.ok) {
        await refreshMembers(); // Refresh members from context
        await fetchBatches(); // Also refresh batches
        handleCloseModal();
        
        // Trigger custom event for real-time updates (context will also listen to this)
        window.dispatchEvent(new CustomEvent('memberUpdated'));
      } else {
        const errorData = await response.json();
        alert(`Failed to save member: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to save member:', error);
      alert('Failed to save member. Please try again.');
    } finally {
      setLoading(false);
      setUploadingImage(false);
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
      name_bangla: member.name_bangla || '',
      email: member.email,
      mobile: member.mobile,
      membership_type: member.membership_type,
      batch: member.batch || '',
      group: member.group || '',
      roll_no: member.roll_no || '',
      blood_group: member.blood_group || '',
      birthday_month: member.birthday_month?.toString() || '',
      birthday_day: member.birthday_day?.toString() || '',
      higher_study_1: member.higher_study_1 || '',
      hs_1_institute: member.hs_1_institute || '',
      higher_study_2: member.higher_study_2 || '',
      hs_2_institute: member.hs_2_institute || '',
      school: member.school || '',
      home_district: member.home_district || '',
      organization: member.organization || '',
      position: member.position || '',
      department: member.department || '',
      profession: member.profession || '',
      nrb_country: member.nrb_country || '',
      living_in_area: member.living_in_area || '',
      job_location: member.job_location || '',
      other_club_member: member.other_club_member || '',
      remarks: member.remarks || '',
      image_url: member.image_url || '',
    });
    setImageFile(null);
    setImagePreview(member.image_url || '');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setFormData({
      name: '',
      name_bangla: '',
      email: '',
      mobile: '',
      membership_type: '',
      batch: '',
      group: '',
      roll_no: '',
      blood_group: '',
      birthday_month: '',
      birthday_day: '',
      higher_study_1: '',
      hs_1_institute: '',
      higher_study_2: '',
      hs_2_institute: '',
      school: '',
      home_district: '',
      organization: '',
      position: '',
      department: '',
      profession: '',
      nrb_country: '',
      living_in_area: '',
      job_location: '',
      other_club_member: '',
      remarks: '',
      image_url: '',
    });
    setImageFile(null);
    setImagePreview('');
  };

  const handleImport = async (includeDuplicateNames: boolean = false) => {
    const fileToImport = includeDuplicateNames ? pendingImportFile : importFile;
    
    if (!fileToImport) {
      alert('Please select a file');
      return;
    }

    setImporting(true);
    if (!includeDuplicateNames) {
      setImportResult(null);
      setPendingImportFile(fileToImport); // Store file for potential re-import
    }

    try {
      const formData = new FormData();
      formData.append('file', fileToImport);
      if (includeDuplicateNames) {
        formData.append('includeDuplicateNames', 'true');
      }

      const response = await fetch('/api/members/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        // Check if confirmation is required for duplicate names
        if (result.requiresConfirmation && !includeDuplicateNames) {
          setImportResult(result);
          setImporting(false);
          return; // Don't close modal, show confirmation dialog
        }

        setImportResult(result);
        await refreshMembers(); // Refresh members from context
        await fetchBatches(); // Also refresh batches
        
        // Trigger custom event for real-time updates (context will also listen to this)
        window.dispatchEvent(new CustomEvent('memberUpdated'));
        
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setPendingImportFile(null);
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

  const handleConfirmDuplicateNames = () => {
    if (pendingImportFile) {
      handleImport(true); // Re-import with includeDuplicateNames flag
    }
  };

  const handleEditAndIncludeDuplicateNames = async () => {
    if (!pendingImportFile || !importResult?.duplicateNames) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', pendingImportFile);
      formData.append('includeDuplicateNames', 'true');
      formData.append('editedDuplicateNames', JSON.stringify(editedDuplicateNames));

      const response = await fetch('/api/members/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        await refreshMembers();
        await fetchBatches();
        window.dispatchEvent(new CustomEvent('memberUpdated'));
        
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setPendingImportFile(null);
          setImportResult(null);
          setEditedDuplicateNames([]);
          setEditingDuplicateName(null);
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

  const handleEditDuplicateName = (index: number, field: string, value: string) => {
    if (!importResult?.duplicateNames) return;
    
    const updated = [...editedDuplicateNames];
    const existing = updated.find(d => d.row === importResult.duplicateNames![index].row);
    
    if (existing) {
      (existing as any)[field] = value;
    } else {
      updated.push({
        ...importResult.duplicateNames[index],
        [field]: value
      });
    }
    
    setEditedDuplicateNames(updated);
  };

  const getEditedDuplicateName = (index: number) => {
    if (!importResult?.duplicateNames) return null;
    const original = importResult.duplicateNames[index];
    const edited = editedDuplicateNames.find(d => d.row === original.row);
    return edited || original;
  };

  const handleSkipDuplicateNames = () => {
    // User chose to skip duplicate names, valid members are already imported
    // Just close the modal and refresh
    setShowImportModal(false);
    setImportFile(null);
    setPendingImportFile(null);
    setImportResult(null);
    setEditedDuplicateNames([]);
    setEditingDuplicateName(null);
    refreshMembers();
    fetchBatches();
    window.dispatchEvent(new CustomEvent('memberUpdated'));
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

  const exportToCSV = () => {
    // Use filtered members if filters are applied, otherwise use all members
    const membersToExport = filteredMembers.length > 0 && (searchTerm || filterBatch || filterMembershipType) 
      ? filteredMembers 
      : members;

    if (!Array.isArray(membersToExport) || membersToExport.length === 0) {
      alert('No members to export');
      return;
    }

    // Define CSV headers with all fields
    const headers = [
      'Name',
      'Name (Bangla)',
      'Email',
      'Mobile',
      'Membership Type',
      'Batch',
      'Group',
      'Roll No',
      'Blood Group',
      'Birthday Month',
      'Birthday Day',
      'Higher Study 1',
      'HS 1 Institute',
      'Higher Study 2',
      'HS 2 Institute',
      'School',
      'Home District',
      'Organization',
      'Position',
      'Department',
      'Profession',
      'NRB Country',
      'Living in Area',
      'Job Location',
      'Other Club Member',
      'Remarks',
      'Image URL'
    ];

    // Escape CSV values (handle commas, quotes, and newlines)
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Create CSV rows
    const csvRows = [
      headers.join(','),
      ...membersToExport.map(member => [
        escapeCSV(member.name),
        escapeCSV(member.name_bangla),
        escapeCSV(member.email),
        escapeCSV(member.mobile),
        escapeCSV(member.membership_type),
        escapeCSV(member.batch),
        escapeCSV(member.group),
        escapeCSV(member.roll_no),
        escapeCSV(member.blood_group),
        escapeCSV(member.birthday_month),
        escapeCSV(member.birthday_day),
        escapeCSV(member.higher_study_1),
        escapeCSV(member.hs_1_institute),
        escapeCSV(member.higher_study_2),
        escapeCSV(member.hs_2_institute),
        escapeCSV(member.school),
        escapeCSV(member.home_district),
        escapeCSV(member.organization),
        escapeCSV(member.position),
        escapeCSV(member.department),
        escapeCSV(member.profession),
        escapeCSV(member.nrb_country),
        escapeCSV(member.living_in_area),
        escapeCSV(member.job_location),
        escapeCSV(member.other_club_member),
        escapeCSV(member.remarks),
        escapeCSV(member.image_url)
      ].join(','))
    ];

    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Add BOM for UTF-8 to support special characters (like Bangla)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `members_export_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            title="Export all members to CSV"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
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
              placeholder="Search by name, email, mobile, batch, organization, profession, district, or any field..."
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Photo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name (Bangla)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membership
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Blood Group
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Birthday
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Higher Study 1
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HS 1 Institute
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Higher Study 2
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HS 2 Institute
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Home District
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profession
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NRB Country
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Living in Area
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other Club
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.isArray(filteredMembers) && filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                      <div className="relative">
                        {member.image_url ? (
                          <img
                            src={member.image_url}
                            alt={member.name}
                            className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = parent.querySelector('.image-fallback') as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className={`image-fallback w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-sm font-semibold border border-gray-300 ${member.image_url ? 'hidden' : ''}`}
                        >
                          {member.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.name_bangla || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.email}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.mobile}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {member.membership_type}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.batch || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.group || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.roll_no || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.blood_group || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.birthday_month && member.birthday_day 
                        ? `${member.birthday_month}/${member.birthday_day}` 
                        : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.higher_study_1 || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.hs_1_institute || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.higher_study_2 || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.hs_2_institute || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.school || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.home_district || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.organization || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.position || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.department || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.profession || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.nrb_country || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.living_in_area || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.job_location || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.other_club_member || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.remarks || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={23} className="px-6 py-8 text-center text-sm text-gray-500">
                    {Array.isArray(filteredMembers) ? 'No members found' : 'Loading members...'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
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
                  Name (Bangla)
                </label>
                <input
                  type="text"
                  value={formData.name_bangla}
                  onChange={(e) =>
                    setFormData({ ...formData, name_bangla: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter Bangla name (optional)"
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
                <input
                  type="text"
                  value={formData.membership_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      membership_type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., GM-0202, LM-0204, FM-0101, etc."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter membership type (e.g., GM-0202, LM-0204, FM-0101, OTHER, etc.)
                </p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group
                </label>
                <input
                  type="text"
                  value={formData.group}
                  onChange={(e) =>
                    setFormData({ ...formData, group: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter group (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll No
                </label>
                <input
                  type="text"
                  value={formData.roll_no}
                  onChange={(e) =>
                    setFormData({ ...formData, roll_no: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter roll number (optional)"
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max file size: 5MB. Supported formats: JPG, PNG, GIF
                    </p>
                  </div>
                  {(imagePreview || formData.image_url) && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-300">
                      <img
                        src={imagePreview || formData.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* New Fields Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) =>
                      setFormData({ ...formData, blood_group: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birthday Month
                  </label>
                  <select
                    value={formData.birthday_month}
                    onChange={(e) =>
                      setFormData({ ...formData, birthday_month: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Month</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birthday Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.birthday_day}
                    onChange={(e) =>
                      setFormData({ ...formData, birthday_day: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Day (1-31)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Higher Study 1
                  </label>
                  <input
                    type="text"
                    value={formData.higher_study_1}
                    onChange={(e) =>
                      setFormData({ ...formData, higher_study_1: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., MBA, PhD, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HS 1 Institute
                  </label>
                  <input
                    type="text"
                    value={formData.hs_1_institute}
                    onChange={(e) =>
                      setFormData({ ...formData, hs_1_institute: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Institute name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Higher Study 2
                  </label>
                  <input
                    type="text"
                    value={formData.higher_study_2}
                    onChange={(e) =>
                      setFormData({ ...formData, higher_study_2: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., MBA, PhD, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HS 2 Institute
                  </label>
                  <input
                    type="text"
                    value={formData.hs_2_institute}
                    onChange={(e) =>
                      setFormData({ ...formData, hs_2_institute: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Institute name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School
                  </label>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) =>
                      setFormData({ ...formData, school: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="School name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Home District
                  </label>
                  <input
                    type="text"
                    value={formData.home_district}
                    onChange={(e) =>
                      setFormData({ ...formData, home_district: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="District name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) =>
                      setFormData({ ...formData, organization: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Organization name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Job position"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Department name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profession
                  </label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) =>
                      setFormData({ ...formData, profession: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Profession"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NRB Country
                  </label>
                  <input
                    type="text"
                    value={formData.nrb_country}
                    onChange={(e) =>
                      setFormData({ ...formData, nrb_country: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Country name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Living in Area
                  </label>
                  <input
                    type="text"
                    value={formData.living_in_area}
                    onChange={(e) =>
                      setFormData({ ...formData, living_in_area: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Area/City name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Location
                  </label>
                  <input
                    type="text"
                    value={formData.job_location}
                    onChange={(e) =>
                      setFormData({ ...formData, job_location: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Job location"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Club Member
                  </label>
                  <input
                    type="text"
                    value={formData.other_club_member}
                    onChange={(e) =>
                      setFormData({ ...formData, other_club_member: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Other club memberships"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Additional remarks or notes"
                    rows={3}
                  />
                </div>
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
                  disabled={loading || uploadingImage}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
                >
                  {uploadingImage ? 'Uploading Image...' : loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Import Members from Excel/CSV</h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">File Format:</h3>
              <p className="text-sm text-gray-700 mb-2">
                Your Excel (.xlsx, .xls) or CSV (.csv) file should have the following columns:
              </p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li><strong>Name</strong> (required) - Full name of the member</li>
                <li><strong>Email</strong> (required) - Email address (used for duplicate detection)</li>
                <li><strong>Mobile</strong> (required) - Phone number (used for duplicate detection)</li>
                <li><strong>Membership Type</strong> - GM, LM, FM, or OTHER (defaults to GM)</li>
                <li><strong>Batch</strong> - Batch identifier (optional)</li>
                <li><strong>Image URL</strong> - URL or base64 image data (optional)</li>
                <li className="mt-2"><strong>Note:</strong> Only email and mobile numbers must be unique. Duplicate names will be shown for confirmation.</li>
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
                Select Excel or CSV File (.xlsx, .xls, or .csv)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {importFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {importResult && importResult.requiresConfirmation && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-yellow-800 mb-2">
                      ⚠ {importResult.message || 'Duplicate names found'}
                    </p>
                    <p className="text-sm text-gray-700 mb-3">
                      Found {importResult.duplicateNames?.length || 0} duplicate name(s) in the file. 
                      Only email and mobile numbers must be unique. Do you want to include these duplicate names?
                    </p>
                    {importResult.validMembersImported !== undefined && importResult.validMembersImported > 0 && (
                      <p className="text-sm text-green-700 mb-3 font-medium">
                        ✓ {importResult.validMembersImported} member(s) with unique email/mobile have been imported.
                      </p>
                    )}
                    {importResult.validMembersCount !== undefined && (
                      <p className="text-sm text-gray-600 mb-3">
                        {importResult.validMembersCount} member(s) with unique email/mobile {importResult.validMembersImported ? 'were imported' : 'will be imported'}.
                      </p>
                    )}
                  </div>
                  
                  {importResult.duplicateNames && importResult.duplicateNames.length > 0 && (
                    <div className="max-h-60 overflow-y-auto border border-yellow-300 rounded p-3 bg-white">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Duplicate Names Found (Click to edit):</p>
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left">Row</th>
                            <th className="px-2 py-1 text-left">Name</th>
                            <th className="px-2 py-1 text-left">Email</th>
                            <th className="px-2 py-1 text-left">Mobile</th>
                            <th className="px-2 py-1 text-left">First Seen</th>
                            <th className="px-2 py-1 text-left">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {importResult.duplicateNames.slice(0, 20).map((dup: any, idx: number) => {
                            const edited = getEditedDuplicateName(idx);
                            const isEditing = editingDuplicateName === idx;
                            
                            return (
                              <tr key={idx} className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : ''}`}>
                                <td className="px-2 py-1">{dup.row}</td>
                                <td className="px-2 py-1">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={edited?.name || ''}
                                      onChange={(e) => handleEditDuplicateName(idx, 'name', e.target.value)}
                                      className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs"
                                      placeholder="Edit name"
                                    />
                                  ) : (
                                    <span className="font-medium">{edited?.name || dup.name}</span>
                                  )}
                                </td>
                                <td className="px-2 py-1">
                                  {isEditing ? (
                                    <input
                                      type="email"
                                      value={edited?.email || ''}
                                      onChange={(e) => handleEditDuplicateName(idx, 'email', e.target.value)}
                                      className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs"
                                      placeholder="Edit email"
                                    />
                                  ) : (
                                    <span>{edited?.email || dup.email}</span>
                                  )}
                                </td>
                                <td className="px-2 py-1">
                                  {isEditing ? (
                                    <input
                                      type="tel"
                                      value={edited?.mobile || ''}
                                      onChange={(e) => handleEditDuplicateName(idx, 'mobile', e.target.value)}
                                      className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs"
                                      placeholder="Edit mobile"
                                    />
                                  ) : (
                                    <span>{edited?.mobile || dup.mobile}</span>
                                  )}
                                </td>
                                <td className="px-2 py-1 text-gray-500">Row {dup.firstOccurrenceRow}</td>
                                <td className="px-2 py-1">
                                  {isEditing ? (
                                    <button
                                      onClick={() => setEditingDuplicateName(null)}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      Done
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setEditingDuplicateName(idx)}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {importResult.duplicateNames.length > 20 && (
                        <p className="text-xs text-gray-500 mt-2">
                          ... and {importResult.duplicateNames.length - 20} more
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <button
                        onClick={handleConfirmDuplicateNames}
                        disabled={importing || editingDuplicateName !== null}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
                      >
                        {importing ? 'Importing...' : 'Include As-Is'}
                      </button>
                      <button
                        onClick={handleEditAndIncludeDuplicateNames}
                        disabled={importing || editingDuplicateName !== null}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-green-400"
                      >
                        {importing ? 'Importing...' : 'Edit & Include'}
                      </button>
                      <button
                        onClick={handleSkipDuplicateNames}
                        disabled={importing || editingDuplicateName !== null}
                        className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition disabled:bg-gray-100"
                      >
                        {importing ? 'Importing...' : 'Skip'}
                      </button>
                    </div>
                    {editingDuplicateName !== null && (
                      <p className="text-xs text-blue-600 text-center">
                        Please finish editing the current row before proceeding.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {importResult && !importResult.requiresConfirmation && (
              <div className={`mb-6 p-4 rounded-lg ${
                importResult.errors && importResult.errors.length > 0
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-green-50 border border-green-200'
              }`}>
                <div className="space-y-2">
                  <p className="font-semibold text-green-700">
                    ✓ {importResult.imported || 0} members processed successfully
                    {importResult.updated && importResult.updated > 0 && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({importResult.updated} updated, {importResult.imported - importResult.updated} new)
                      </span>
                    )}
                  </p>
                  {importResult.skipped && importResult.skipped > 0 && (
                    <p className="text-sm text-gray-700">
                      ⚠ {importResult.skipped} members skipped (duplicate email/mobile)
                    </p>
                  )}
                  {importResult.total && (
                    <p className="text-xs text-gray-600">
                      Total rows processed: {importResult.total}
                    </p>
                  )}
                </div>
                {importResult.skippedDetails && importResult.skippedDetails.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Skipped members (sample):</p>
                    <ul className="text-xs text-gray-600 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                      {importResult.skippedDetails.map((skipped: any, idx: number) => (
                        <li key={idx}>
                          Row {skipped.row}: {skipped.name} ({skipped.email}) - {skipped.reason}
                        </li>
                      ))}
                      {importResult.skipped && importResult.skipped > 10 && (
                        <li className="text-gray-500">... and {importResult.skipped - 10} more skipped</li>
                      )}
                    </ul>
                  </div>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <p className="text-sm font-medium text-yellow-800">Errors:</p>
                    <ul className="text-sm list-disc list-inside mt-1 text-yellow-700">
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
