'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragMoveEvent,
  DragCancelEvent,
  Active,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { ColumnView } from './ColumnView';
import { TaskItem } from './TaskItem';
import { RemoteDragOverlay } from './RemoteDragOverlay';
import { apiClient, ApiError } from '@/lib/api';
import { Loader2, Plus } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export interface Task {
  id: string;
  title: string;
  position: number;
}

export interface Column {
  id: string;
  title: string;
  position: number;
  tasks: Task[];
}

export interface RemoteDragState {
  item: Task | Column;
  type: 'task' | 'column';
  delta: { x: number; y: number };
  user: { name?: string; email?: string };
}

interface BoardCanvasProps {
  boardId: string;
  initialData: {
    columns: Column[];
  };
  onBoardUpdate?: () => void;
}

// Sort helper
export const sortData = (cols: Column[]) => {
  cols.sort((a, b) => a.position - b.position);
  cols.forEach(c => c.tasks.sort((a, b) => a.position - b.position));
  return cols;
};

// Pure function to compute the new columns state during a drag-over
export function computeDragOverState(
  prev: Column[],
  activeId: string,
  overId: string,
  isOverTask: boolean,
  isOverColumn: boolean,
  modifier: number = 0
): Column[] {
  // Dropping a Task over another Task
  if (isOverTask) {
    const activeColumnIndex = prev.findIndex((col) => col.tasks.some((t) => t.id === activeId));
    const overColumnIndex = prev.findIndex((col) => col.tasks.some((t) => t.id === overId));

    if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;

    const activeColumn = prev[activeColumnIndex];
    const overColumn = prev[overColumnIndex];

    if (activeColumn.id !== overColumn.id) {
      // Moved to different column
      const newPrev = [...prev];
      const activeItems = [...activeColumn.tasks];
      const overItems = [...overColumn.tasks];

      const activeIndex = activeItems.findIndex((t) => t.id === activeId);
      const overIndex = overItems.findIndex((t) => t.id === overId);

      const [movedTask] = activeItems.splice(activeIndex, 1);
      overItems.splice(overIndex + modifier, 0, movedTask);

      newPrev[activeColumnIndex] = { ...activeColumn, tasks: activeItems };
      newPrev[overColumnIndex] = { ...overColumn, tasks: overItems };

      return newPrev;
    }

    // Same column
    const newPrev = [...prev];
    const col = newPrev[activeColumnIndex];
    const activeIndex = col.tasks.findIndex((t) => t.id === activeId);
    const overIndex = col.tasks.findIndex((t) => t.id === overId);
    
    const newTasks = arrayMove(col.tasks, activeIndex, overIndex);
    newPrev[activeColumnIndex] = { ...col, tasks: newTasks };
    return newPrev;
  }

  // Dropping a Task over an empty Column
  if (isOverColumn) {
    const activeColumnIndex = prev.findIndex((col) => col.tasks.some((t) => t.id === activeId));
    const overColumnIndex = prev.findIndex((col) => col.id === overId);

    if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;
    if (activeColumnIndex === overColumnIndex) return prev; // handled

    const newPrev = [...prev];
    const activeColumn = newPrev[activeColumnIndex];
    const overColumn = newPrev[overColumnIndex];

    const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
    const [movedTask] = activeColumn.tasks.splice(activeIndex, 1);
    
    const overItems = [...overColumn.tasks];
    overItems.push(movedTask);

    newPrev[activeColumnIndex] = { ...activeColumn };
    newPrev[overColumnIndex] = { ...overColumn, tasks: overItems };

    return newPrev;
  }

  return prev;
}

export function BoardCanvas({ boardId, initialData, onBoardUpdate }: BoardCanvasProps) {
  const [columns, setColumns] = useState<Column[]>(() => sortData([...initialData.columns]));
  const [prevColumnsProp, setPrevColumnsProp] = useState<Column[]>(initialData.columns);

  if (initialData.columns !== prevColumnsProp) {
    setPrevColumnsProp(initialData.columns);
    setColumns(sortData([...initialData.columns]));
  }
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [remoteDrags, setRemoteDrags] = useState<{ [id: string]: RemoteDragState }>({});
  
  const { user } = useAuth();
  
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const addColumnInputRef = useRef<HTMLInputElement>(null);

  // We need to keep a ref to socket for onDragMove
  const socketRef = useRef<Socket | null>(null);



  const fetchBoard = useCallback(async () => {
    try {
      const data = await apiClient(`/api/boards/${boardId}`);
      setColumns(sortData(data.columns));
    } catch (e: unknown) {
      console.error(e);
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
        window.location.reload();
      }
    }
  }, [boardId]);

  // WebSocket Setup
  useEffect(() => {
    const token = Cookies.get('accessToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    const newSocket: Socket = io(`${apiUrl}/boards`, {
      auth: { token },
    });
    socketRef.current = newSocket;

    if (newSocket.connected) {
      newSocket.emit('join-board', { boardId });
    }

    newSocket.on('connect', () => {
      newSocket.emit('join-board', { boardId });
    });

    const handleUpdate = () => fetchBoard();

    newSocket.on('task:created', handleUpdate);
    newSocket.on('task:moved', (payload: { taskId: string; toColumnId: string; position: number }) => {
      setColumns(prev => {
        let movedTask: Task | undefined;
        // Find the task
        for (const col of prev) {
          const t = col.tasks.find(t => t.id === payload.taskId);
          if (t) movedTask = t;
        }

        if (!movedTask) return prev; // If not found, just wait for fetchBoard

        // Remove from ALL columns first to prevent duplicates (especially when receiving our own broadcast)
        const next = prev.map(col => {
          const newCol = { ...col };
          newCol.tasks = newCol.tasks.filter(t => t.id !== payload.taskId);
          
          if (newCol.id === payload.toColumnId) {
            newCol.tasks = [...newCol.tasks, { ...movedTask!, position: payload.position }];
            newCol.tasks.sort((a, b) => a.position - b.position);
          }
          return newCol;
        });
        return next;
      });
      handleUpdate(); // Refetch to guarantee consistency (handles edge cases seamlessly in background)
    });
    newSocket.on('column:created', handleUpdate);
    newSocket.on('column:updated', handleUpdate);
    newSocket.on('column:reordered', handleUpdate);
    newSocket.on('column:deleted', handleUpdate);
    newSocket.on('task:deleted', handleUpdate);
    newSocket.on('task:updated', handleUpdate);
    newSocket.on('member:added', handleUpdate);
    newSocket.on('member:removed', handleUpdate);
    newSocket.on('board:updated', () => {
      handleUpdate();
      if (onBoardUpdate) {
        onBoardUpdate();
      }
    });

    newSocket.on('task:drag-move', (payload: { taskId: string; task: Task; delta: { x: number; y: number }; user: { name?: string; email?: string } }) => {
      setRemoteDrags(prev => ({
        ...prev,
        [payload.taskId]: {
          item: payload.task,
          type: 'task',
          delta: payload.delta,
          user: payload.user,
        }
      }));
    });

    newSocket.on('task:drag-end', (payload: { taskId: string }) => {
      setRemoteDrags(prev => {
        const next = { ...prev };
        delete next[payload.taskId];
        return next;
      });
      handleUpdate();
    });

    newSocket.on('column:drag-move', (payload: { columnId: string; column: Column; delta: { x: number; y: number }; user: { name?: string; email?: string } }) => {
      setRemoteDrags(prev => ({
        ...prev,
        [payload.columnId]: {
          item: payload.column,
          type: 'column',
          delta: payload.delta,
          user: payload.user,
        }
      }));
    });

    newSocket.on('column:drag-end', (payload: { columnId: string }) => {
      setRemoteDrags(prev => {
        const next = { ...prev };
        delete next[payload.columnId];
        return next;
      });
      handleUpdate();
    });

    newSocket.on('column:drag-over-state', (payload: { activeId: string; overId: string }) => {
      setColumns(prev => {
        const oldIndex = prev.findIndex(c => c.id === payload.activeId);
        const newIndex = prev.findIndex(c => c.id === payload.overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    });

    newSocket.on('task:drag-over-state', (payload: { activeId: string; overId: string; isOverTask: boolean; isOverColumn: boolean; modifier?: number }) => {
      // Receive drag over state from another client and compute new column arrangement
      setColumns(prev => computeDragOverState(
        prev, 
        payload.activeId, 
        payload.overId, 
        payload.isOverTask, 
        payload.isOverColumn,
        payload.modifier || 0
      ));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [boardId, fetchBoard, onBoardUpdate]);

  function getActiveType(active: Active) {
    if (active?.data?.current?.type) return active.data.current.type;
    if (activeTask && active?.id === activeTask.id) return 'Task';
    if (activeColumn && active?.id === activeColumn.id) return 'Column';
    return null;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    const { active } = event;
    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task);
    } else if (active.data.current?.type === 'Column') {
      setActiveColumn(active.data.current.column);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const activeType = getActiveType(active);
    const isActiveTask = activeType === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) {
      // It's a column being dragged
      if (socketRef.current) {
        let overColumnId = overId;
        if (isOverTask) {
          // If we hover over a task, find its parent column
          const targetCol = columns.find(c => c.tasks.some(t => String(t.id) === overId));
          if (targetCol) {
            overColumnId = targetCol.id;
          }
        }
        socketRef.current.emit('column:drag-over-state', {
          boardId,
          activeId,
          overId: overColumnId
        });
      }
      // Return early because for the local user, DndKit's SortableContext handles the visual column swapping using CSS transforms
      return;
    }

    let modifier = 0;
    if (isOverTask && active.rect.current.translated && over.rect) {
      const isBelowOverItem =
        active.rect.current.translated.top > over.rect.top + over.rect.height / 2;
      modifier = isBelowOverItem ? 1 : 0;
    }

    setColumns((prev) => {
      const next = computeDragOverState(prev, activeId, overId, isOverTask, isOverColumn, modifier);
      
      // If the state actually changed, broadcast it!
      if (next !== prev && socketRef.current) {
        socketRef.current.emit('task:drag-over-state', {
          boardId,
          activeId,
          overId,
          isOverTask,
          isOverColumn,
          modifier
        });
      }
      return next;
    });
  };

  // Prevent stray drag-move emissions after drag-end has been triggered
  const isDraggingRef = useRef(false);
  const lastEmitTime = useRef(0);

  const handleDragMove = (event: DragMoveEvent) => {
    if (!socketRef.current || !event.active || !isDraggingRef.current) return;
    const now = Date.now();
    // throttle to ~30ms (approx 30fps)
    if (now - lastEmitTime.current > 30) {
      const { active } = event;
      const type = getActiveType(active);
      if (type === 'Task' && activeTask) {
        socketRef.current.emit('task:drag-move', {
          boardId,
          taskId: active.id,
          task: activeTask,
          delta: event.delta,
          user: { name: user?.name, email: user?.email }
        });
      } else if (type === 'Column' && activeColumn) {
        socketRef.current.emit('column:drag-move', {
          boardId,
          columnId: active.id,
          column: activeColumn,
          delta: event.delta,
          user: { name: user?.name, email: user?.email }
        });
      }
      lastEmitTime.current = now;
    }
  };

  const emitDragEnd = (event: DragEndEvent | DragCancelEvent) => {
    if (!socketRef.current || !event.active) return;
    const { active } = event;
    const type = getActiveType(active);
    
    if (type === 'Task') {
      socketRef.current.emit('task:drag-end', { boardId, taskId: active.id });
    } else if (type === 'Column') {
      socketRef.current.emit('column:drag-end', { boardId, columnId: active.id });
    }
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    isDraggingRef.current = false;
    emitDragEnd(event);
    setActiveTask(null);
    setActiveColumn(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    isDraggingRef.current = false;
    emitDragEnd(event);
    
    const { active, over } = event;
    const type = getActiveType(active);
    const isActiveColumn = type === 'Column';
    
    if (isActiveColumn) {
      if (over && active.id !== over.id) {
        const activeId = String(active.id);
        
        let overColumnId = String(over.id);
        if (over.data.current?.type === 'Task') {
          // If we drag a column over a task, find the column that task belongs to
          const targetCol = columns.find(c => c.tasks.some(t => String(t.id) === String(over.id)));
          if (targetCol) {
            overColumnId = targetCol.id;
          }
        }

        if (activeId !== overColumnId) {
          let newPosition = 1.0;
          setColumns(prev => {
            const oldIndex = prev.findIndex(c => c.id === activeId);
            const newIndex = prev.findIndex(c => c.id === overColumnId);
            
            if (oldIndex === -1 || newIndex === -1) return prev;

            const nextCols = arrayMove(prev, oldIndex, newIndex);
            
            if (newIndex === 0) {
              newPosition = (nextCols[1]?.position || 2.0) / 2;
            } else if (newIndex === nextCols.length - 1) {
              newPosition = nextCols[newIndex - 1].position + 1.0;
            } else {
              newPosition = (nextCols[newIndex - 1].position + nextCols[newIndex + 1].position) / 2;
            }
            return nextCols;
          });

          try {
            await apiClient(`/api/columns/${activeId}/reorder`, {
              method: 'PATCH',
              body: JSON.stringify({ position: newPosition }),
            });
          } catch (e) {
            console.error('Failed to move column', e);
            fetchBoard();
          }
        }
      }
      setActiveColumn(null);
      return;
    }

    setActiveTask(null);
    if (!over) return;

    const activeId = active.id;

    // Find the final column and index of the dragged item
    let targetColumnId = '';
    let targetIndex = -1;

    // Check where it landed in our local state
    columns.forEach(col => {
      const idx = col.tasks.findIndex(t => t.id === activeId);
      if (idx !== -1) {
        targetColumnId = col.id;
        targetIndex = idx;
      }
    });

    if (targetColumnId !== '') {
      // API call to backend to finalize move (Fractional Indexing)
      try {
        await apiClient(`/api/tasks/${activeId}/move`, {
          method: 'PATCH',
          body: JSON.stringify({
            targetColumnId,
            position: targetIndex,
          }),
        });
      } catch (e) {
        console.error('Failed to move task', e);
        // revert by refetching
        fetchBoard();
      }
    }
  };

  useEffect(() => {
    if (showAddColumn && addColumnInputRef.current) {
      addColumnInputRef.current.focus();
    }
  }, [showAddColumn]);

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    setCreatingColumn(true);
    try {
      await apiClient(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        body: JSON.stringify({ title: newColumnTitle }),
      });
      // socket will trigger a re-fetch, but we can optimistically fetch here
      fetchBoard();
      setNewColumnTitle('');
      setShowAddColumn(false);
    } catch (err: unknown) {
      if (err instanceof Error || err instanceof ApiError) {
        toast.error(err.message || 'Failed to create column');
      } else {
        toast.error('Failed to create column');
      }
    } finally {
      setCreatingColumn(false);
    }
  };

  const handleCreateTask = async (columnId: string, title: string) => {
    try {
      await apiClient(`/api/columns/${columnId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      // Fallback/immediate update if WS is delayed
      fetchBoard();
    } catch (err: unknown) {
      if (err instanceof Error || err instanceof ApiError) {
        toast.error(err.message || 'Failed to create task');
      } else {
        toast.error('Failed to create task');
      }
    }
  };

  const handleDeleteTask = (taskId: string) => {
    toast('Delete this task?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await apiClient(`/api/tasks/${taskId}`, { method: 'DELETE' });
            fetchBoard();
            toast.success('Task deleted');
          } catch (err: unknown) {
            if (err instanceof Error || err instanceof ApiError) {
              toast.error(err.message || 'Failed to delete task');
            } else {
              toast.error('Failed to delete task');
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

  const handleUpdateTask = () => {
    fetchBoard();
  };

  return (
    <div className="flex flex-col h-full flex-1">
      {/* Top-left Add Column button/form */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        {!showAddColumn ? (
          <button
            onClick={() => setShowAddColumn(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 bg-white/60 backdrop-blur-sm border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-3 py-1.5 transition-all duration-200 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add column
          </button>
        ) : (
          <form 
            onSubmit={handleCreateColumn} 
            className="inline-flex items-center"
          >
            <input
              ref={addColumnInputRef}
              type="text"
              placeholder="Column title..."
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onBlur={() => {
                if (!newColumnTitle.trim()) {
                  setShowAddColumn(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowAddColumn(false);
                  setNewColumnTitle('');
                }
              }}
              className="w-48 bg-white border border-slate-300 rounded-l-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
            />
            <button
              type="submit"
              onMouseDown={(e) => e.preventDefault()} // prevent blur before submit fires
              disabled={creatingColumn || !newColumnTitle.trim()}
              className="bg-blue-500 text-white px-3 py-1.5 rounded-r-lg border border-transparent hover:bg-blue-600 disabled:opacity-50 text-sm font-medium transition-colors duration-150"
            >
              {creatingColumn ? <Loader2 className="animate-spin h-4 w-4" /> : 'Add'}
            </button>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="max-w-6xl mx-auto w-full min-h-full h-full px-4 sm:px-6 lg:px-8 pb-6">
            <SortableContext items={columns.map(c => c.id)} strategy={rectSortingStrategy}>
              {columns.length === 0 ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-12 h-64 text-center mt-8">
                  <h3 className="text-lg font-medium text-slate-500 mb-2">No columns yet</h3>
                  <p className="text-sm text-slate-400">
                    Click on add column to add one
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  {columns.map((column) => (
                    <ColumnView 
                      key={column.id} 
                      column={column} 
                      onAddTask={handleCreateTask}
                      onDeleteTask={handleDeleteTask}
                      onUpdateTask={handleUpdateTask}
                      onUpdateColumn={fetchBoard}
                      remoteDrags={remoteDrags}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="shadow-lg rotate-2">
                <TaskItem task={activeTask} onDelete={() => {}} onUpdate={() => {}} />
              </div>
            ) : null}
            {activeColumn ? (
              <div className="shadow-lg rotate-2 opacity-90 h-full max-h-full flex">
                <ColumnView 
                  column={activeColumn} 
                  onAddTask={async () => {}}
                  onDeleteTask={() => {}}
                  onUpdateTask={() => {}}
                  onUpdateColumn={() => {}}
                  remoteDrags={{}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Render remote drags */}
        {Object.values(remoteDrags).map((drag) => (
          <RemoteDragOverlay
            key={drag.item.id}
            item={drag.item}
            type={drag.type}
            delta={drag.delta}
            user={drag.user}
          />
        ))}
      </div>
    </div>
  );
}
