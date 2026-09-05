'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Trash2, GripVertical, Lock } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';

interface TaskProps {
  task: { id: string; title: string; description?: string };
  onDelete: (id: string) => void;
  onUpdate: () => void;
  isRemoteDragging?: boolean;
}

export function TaskItem({ task, onDelete, onUpdate, isRemoteDragging }: TaskProps) {
  const [modalMode, setModalMode] = useState<'view' | 'edit' | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
    disabled: isRemoteDragging,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isRemoteDragging ? 0.4 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        id={`task-${task.id}`}
        style={style}
        className={`bg-white p-3.5 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border group flex items-center transition-all duration-500 ease-(--ease-spring) relative wrap-break-words ${
          isDragging ? 'border-zinc-400 shadow-xl scale-[1.02] z-50' : 'border-zinc-200/60 hover:border-zinc-300 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)]'
        }`}
      >
        <div 
          {...attributes}
          {...listeners}
          className={`mr-2 ${isRemoteDragging ? 'cursor-not-allowed text-zinc-300' : 'cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 p-1 rounded-lg'} transition-colors duration-300`}
        >
          <GripVertical className="h-4 w-4 stroke-[1.5]" />
        </div>
        
        <div className="flex-1 text-[14px] font-medium text-zinc-700 cursor-pointer pr-2 leading-relaxed" onClick={() => !isRemoteDragging && setModalMode('view')}>
          {task.title}
        </div>
        
        {isRemoteDragging && (
          <div className="absolute right-3 top-3 text-zinc-400">
            <Lock className="h-3.5 w-3.5 stroke-[1.5]" />
          </div>
        )}

        {!isRemoteDragging && (
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/80 backdrop-blur-sm px-1 py-0.5 rounded-lg border border-zinc-100 shadow-sm absolute right-2">
            <button 
              onClick={() => setModalMode('edit')}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors duration-300"
              title="Edit Task"
            >
              <Edit2 className="h-3.5 w-3.5 stroke-[1.5]" />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-300"
              title="Delete Task"
            >
              <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
            </button>
          </div>
        )}
      </div>

      {modalMode && (
        <TaskDetailModal 
          task={task} 
          onClose={() => setModalMode(null)} 
          onUpdate={onUpdate}
          mode={modalMode}
        />
      )}
    </>
  );
}
