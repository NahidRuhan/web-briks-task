import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { TaskItem } from './TaskItem';

// Mock useSortable to avoid context issues during simple component rendering
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

describe('TaskItem', () => {
  it('renders the task title correctly', () => {
    const mockTask = { id: 'task-1', title: 'Test Task 123' };
    render(
      <TaskItem 
        task={mockTask} 
        onDelete={() => {}} 
        onUpdate={() => {}} 
      />
    );
    
    expect(screen.getByText('Test Task 123')).toBeInTheDocument();
  });
});
