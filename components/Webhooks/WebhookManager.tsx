import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Send,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Zap
} from 'lucide-react';

interface WebhookConfig {
  id?: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  description?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  retryEnabled: boolean;
  maxRetries: number;
  createdAt?: string;
  updatedAt?: string;
}

interface WebhookDelivery {
  id: string;
  eventType: string;
  status: 'pending' | 'success' | 'failed';
  statusCode?: number;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  deliveredAt?: string;
}

const AVAILABLE_EVENTS = [
  { value: 'lead.created', label: 'Lead Created', description: 'Triggered when a new lead is captured' },
  { value: 'lead.updated', label: 'Lead Updated', description: 'Triggered when a lead is updated' },
  { value: 'lead.status_changed', label: 'Lead Status Changed', description: 'Triggered when lead status changes' },
  { value: 'conversation.started', label: 'Conversation Started', description: 'Triggered when a conversation begins' },
  { value: 'conversation.ended', label: 'Conversation Ended', description: 'Triggered when a conversation ends' },
  { value: 'conversation.message', label: 'Conversation Message', description: 'Triggered on each message' },
  { value: 'bot.created', label: 'Bot Created', description: 'Triggered when a bot is created' },
  { value: 'bot.updated', label: 'Bot Updated', description: 'Triggered when a bot is updated' },
  { value: 'bot.deleted', label: 'Bot Deleted', description: 'Triggered when a bot is deleted' },
  { value: '*', label: 'All Events', description: 'Subscribe to all webhook events' },
];

export const WebhookManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchWebhooks();
  }, []);

  useEffect(() => {
    if (selectedWebhook) {
      fetchDeliveries(selectedWebhook);
    }
  }, [selectedWebhook]);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhooks');
      if (!response.ok) throw new Error('Failed to fetch webhooks');
      const data = await response.json();
      setWebhooks(data);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      alert('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/webhooks/${webhookId}/deliveries`);
      if (!response.ok) throw new Error('Failed to fetch deliveries');
      const data = await response.json();
      setDeliveries(data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    }
  };

  const handleCreateWebhook = async (webhook: WebhookConfig) => {
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhook),
      });

      if (!response.ok) throw new Error('Failed to create webhook');

      await fetchWebhooks();
      setShowCreateModal(false);
      alert('✅ Webhook created successfully!');
    } catch (error) {
      console.error('Error creating webhook:', error);
      alert('Failed to create webhook');
    }
  };

  const handleUpdateWebhook = async (id: string, updates: Partial<WebhookConfig>) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update webhook');

      await fetchWebhooks();
      setEditingWebhook(null);
      alert('✅ Webhook updated successfully!');
    } catch (error) {
      console.error('Error updating webhook:', error);
      alert('Failed to update webhook');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete webhook');

      await fetchWebhooks();
      if (selectedWebhook === id) {
        setSelectedWebhook(null);
        setDeliveries([]);
      }
      alert('✅ Webhook deleted successfully!');
    } catch (error) {
      console.error('Error deleting webhook:', error);
      alert('Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks/${id}/test`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to test webhook');

      alert('✅ Test webhook sent! Check deliveries for results.');
      setTimeout(() => fetchDeliveries(id), 2000);
    } catch (error) {
      console.error('Error testing webhook:', error);
      alert('Failed to test webhook');
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      const response = await fetch(`/api/webhooks/deliveries/${deliveryId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to retry delivery');

      alert('✅ Retry initiated!');
      if (selectedWebhook) {
        setTimeout(() => fetchDeliveries(selectedWebhook), 1000);
      }
    } catch (error) {
      console.error('Error retrying delivery:', error);
      alert('Failed to retry delivery');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(id);
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecret(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-900" />
          <p className="text-slate-500">Loading webhooks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Webhook Management</h2>
          <p className="text-slate-500">Connect BuildMyBot to external services and APIs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition shadow-sm font-medium"
        >
          <Plus size={18} />
          Create Webhook
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Zap className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">Automate Your Workflow</h3>
          <p className="text-sm text-blue-800">
            Connect webhooks to Zapier, Make.com, or your custom applications. Receive real-time updates for leads, conversations, and more.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhooks List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Webhook size={18} className="text-blue-900" />
              Active Webhooks ({webhooks.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {webhooks.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Webhook size={48} className="mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No webhooks configured</p>
                <p className="text-sm mt-1">Create your first webhook to get started</p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition ${
                    selectedWebhook === webhook.id ? 'bg-blue-50 border-l-4 border-l-blue-900' : ''
                  }`}
                  onClick={() => setSelectedWebhook(webhook.id!)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{webhook.name}</h4>
                        {webhook.enabled ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{webhook.url}</p>
                      {webhook.description && (
                        <p className="text-xs text-slate-400 mt-1">{webhook.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(webhook.events as string[]).slice(0, 3).map((event) => (
                          <span
                            key={event}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded"
                          >
                            {event}
                          </span>
                        ))}
                        {(webhook.events as string[]).length > 3 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">
                            +{(webhook.events as string[]).length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestWebhook(webhook.id!);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Test webhook"
                      >
                        <Send size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWebhook(webhook);
                        }}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Edit webhook"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWebhook(webhook.id!);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete webhook"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Secret:</span>
                      <code className="flex-1 text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                        {showSecret[webhook.id!] ? webhook.secret : '••••••••••••••••'}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSecretVisibility(webhook.id!);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-700"
                      >
                        {showSecret[webhook.id!] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(webhook.secret!, webhook.id!);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-700"
                      >
                        {copiedSecret === webhook.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-900" />
              Delivery History
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {!selectedWebhook ? (
              <div className="p-8 text-center text-slate-500">
                <Clock size={48} className="mx-auto mb-3 text-slate-300" />
                <p className="font-medium">Select a webhook</p>
                <p className="text-sm mt-1">View delivery history and retry failed attempts</p>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Send size={48} className="mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No deliveries yet</p>
                <p className="text-sm mt-1">Deliveries will appear here when events are triggered</p>
              </div>
            ) : (
              deliveries.map((delivery) => (
                <div key={delivery.id} className="p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {delivery.status === 'success' && (
                          <CheckCircle size={16} className="text-emerald-600" />
                        )}
                        {delivery.status === 'failed' && (
                          <X size={16} className="text-red-600" />
                        )}
                        {delivery.status === 'pending' && (
                          <Clock size={16} className="text-yellow-600" />
                        )}
                        <span className="font-medium text-slate-800">{delivery.eventType}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(delivery.createdAt).toLocaleString()}
                      </p>
                      {delivery.statusCode && (
                        <p className="text-xs text-slate-600 mt-1">
                          Status: {delivery.statusCode}
                        </p>
                      )}
                      {delivery.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">{delivery.errorMessage}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Attempts: {delivery.attempts}
                      </p>
                    </div>
                    {delivery.status === 'failed' && (
                      <button
                        onClick={() => handleRetryDelivery(delivery.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Retry delivery"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingWebhook) && (
        <WebhookModal
          webhook={editingWebhook || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingWebhook(null);
          }}
          onSave={(webhook) => {
            if (webhook.id) {
              handleUpdateWebhook(webhook.id, webhook);
            } else {
              handleCreateWebhook(webhook);
            }
          }}
        />
      )}
    </div>
  );
};

// Webhook Create/Edit Modal Component
interface WebhookModalProps {
  webhook?: WebhookConfig;
  onClose: () => void;
  onSave: (webhook: WebhookConfig) => void;
}

const WebhookModal: React.FC<WebhookModalProps> = ({ webhook, onClose, onSave }) => {
  const [formData, setFormData] = useState<WebhookConfig>(
    webhook || {
      name: '',
      url: '',
      events: [],
      description: '',
      headers: {},
      enabled: true,
      retryEnabled: true,
      maxRetries: 3,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.url || formData.events.length === 0) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  const toggleEvent = (eventValue: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">
            {webhook ? 'Edit Webhook' : 'Create Webhook'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
              placeholder="My Zapier Webhook"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Endpoint URL *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 h-20"
              placeholder="Optional description of what this webhook does"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Events to Subscribe *
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {AVAILABLE_EVENTS.map((event) => (
                <label key={event.value} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-slate-800">{event.label}</div>
                    <div className="text-xs text-slate-500">{event.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              <span className="text-sm text-slate-700">Enable webhook</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.retryEnabled}
                onChange={(e) => setFormData({ ...formData, retryEnabled: e.target.checked })}
              />
              <span className="text-sm text-slate-700">Retry on failure</span>
            </label>
          </div>

          {formData.retryEnabled && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Retries
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.maxRetries}
                onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) })}
                className="w-32 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition"
            >
              {webhook ? 'Update Webhook' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
