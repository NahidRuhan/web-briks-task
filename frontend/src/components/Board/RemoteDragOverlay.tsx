import React, { useEffect, useState } from 'react';
import { GripVertical, GripHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Task, Column } from './BoardCanvas';

interface RemoteDragOverlayProps {
  item: Task | Column;
  type: 'task' | 'column';
  delta: { x: number; y: number };
  user: { name?: string; email?: string };
}

export function RemoteDragOverlay({ item, type, delta, user }: RemoteDragOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defers the state updates to prevent synchronous setState cascading renders
    const timer = setTimeout(() => {
      setMounted(true);
      const elementId = type === 'column' ? `column-${item.id}` : `task-${item.id}`;
      const el = document.getElementById(elementId);
      if (el) {
        setRect(el.getBoundingClientRect());
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [item.id, type]);

  if (!rect || !mounted) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    transform: `translate3d(${delta.x}px, ${delta.y}px, 0)`,
    transition: 'transform 0.05s linear',
    pointerEvents: 'none',
    zIndex: 9999,
  };

  return createPortal(
    <div style={style}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 4px 12px rgba(59,130,246,0.15); }
          50% { box-shadow: 0 4px 20px rgba(59,130,246,0.4); }
        }
      `}</style>
      
      {type === 'column' ? (
        <div 
          className="w-full h-full flex flex-col rounded-xl bg-[#F1F3F9] shadow-[0_12px_24px_rgba(59,130,246,0.2)] border-2 border-blue-400 opacity-95 overflow-hidden relative"
          style={{ animation: 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
        >
          <div className="h-1 absolute top-0 left-0 right-0 w-full bg-blue-400" />
          <div className="p-3 pt-4 font-semibold text-slate-800 flex items-center">
            <GripHorizontal className="w-4 h-4 mr-2 text-blue-500" />
            <span className="truncate flex-1 text-sm">{item.title}</span>
            <span className="ml-2 bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{('tasks' in item ? item.tasks.length : 0)}</span>
          </div>
          
          <div className="flex-1 p-3 pt-0 flex flex-col gap-3 overflow-hidden pointer-events-none">
            {('tasks' in item ? item.tasks.slice(0, 5) : []).map((task) => (
              <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 pointer-events-none">
                <span className="text-sm font-medium text-slate-700">{task.title}</span>
              </div>
            ))}
            {('tasks' in item && item.tasks.length > 5) && (
              <div className="text-center text-xs text-slate-400 font-medium py-1">
                + {item.tasks.length - 5} more tasks
              </div>
            )}
          </div>

          <div className="absolute -top-3 -right-2 bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full shadow-md truncate max-w-37.5 font-medium tracking-wide z-10 border-2 border-white pointer-events-none">
            {user?.name || user?.email || 'Someone is moving this'}
          </div>
        </div>
      ) : (
        <div 
          className="bg-white p-3 rounded-lg shadow-[0_4px_12px_rgba(59,130,246,0.15)] border-2 border-blue-400 opacity-100 wrap-break-words flex items-center relative h-full w-full"
          style={{ animation: 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
        >
          <div className="mr-2 text-blue-400">
            <GripVertical className="h-4 w-4 stroke-[1.5]" />
          </div>
          <div className="flex-1 text-sm text-slate-700 font-medium truncate">
            {item.title}
          </div>
          <div className="absolute -top-8 right-0 bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full shadow-md truncate max-w-37.5 font-medium tracking-wide pointer-events-none">
            {user?.name || user?.email || 'Someone is moving this'}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
