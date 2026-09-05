'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient, ApiError } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, Plus, Loader2, Trash2, LayoutGrid, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const BOARD_COLORS = [
  { bg: 'bg-zinc-100', icon: 'text-zinc-500' },
  { bg: 'bg-stone-100', icon: 'text-stone-500' },
  { bg: 'bg-neutral-100', icon: 'text-neutral-500' },
];

function getBoardColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BOARD_COLORS[Math.abs(hash) % BOARD_COLORS.length];
}

interface Board {
  id: string;
  title: string;
  ownerId: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchBoards = async () => {
      try {
        const data = await apiClient('/api/boards');
        setBoards(data);
      } catch (err: unknown) {
        console.error(err);
        if (err instanceof ApiError) {
          toast.error(err.message || 'Failed to load boards');
        } else if (err instanceof Error) {
          toast.error(err.message);
        } else {
          toast.error('Failed to load boards');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBoards();
  }, [user]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    
    setCreating(true);
    try {
      const data = await apiClient('/api/boards', {
        method: 'POST',
        body: JSON.stringify({ title: newBoardTitle }),
      });
      setBoards([...boards, data]);
      setNewBoardTitle('');
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof ApiError) {
        toast.error(err.message || 'Failed to create board');
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Failed to create board');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOrLeaveBoard = (e: React.MouseEvent, boardId: string, isOwner: boolean) => {
    e.preventDefault();
    
    if (isOwner) {
      toast('Delete this board?', {
        description: 'This action cannot be undone.',
        action: {
          label: 'Delete',
          onClick: async () => {
            try {
              await apiClient(`/api/boards/${boardId}`, {
                method: 'DELETE',
              });
              setBoards(prev => prev.filter(b => b.id !== boardId));
              toast.success('Board deleted');
            } catch (err: unknown) {
              if (err instanceof ApiError) {
                toast.error(err.message || 'Failed to delete board');
              } else if (err instanceof Error) {
                toast.error(err.message);
              } else {
                toast.error('Failed to delete board');
              }
            }
          }
        },
        cancel: { label: 'Cancel', onClick: () => {} }
      });
    } else {
      toast('Leave this board?', {
        description: 'You will no longer have access to this board.',
        action: {
          label: 'Leave',
          onClick: async () => {
            try {
              await apiClient(`/api/boards/${boardId}/members/${user?.id}`, {
                method: 'DELETE',
              });
              setBoards(prev => prev.filter(b => b.id !== boardId));
              toast.success('You have left the board');
            } catch (err: unknown) {
              if (err instanceof ApiError) {
                toast.error(err.message || 'Failed to leave board');
              } else if (err instanceof Error) {
                toast.error(err.message);
              } else {
                toast.error('Failed to leave board');
              }
            }
          }
        },
        cancel: { label: 'Cancel', onClick: () => {} }
      });
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="animate-spin h-8 w-8 text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col font-sans selection:bg-zinc-800 selection:text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-2xl border-b border-zinc-200/50">
        <div className="max-w-350 mx-auto px-6 sm:px-8 lg:px-12 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Image src="/logo.svg" alt="Kanban Logo" width={36} height={36} className="rounded-xl shadow-sm" priority />
            <h1 className="text-xl font-medium tracking-tight text-zinc-900">Kanban</h1>
          </div>
          <div className="flex items-center space-x-5">
            <span className="text-sm font-medium text-zinc-500">{user.email}</span>
            <button
              onClick={logout}
              className="group p-2.5 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-100 transition-all duration-300 ease-(--ease-spring) focus:outline-none focus:ring-2 focus:ring-zinc-200"
              title="Logout"
            >
              <LogOut className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform duration-300 ease-(--ease-spring)" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-350 mx-auto px-6 sm:px-8 lg:px-12 pt-16 lg:pt-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column: Create Form & Intro */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">
            <div className="mb-8">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold bg-zinc-100 text-zinc-500 mb-4">
                Workspace
              </div>
              <h2 className="text-4xl lg:text-5xl font-medium text-zinc-900 tracking-tight leading-tight mb-4">
                Manage your projects
              </h2>
              <p className="text-zinc-500 text-lg leading-relaxed max-w-sm">
                Create new boards to organize tasks, or collaborate on shared projects.
              </p>
            </div>

            <form onSubmit={handleCreateBoard} className="relative group/form mt-10">
              <div className="flex items-center bg-white rounded-full p-1.5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-zinc-200/80 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-zinc-300 focus-within:border-zinc-400 focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="New board title..."
                  className="flex-1 bg-transparent px-5 py-3 text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none w-full"
                  required
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:scale-95 transition-all duration-500 ease-(--ease-spring) disabled:opacity-50 disabled:hover:bg-zinc-900 shrink-0 group/btn"
                >
                  {creating ? (
                    <Loader2 className="animate-spin h-5 w-5" strokeWidth={1.5} />
                  ) : (
                    <Plus className="h-5 w-5 group-hover/btn:rotate-90 transition-transform duration-500 ease-(--ease-spring)" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Boards Grid */}
          <div className="lg:col-span-8">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-2 rounded-4xl bg-zinc-100/50 border border-zinc-200/50">
                    <div className="bg-white/40 rounded-3xl h-44 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : boards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-100 border border-dashed border-zinc-200/60 rounded-[2.5rem] bg-white/40 p-12 text-center animate-stagger-fade-up">
                <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-6">
                  <LayoutGrid className="h-7 w-7 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-medium text-zinc-900 mb-2">Pristine workspace</h3>
                <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  You don&apos;t have any boards yet. Create your first board using the form on the left to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-16">
                {boards.filter(b => b.ownerId === user.id).length > 0 && (
                  <section>
                    <div className="flex items-center space-x-3 mb-8">
                      <h3 className="text-xl font-medium text-zinc-800">My Boards</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-medium">
                        {boards.filter(b => b.ownerId === user.id).length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {boards.filter(b => b.ownerId === user.id).map((board, index) => {
                        const color = getBoardColor(board.id);
                        return (
                          <Link
                            key={board.id}
                            href={`/board/${board.id}`}
                            className="group block outline-none"
                            style={{ 
                              animation: `staggerFadeUp 0.8s var(--ease-spring) forwards`,
                              animationDelay: `${index * 100}ms`,
                              opacity: 0
                            }}
                          >
                            <div className="p-1.5 rounded-4xl bg-zinc-100/80 border border-zinc-200/60 transition-all duration-700 ease-(--ease-spring) group-hover:bg-zinc-200/80 group-focus-visible:ring-2 group-focus-visible:ring-zinc-400 group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-background h-full">
                              <div className="bg-white rounded-[1.625rem] shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-zinc-100 p-6 flex flex-col h-full min-h-44 transition-transform duration-700 ease-(--ease-spring) group-hover:scale-[0.98]">
                                <div className="flex justify-between items-start mb-auto">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color.bg}`}>
                                    <LayoutGrid className={`h-4 w-4 ${color.icon}`} strokeWidth={1.5} />
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteOrLeaveBoard(e, board.id, true)}
                                    className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 focus:opacity-100 focus:outline-none"
                                    title="Delete Board"
                                  >
                                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                  </button>
                                </div>
                                <div className="mt-8 flex justify-between items-end">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="text-[17px] font-medium text-zinc-900 wrap-break-words leading-tight group-hover:text-black transition-colors">{board.title}</h3>
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 shrink-0 group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors duration-500 ease-(--ease-spring)">
                                    <ArrowRight className="h-4 w-4 group-hover:-rotate-45 transition-transform duration-500 ease-(--ease-spring)" strokeWidth={1.5} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {boards.filter(b => b.ownerId !== user.id).length > 0 && (
                  <section>
                    <div className="flex items-center space-x-3 mb-8">
                      <h3 className="text-xl font-medium text-zinc-800">Shared with me</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-medium">
                        {boards.filter(b => b.ownerId !== user.id).length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {boards.filter(b => b.ownerId !== user.id).map((board, index) => {
                        const color = getBoardColor(board.id);
                        return (
                          <Link
                            key={board.id}
                            href={`/board/${board.id}`}
                            className="group block outline-none"
                            style={{ 
                              animation: `staggerFadeUp 0.8s var(--ease-spring) forwards`,
                              animationDelay: `${(index + boards.filter(b => b.ownerId === user.id).length) * 100}ms`,
                              opacity: 0
                            }}
                          >
                            <div className="p-1.5 rounded-4xl bg-zinc-100/50 border border-zinc-200/40 transition-all duration-700 ease-(--ease-spring) group-hover:bg-zinc-200/50 group-focus-visible:ring-2 group-focus-visible:ring-zinc-400 group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-background h-full">
                              <div className="bg-white/80 backdrop-blur-sm rounded-[1.625rem] shadow-[0_2px_8px_-4px_rgba(0,0,0,0.03)] border border-zinc-100/50 p-6 flex flex-col h-full min-h-44 transition-transform duration-700 ease-(--ease-spring) group-hover:scale-[0.98]">
                                <div className="flex justify-between items-start mb-auto">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color.bg}`}>
                                    <LayoutGrid className={`h-4 w-4 ${color.icon}`} strokeWidth={1.5} />
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteOrLeaveBoard(e, board.id, false)}
                                    className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 focus:opacity-100 focus:outline-none"
                                    title="Leave Board"
                                  >
                                    <LogOut className="h-4 w-4" strokeWidth={1.5} />
                                  </button>
                                </div>
                                <div className="mt-8 flex justify-between items-end">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="text-[17px] font-medium text-zinc-900 wrap-break-words leading-tight group-hover:text-black transition-colors">{board.title}</h3>
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 shrink-0 group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors duration-500 ease-(--ease-spring)">
                                    <ArrowRight className="h-4 w-4 group-hover:-rotate-45 transition-transform duration-500 ease-(--ease-spring)" strokeWidth={1.5} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
