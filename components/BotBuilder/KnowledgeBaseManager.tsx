/**
 * Knowledge Base Manager Component
 * Enhanced upload experience with drag & drop, progress tracking, and document management
 */

import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader, Trash2, Eye, Download } from 'lucide-react';
import { BotDocument } from '../../types';
import { dbService } from '../../services/dbService';

interface KnowledgeBaseManagerProps {
  botId: string;
  documents: BotDocument[];
  onDocumentsChange: (documents: BotDocument[]) => void;
}

export const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({
  botId,
  documents,
  onDocumentsChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(Array.from(files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(Array.from(e.target.files));
    }
  };

  const handleUpload = async (files: File[]) => {
    if (!botId || botId === 'new') {
      setError('Please save your bot before uploading documents');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const uploadedDocs: BotDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFile(file.name);

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} exceeds 10MB limit`);
        continue;
      }

      // Validate file type
      const validTypes = ['.pdf', '.docx', '.txt', '.md'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validTypes.includes(fileExt)) {
        setError(`${file.name} is not a supported format. Use PDF, Word, Text, or Markdown.`);
        continue;
      }

      try {
        const doc = await dbService.uploadBotDocument(botId, file, (progress) => {
          const fileProgress = ((i / files.length) * 100) + (progress / files.length);
          setUploadProgress(fileProgress);
        });

        if (doc) {
          uploadedDocs.push(doc);
        }
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        setError(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    if (uploadedDocs.length > 0) {
      onDocumentsChange([...documents, ...uploadedDocs]);
    }

    setUploading(false);
    setUploadProgress(0);
    setCurrentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const response = await fetch(`/api/bots/${botId}/documents/${docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDocumentsChange(documents.filter((d) => d.id !== docId));
      } else {
        setError('Failed to delete document');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && botId !== 'new' && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : uploading
              ? 'border-slate-200 bg-slate-50 cursor-wait'
              : botId === 'new'
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || botId === 'new'}
        />

        {uploading ? (
          <div className="space-y-4">
            <Loader className="animate-spin text-blue-600 mx-auto" size={32} />
            <div>
              <p className="font-medium text-slate-900">Uploading {currentFile}...</p>
              <div className="mt-3 w-full bg-slate-200 h-2 rounded-full overflow-hidden max-w-md mx-auto">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="mx-auto text-slate-400" size={40} />
            <div>
              <p className="font-medium text-slate-900">
                {botId === 'new' ? 'Save your bot first to upload documents' : 'Drop files here or click to upload'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                PDF, Word, Text, or Markdown files (max 10MB each)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Upload Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && uploadProgress > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader className="animate-spin text-blue-600" size={20} />
            <span className="font-medium text-blue-900">Uploading documents...</span>
          </div>
          <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-blue-700 mt-2">{Math.round(uploadProgress)}% complete</p>
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={18} />
            Uploaded Documents ({documents.length})
          </h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{doc.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {doc.fileType.toUpperCase()} • {formatFileSize(doc.fileSize || 0)}
                    </p>
                  </div>
                  <CheckCircle className="text-green-500 shrink-0" size={20} />
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      // Preview document (could open in modal)
                      console.log('Preview:', doc);
                    }}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
          <FileText size={16} />
          Knowledge Base Tips
        </h4>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li>Upload FAQs, product docs, and company information</li>
          <li>Supported formats: PDF, Word (.docx), Text (.txt), Markdown (.md)</li>
          <li>Documents are automatically chunked and indexed for AI retrieval</li>
          <li>Maximum file size: 10MB per document</li>
          <li>You can upload multiple files at once</li>
          <li>Documents are processed in the background - your bot will use them automatically</li>
        </ul>
      </div>
    </div>
  );
};
