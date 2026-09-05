import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { toast } from 'sonner';

interface TaskDetailModalProps {
  task: { id: string; title: string; description?: string };
  onClose: () => void;
  onUpdate: () => void;
  mode?: 'view' | 'edit';
}

export function TaskDetailModal({ task, onClose, onUpdate, mode = 'edit' }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await apiClient(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, description }),
      });
      onUpdate();
      onClose();
      toast.success('Task updated');
    } catch (err: unknown) {
      if (err instanceof Error || err instanceof ApiError) {
        toast.error(err.message || 'Failed to update task');
      } else {
        toast.error('Failed to update task');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_20px_40px_-15px_rgba(15,23,42,0.15)]"
        style={{ animation: 'modalEnter 200ms cubic-bezier(0.23, 1, 0.32, 1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[#0F172A]">
            {mode === 'edit' ? 'Edit Task' : 'Task Details'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150">
            <X className="h-5 w-5 stroke-[1.5]" />
          </button>
        </div>

        {mode === 'edit' ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-30 resize-y rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none active:scale-[0.97] transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="inline-flex justify-center items-center rounded-lg border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4 stroke-[1.5]" /> : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-[#0F172A] wrap-break-words">{task.title}</h3>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Description</h4>
              {task.description ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{task.description}</p>
              ) : (
                <p className="text-slate-400 italic text-sm">No description provided.</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none active:scale-[0.97] transition-all duration-150"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
