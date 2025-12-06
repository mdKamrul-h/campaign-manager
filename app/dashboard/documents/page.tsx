'use client';

import { useEffect, useState } from 'react';
import { Upload, Trash2, FileText } from 'lucide-react';
import { Document } from '@/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-2">
            Upload documents to help AI understand your campaign context
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 cursor-pointer hover:border-blue-500 transition">
          <Upload className="w-12 h-12 text-gray-400 mb-4" />
          <span className="text-lg font-medium text-gray-700 mb-2">
            {uploading ? 'Uploading...' : 'Click to upload document'}
          </span>
          <span className="text-sm text-gray-500">
            PDF, DOC, TXT, or any text document
          </span>
          <input
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
            accept=".pdf,.doc,.docx,.txt,.md"
          />
        </label>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Uploaded Documents</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {documents.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No documents uploaded yet
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
