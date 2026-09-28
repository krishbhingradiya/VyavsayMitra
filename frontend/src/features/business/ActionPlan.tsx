import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Filter,
  Calendar,
  Sparkles,
  History,
  CheckSquare
} from 'lucide-react';
import { businessesApi } from '../../api/apiClient';
import { useUIStore } from '../../store/useUIStore';
import './ActionPlan.css';

interface Task {
  id: string;
  business_id: string;
  title: string;
  description: string;
  category: 'operations' | 'regulatory' | 'procurement' | 'finance' | 'marketing';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  due_date?: string;
  source: string;
  completed_at?: string;
}

interface ActionPlanProps {
  businessId: string;
  onTaskChange?: () => void;
}

export default function ActionPlan({ businessId, onTaskChange }: ActionPlanProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'operations' | 'regulatory' | 'procurement' | 'finance' | 'marketing'>('operations');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState('');

  const loadActionPlan = async () => {
    try {
      setLoading(true);
      const res = await businessesApi.getActionPlan(businessId);
      if (res.success && res.data) {
        setTasks(res.data.tasks || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load action plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async () => {
    try {
      const res = await businessesApi.getTimeline(businessId);
      if (res.success) {
        setTimelineEvents(res.data || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (businessId) {
      loadActionPlan();
      loadTimeline();
    }
  }, [businessId]);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const res = await businessesApi.updateTask(businessId, taskId, { status: newStatus });
      if (res.success && res.data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, completed_at: res.data.completed_at } : t))
        );
        addToast(`Task marked as ${newStatus.replace('_', ' ')}`, 'success');
        if (onTaskChange) onTaskChange();
        loadTimeline();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to update task', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to remove this action task?')) return;
    try {
      await businessesApi.deleteTask(businessId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      addToast('Task removed', 'info');
      if (onTaskChange) onTaskChange();
      loadTimeline();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete task', 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await businessesApi.createTask(businessId, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory,
        priority: newPriority,
        due_date: newDueDate || undefined
      });
      if (res.success && res.data) {
        setTasks((prev) => [res.data, ...prev]);
        setNewTitle('');
        setNewDesc('');
        setNewDueDate('');
        setIsAddingTask(false);
        addToast('Action task created successfully', 'success');
        if (onTaskChange) onTaskChange();
        loadTimeline();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to create task', 'error');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (selectedStatus === 'pending' && t.status !== 'pending' && t.status !== 'in_progress') return false;
    if (selectedStatus === 'completed' && t.status !== 'completed') return false;
    if (selectedStatus === 'blocked' && t.status !== 'blocked') return false;
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="action-plan-container">
      {/* Top Banner & Progress */}
      <div className="action-plan-header">
        <div>
          <h2 className="action-plan-title flex items-center gap-2">
            <CheckSquare className="text-green-600" size={24} />
            Execution Action Plan & Milestones
          </h2>
          <p className="action-plan-subtitle">
            Step-by-step roadmap to launch, fund, and operate your rural enterprise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn--outline btn--sm flex items-center gap-1"
            onClick={() => setShowTimeline(!showTimeline)}
          >
            <History size={14} />
            {showTimeline ? 'Hide Audit Log' : 'View Audit Log'}
          </button>
          <button
            className="btn btn--green btn--sm flex items-center gap-1"
            onClick={() => setIsAddingTask(!isAddingTask)}
          >
            <Plus size={14} /> Add Action Item
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="action-progress-card">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm">Execution Progress</span>
          <span className="text-sm font-bold text-green-700">{progressPct}% Completed ({completedCount}/{tasks.length})</span>
        </div>
        <div className="action-progress-bar">
          <div className="action-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Add Task Form Modal/Inline */}
      {isAddingTask && (
        <form className="add-task-form" onSubmit={handleCreateTask}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1">
            <Sparkles size={16} className="text-primary" /> Add Custom Execution Task
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="form-label">Task Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Schedule Soil Test at KVK"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={newCategory}
                onChange={(e: any) => setNewCategory(e.target.value)}
              >
                <option value="operations">Operations & Fieldwork</option>
                <option value="regulatory">Regulatory & FSSAI / KYC</option>
                <option value="procurement">Machinery & Vendor Quotes</option>
                <option value="finance">Banking & Subsidy Application</option>
                <option value="marketing">APMC Mandi & Buyer Linkage</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={newPriority}
                onChange={(e: any) => setNewPriority(e.target.value)}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
            <div>
              <label className="form-label">Target Date</label>
              <input
                type="date"
                className="form-input"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Instructions / Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="Operational notes, required contacts, or documents..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setIsAddingTask(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--green btn--sm">
              Save Action Task
            </button>
          </div>
        </form>
      )}

      {/* Audit Log / Timeline Drawer */}
      {showTimeline && (
        <div className="timeline-drawer">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm flex items-center gap-1">
              <History size={16} /> Business Execution Timeline
            </h3>
            <span className="text-xs text-muted">{timelineEvents.length} Recorded Events</span>
          </div>
          {timelineEvents.length === 0 ? (
            <p className="text-xs text-muted">No timeline events recorded yet.</p>
          ) : (
            <div className="timeline-list">
              {timelineEvents.map((ev) => (
                <div key={ev.id} className="timeline-item">
                  <div className="timeline-bullet" />
                  <div className="timeline-content">
                    <span className="timeline-title">{ev.title}</span>
                    {ev.description && <p className="timeline-desc">{ev.description}</p>}
                    <span className="timeline-time">
                      {new Date(ev.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="action-filters-bar">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold flex items-center gap-1 text-muted">
            <Filter size={13} /> Filter Category:
          </span>
          {['all', 'operations', 'regulatory', 'procurement', 'finance', 'marketing'].map((cat) => (
            <button
              key={cat}
              className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All Milestones' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            className="status-filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending / Active</option>
            <option value="completed">Completed Only</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="action-plan-loading">
          <Clock className="animate-spin text-muted" size={24} />
          <p className="text-sm text-muted">Loading execution milestones...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="action-plan-empty">
          <CheckCircle2 size={36} className="text-green-600 mb-2" />
          <h4 className="font-semibold text-sm">No tasks in this category</h4>
          <p className="text-xs text-muted">Switch filters or add custom milestones above.</p>
        </div>
      ) : (
        <div className="action-tasks-grid">
          {filteredTasks.map((t) => {
            const isCompleted = t.status === 'completed';
            return (
              <div
                key={t.id}
                className={`action-task-card ${isCompleted ? 'action-task-card--completed' : ''}`}
              >
                <div className="task-card-main">
                  <div className="task-status-control">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={(e) =>
                        handleStatusChange(t.id, e.target.checked ? 'completed' : 'pending')
                      }
                      className="task-checkbox"
                      id={`chk-${t.id}`}
                    />
                  </div>
                  <div className="task-card-info">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <label htmlFor={`chk-${t.id}`} className="task-card-title cursor-pointer">
                        {t.title}
                      </label>
                      <span className={`task-badge priority--${t.priority}`}>
                        {t.priority.toUpperCase()}
                      </span>
                      <span className="task-badge category--badge">
                        {t.category}
                      </span>
                      {t.source === 'system' && (
                        <span className="task-badge source--system">Standard Baseline</span>
                      )}
                    </div>
                    {t.description && <p className="task-card-desc">{t.description}</p>}
                    <div className="task-card-footer">
                      {t.due_date && (
                        <span className="task-due-date flex items-center gap-1">
                          <Calendar size={12} /> Target: {t.due_date.slice(0, 10)}
                        </span>
                      )}
                      {t.completed_at && (
                        <span className="task-completed-date flex items-center gap-1 text-green-700">
                          <CheckCircle2 size={12} /> Completed: {t.completed_at.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="task-card-actions">
                  <select
                    className="task-status-select"
                    value={t.status}
                    onChange={(e: any) => handleStatusChange(t.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <button
                    className="task-delete-btn"
                    onClick={() => handleDeleteTask(t.id)}
                    title="Delete milestone"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
