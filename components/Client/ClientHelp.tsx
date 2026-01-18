import React from 'react';
import { ArrowRight, BookOpen, CheckCircle, MessageCircle, PlayCircle } from 'lucide-react';

interface ClientHelpProps {
  onBack?: () => void;
}

const checklistItems = [
  {
    title: 'Create your first bot',
    detail: 'Launch with a template that matches your industry.',
  },
  {
    title: 'Upload knowledge base files',
    detail: 'Add FAQs and documents so your bot answers accurately.',
  },
  {
    title: 'Embed on your website',
    detail: 'Publish the widget or share the chat link.',
  },
  {
    title: 'Review leads daily',
    detail: 'Move leads through the pipeline and follow up quickly.',
  },
];

export const ClientHelp: React.FC<ClientHelpProps> = ({ onBack }) => {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Help center</p>
          <h1 className="text-3xl font-semibold text-slate-900">Guides and support</h1>
          <p className="text-sm text-slate-500 mt-2">
            Answers, walkthroughs, and a checklist to get your bots live faster.
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to dashboard
            <ArrowRight size={16} />
          </button>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <PlayCircle className="text-blue-600" size={20} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Video tutorials</h2>
              <p className="text-sm text-slate-500">Bite-sized videos for every setup stage.</p>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Embed your tutorial player or link to hosted videos here.
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-emerald-600" size={20} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Live chat support</h2>
              <p className="text-sm text-slate-500">Reach support in minutes.</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Start a chat
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BookOpen className="text-slate-700" size={20} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Knowledge base</h2>
              <p className="text-sm text-slate-500">Searchable guides and playbooks.</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Add a search component or link to your docs hub.
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Onboarding checklist</h2>
          <div className="space-y-3">
            {checklistItems.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <CheckCircle className="text-blue-600" size={18} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
