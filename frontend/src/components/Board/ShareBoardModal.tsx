import { useState } from 'react';
import { X, Loader2, UserMinus } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export interface BoardMember {
  user: { id: string; name: string; email: string };
  role: string;
}

export interface BoardData {
  id: string;
  title: string;
  ownerId: string;
  owner?: { name: string; email: string };
  members: BoardMember[];
}

interface ShareBoardModalProps {
  board: BoardData;
  onClose: () => void;
  onUpdate: () => void;
}

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
];

function getAvatarColor(identifier: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ShareBoardModal({ board, onClose, onUpdate }: ShareBoardModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isOwner = user?.id === board.ownerId;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await apiClient(`/api/boards/${board.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setEmail('');
      onUpdate(); // refresh board to get new members
    } catch (err: unknown) {
      if (err instanceof Error || err instanceof ApiError) {
        toast.error(err.message || 'Failed to send invite');
      } else {
        toast.error('Failed to send invite');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    toast('Remove this member?', {
      description: 'They will no longer have access to this board.',
      action: {
        label: 'Remove',
        onClick: async () => {
          try {
            await apiClient(`/api/boards/${board.id}/members/${memberId}`, {
              method: 'DELETE',
            });
            onUpdate();
            toast.success('Member removed');
          } catch (err: unknown) {
            if (err instanceof Error || err instanceof ApiError) {
              toast.error(err.message || 'Failed to remove member');
            } else {
              toast.error('Failed to remove member');
            }
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
  };

  const ownerAvatarColor = getAvatarColor(board.ownerId || board.owner?.email || 'unknown');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_20px_40px_-15px_rgba(15,23,42,0.15)]"
        style={{ animation: 'modalEnter 200ms cubic-bezier(0.23, 1, 0.32, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[#0F172A]">Share Board</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150">
            <X className="h-5 w-5 stroke-[1.5]" />
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{error}</div>}

        {isOwner && (
          <form onSubmit={handleAddMember} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Invite by Email</label>
            <div className="flex space-x-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="inline-flex justify-center items-center rounded-lg border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4 stroke-[1.5]" /> : 'Invite'}
              </button>
            </div>
          </form>
        )}

        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Members</h3>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
            <li className="flex items-center justify-between p-3 bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center text-xs font-semibold ${ownerAvatarColor.bg} ${ownerAvatarColor.text}`}>
                  {board.owner?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">{board.owner?.name || 'Unknown'} <span className="text-xs font-normal text-slate-500">(Owner)</span></p>
                  <p className="text-xs text-slate-500">{board.owner?.email}</p>
                </div>
              </div>
            </li>
            {board.members.map((member: BoardMember) => {
              const memberColor = getAvatarColor(member.user.id || member.user.email);
              return (
                <li key={member.user.id} className="flex items-center justify-between p-3 group">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center text-xs font-semibold ${memberColor.bg} ${memberColor.text}`}>
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{member.user.name}</p>
                      <p className="text-xs text-slate-500">{member.user.email}</p>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveMember(member.user.id)}
                      className="text-red-400 hover:text-red-600 rounded-lg p-1 hover:bg-red-50 transition-colors duration-150 opacity-0 group-hover:opacity-100"
                      title="Remove member"
                    >
                      <UserMinus className="h-4 w-4 stroke-[1.5]" />
                    </button>
                  )}
                </li>
              );
            })}
            {board.members.length === 0 && (
              <li className="p-4 text-sm text-slate-500 text-center">No other members yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
