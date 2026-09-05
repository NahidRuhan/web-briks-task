'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BoardCanvas, type Column } from '@/components/Board/BoardCanvas';
import { BoardHeader } from '@/components/Board/BoardHeader';
import { BoardData as HeaderBoardData } from '@/components/Board/ShareBoardModal';

interface BoardData extends HeaderBoardData {
  columns: Column[];
}

export default function BoardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBoard = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiClient(`/api/boards/${id}`);
      setBoard(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const run = async () => {
      await fetchBoard();
    };
    run();
  }, [user, id, fetchBoard]);

  if (loading) {
    return (
      <div className="flex flex-col h-dvh bg-background overflow-hidden">
        <div className="h-14 bg-white/60 backdrop-blur-2xl rounded-none animate-pulse border-b border-zinc-200/50" />
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-6 min-h-full">
            <div className="w-80 h-96 bg-zinc-100 rounded-4xl animate-pulse border border-zinc-200/50" />
            <div className="w-80 h-96 bg-zinc-100 rounded-4xl animate-pulse border border-zinc-200/50 delay-75" />
            <div className="w-80 h-96 bg-zinc-100 rounded-4xl animate-pulse border border-zinc-200/50 delay-150" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center space-y-4 bg-background">
        <div className="text-red-500 font-medium">{error || 'Board not found'}</div>
        <Link href="/" className="text-zinc-500 hover:text-zinc-900 transition-colors duration-150 underline underline-offset-4">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden selection:bg-zinc-800 selection:text-white font-sans">
      <BoardHeader board={board} onUpdate={fetchBoard} />

      <main className="flex-1 overflow-hidden flex flex-col">
        <BoardCanvas boardId={board.id} initialData={{ columns: board.columns }} onBoardUpdate={fetchBoard} />
      </main>
    </div>
  );
}
