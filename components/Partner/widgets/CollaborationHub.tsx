import React from 'react';
import { Users, MessageCircle } from 'lucide-react';

export const CollaborationHub: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Collaboration Hub</h2>
        <span className="text-sm text-slate-500">Shared updates</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Users className="text-slate-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-900">Team Updates</h3>
          </div>
          <p className="text-sm text-slate-600">
            Share updates with your clients and internal team members.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <MessageCircle className="text-slate-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-900">Discussion Threads</h3>
          </div>
          <p className="text-sm text-slate-600">
            Centralize collaboration requests and shared notes here.
          </p>
        </div>
      </div>
    </div>
  );
};
