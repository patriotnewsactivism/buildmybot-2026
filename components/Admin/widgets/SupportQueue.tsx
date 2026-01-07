import React from 'react';
import { Inbox } from 'lucide-react';

export const SupportQueue: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Support Queue</h2>
        <span className="text-sm text-slate-500">All tickets</span>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Inbox className="text-slate-500" size={24} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No tickets loaded</h3>
        <p className="text-sm text-slate-600">
          Connect the support ticket source to populate the queue.
        </p>
      </div>
    </div>
  );
};
