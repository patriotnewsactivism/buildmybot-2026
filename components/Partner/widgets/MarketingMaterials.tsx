import React, { useEffect, useState } from 'react';
import { FileText, Download, Image, Video, RefreshCw } from 'lucide-react';
import { DataTable, Column } from '../../UI/DataTable';

interface MarketingMaterial {
  id: string;
  title: string;
  description: string | null;
  type: string;
  size: string | null;
  downloadUrl: string;
  previewUrl: string | null;
  createdAt: string;
}

export const MarketingMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<MarketingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/partners/marketing-materials');
      if (!response.ok) {
        throw new Error('Failed to fetch marketing materials');
      }
      const data = await response.json();
      setMaterials(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError('Failed to load marketing materials');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'image':
        return <Image size={20} className="text-blue-600" />;
      case 'video':
        return <Video size={20} className="text-purple-600" />;
      case 'document':
        return <FileText size={20} className="text-green-600" />;
      default:
        return <FileText size={20} className="text-slate-600" />;
    }
  };

  const handleDownload = (material: MarketingMaterial) => {
    window.open(material.downloadUrl, '_blank');
  };

  const columns: Column<MarketingMaterial>[] = [
    {
      key: 'type',
      label: 'Type',
      render: (material) => (
        <div className="flex items-center justify-center">
          {getTypeIcon(material.type)}
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (material) => (
        <div>
          <div className="font-medium text-slate-900">{material.title}</div>
          {material.description && (
            <div className="text-xs text-slate-500 mt-1">{material.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (material) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
          material.type.toLowerCase() === 'image' ? 'bg-blue-100 text-blue-800' :
          material.type.toLowerCase() === 'video' ? 'bg-purple-100 text-purple-800' :
          material.type.toLowerCase() === 'document' ? 'bg-green-100 text-green-800' :
          'bg-slate-100 text-slate-800'
        }`}>
          {material.type}
        </span>
      ),
    },
    {
      key: 'size',
      label: 'Size',
      render: (material) => material.size || '-',
    },
    {
      key: 'createdAt',
      label: 'Added',
      sortable: true,
      render: (material) => new Date(material.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (material) => (
        <div className="flex space-x-2">
          {material.previewUrl && (
            <a
              href={material.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-xs"
            >
              Preview
            </a>
          )}
          <button
            onClick={() => handleDownload(material)}
            className="text-orange-600 hover:text-orange-800 text-xs flex items-center space-x-1"
          >
            <Download size={14} />
            <span>Download</span>
          </button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchMaterials}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <RefreshCw size={16} className="inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marketing Materials</h2>
          <p className="text-sm text-slate-600 mt-1">
            Download assets to help promote BuildMyBot to your clients
          </p>
        </div>
        <button
          onClick={fetchMaterials}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Image size={24} className="text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Images</p>
              <p className="text-2xl font-bold text-blue-700">
                {materials.filter((m) => m.type.toLowerCase() === 'image').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Video size={24} className="text-purple-600" />
            <div>
              <p className="text-sm font-medium text-purple-900">Videos</p>
              <p className="text-2xl font-bold text-purple-700">
                {materials.filter((m) => m.type.toLowerCase() === 'video').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FileText size={24} className="text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Documents</p>
              <p className="text-2xl font-bold text-green-700">
                {materials.filter((m) => m.type.toLowerCase() === 'document').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <DataTable
        columns={columns}
        data={materials}
        loading={loading}
        searchable
        searchPlaceholder="Search materials..."
        emptyMessage="No marketing materials available yet"
      />
    </div>
  );
};
