'use client';

import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskItem } from './TaskItem';
import { Loader2, Plus, Trash2, Check, X, Edit2, GripHorizontal } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { RemoteDragState } from './BoardCanvas';

interface ColumnProps {
  column: {
    id: string;
    title: string;
    tasks: { id: string; title: string; position: number }[];
  };
  onAddTask: (columnId: string, title: string) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: () => void;
  onUpdateColumn: () => void;
  remoteDrags: { [taskId: string]: RemoteDragState };
}

const COLUMN_ACCENTS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#14B8A6'];

function getColumnAccent(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLUMN_ACCENTS[Math.abs(hash) % COLUMN_ACCENTS.length];
}

export function ColumnView({ column, onAddTask, onDeleteTask, onUpdateTask, onUpdateColumn, remoteDrags }: ColumnProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  const isRemotelyDragged = Object.values(remoteDrags).some(drag => drag.type === 'column' && drag.item.id === column.id);
  const visualDragState = isDragging || isRemotelyDragged;

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
    opacity: visualDragState ? 0.3 : 1,
  };

  const accentColor = getColumnAccent(column.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setCreating(true);
    await onAddTask(column.id, newTaskTitle);
    setNewTaskTitle('');
    setCreating(false);
  };

  const handleUpdateColumn = async () => {
    if (!editTitle.trim() || editTitle === column.title) {
      setIsEditing(false);
      return;
    }
    try {
      await apiClient(`/api/columns/${column.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editTitle }),
      });
      setIsEditing(false);
      onUpdateColumn();
    } catch (e: unknown) {
      if (e instanceof Error || e instanceof ApiError) {
        toast.error(e.message || 'Failed to update column title');
      } else {
        toast.error('Failed to update column title');
      }
    }
  };

  const handleDeleteColumn = () => {
    toast('Delete this column?', {
      description: 'All tasks in this column will be deleted.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await apiClient(`/api/columns/${column.id}`, { method: 'DELETE' });
            onUpdateColumn();
            toast.success('Column deleted');
          } catch (e: unknown) {
            if (e instanceof Error || e instanceof ApiError) {
              toast.error(e.message || 'Failed to delete column');
            } else {
              toast.error('Failed to delete column');
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

  return (
    <div 
      id={`column-${column.id}`}
      ref={setNodeRef}
      style={style}
      className={`w-full h-full flex flex-col rounded-xl max-h-full bg-zinc-100/50 border relative transition-all duration-300 ${
        visualDragState ? 'border-dashed border-zinc-400 shadow-none opacity-60' : 'border-zinc-200/50 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.03)]'
      }`}
    >
      <div 
        className="h-1 rounded-t-xl absolute top-0 left-0 right-0 w-full"
        style={{ backgroundColor: accentColor, opacity: visualDragState ? 0.5 : 0.8 }}
      />
      
      <div className="p-4 pt-4 font-medium text-zinc-800 flex justify-between items-center group">
        <div 
          {...attributes} 
          {...listeners} 
          className="mr-2 cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 rounded-lg p-1.5 hover:bg-zinc-200/50 transition-colors"
        >
          <GripHorizontal className="w-4 h-4" />
        </div>
        {isEditing ? (
          <div className="flex items-center space-x-1 flex-1 mr-2">
            <input 
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 px-3 py-1.5 text-[15px] font-medium text-zinc-900 border rounded-xl border-zinc-200 focus:outline-none focus:ring-4 focus:ring-zinc-200 focus:border-zinc-400 bg-white shadow-sm transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateColumn();
                if (e.key === 'Escape') {
                  setEditTitle(column.title);
                  setIsEditing(false);
                }
              }}
            />
            <button onClick={handleUpdateColumn} className="text-zinc-600 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors duration-150"><Check className="h-4 w-4 stroke-[1.5]"/></button>
            <button onClick={() => { setEditTitle(column.title); setIsEditing(false); }} className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors duration-150"><X className="h-4 w-4 stroke-[1.5]"/></button>
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-center space-x-2">
              <span className="truncate text-[15px] tracking-tight" title={column.title}>{column.title}</span>
              <span className="bg-white/60 border border-zinc-200/60 text-zinc-500 rounded-full px-2.5 py-0.5 text-xs font-mono tabular-nums font-semibold shadow-sm">
                {column.tasks.length}
              </span>
            </div>
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <button onClick={() => setIsEditing(true)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg transition-all duration-300 shadow-sm border border-transparent hover:border-zinc-200/60">
                <Edit2 className="h-4 w-4 stroke-[1.5]" />
              </button>
              <button onClick={handleDeleteColumn} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-white rounded-lg transition-all duration-300 shadow-sm border border-transparent hover:border-zinc-200/60">
                <Trash2 className="h-4 w-4 stroke-[1.5]" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-30">
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onDelete={onDeleteTask} 
              onUpdate={onUpdateTask} 
              isRemoteDragging={!!remoteDrags[task.id]}
            />
          ))}
        </SortableContext>
      </div>

      <div className="p-3 mt-auto">
        <form onSubmit={handleSubmit} className="flex items-center group/add bg-white rounded-2xl p-1 shadow-sm border border-zinc-200/60 focus-within:border-zinc-400 focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
          <input
            type="text"
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-transparent px-3 py-1.5 text-[14px] font-medium placeholder:text-zinc-400 focus:outline-none text-zinc-900"
          />
          <button
            type="submit"
            disabled={creating || !newTaskTitle.trim()}
            className="bg-zinc-900 text-white p-2 rounded-xl hover:bg-zinc-800 active:scale-[0.95] transition-all duration-500 ease-(--ease-spring) disabled:opacity-40 disabled:hover:bg-zinc-900 shadow-sm shrink-0"
          >
            {creating ? <Loader2 className="animate-spin h-4 w-4 stroke-[1.5]" /> : <Plus className="h-4 w-4 stroke-[1.5]" />}
          </button>
        </form>
      </div>
    </div>
  );
}
