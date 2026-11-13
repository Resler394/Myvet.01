import React, { useState } from 'react';
import {
  ListTodo,
  RotateCw,
  Plus,
  AlertTriangle,
  FileText,
  Stethoscope,
  MessageSquare,
  ChevronDown,
  Check,
  Send
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { Task, TaskPriority, TaskCategory, TeamMember } from '../types';
import { REFERENCE_DATE } from '../services/storage';
import { useClinicData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export const TeamTasksPage: React.FC = () => {
  const { session } = useAuth();
  const {
    tasks,
    loading,
    refreshAll,
    createTask,
    updateTask,
    toggleTaskCompletion,
    addTaskComment,
  } = useClinicData();

  const currentUserName = session.user?.fullName || 'Dr. Vétérinaire';

  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("Toute l'équipe");
  const [statusFilter, setStatusFilter] = useState<'À faire' | 'Mes tâches' | 'Toutes' | 'Terminées'>('À faire');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    category: TaskCategory;
    assignedTo: TeamMember;
    dueDate: string;
  }>({
    title: '',
    description: '',
    priority: 'Normale',
    category: 'Médicale',
    assignedTo: 'Dr. Martin',
    dueDate: '2026-08-15'
  });

  const isOverdue = (task: Task) => {
    if (task.completed) return false;
    const due = new Date(task.dueDate);
    return due < REFERENCE_DATE;
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const myTasks = tasks.filter(t => !t.completed && t.assignedTo === currentUserName);
  const overdueTasks = tasks.filter(t => isOverdue(t));
  const urgentTasks = tasks.filter(t => !t.completed && t.priority === 'Urgente');

  const martinCount = pendingTasks.filter(t => t.assignedTo === 'Dr. Martin').length;
  const leroyCount = pendingTasks.filter(t => t.assignedTo === 'Dr. Leroy').length;
  const bernardCount = pendingTasks.filter(t => t.assignedTo === 'Dr. Bernard').length;

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === 'À faire' && t.completed) return false;
    if (statusFilter === 'Terminées' && !t.completed) return false;
    if (statusFilter === 'Mes tâches' && (t.completed || t.assignedTo !== currentUserName)) return false;

    if (selectedTeamMember !== "Toute l'équipe" && t.assignedTo !== selectedTeamMember) {
      return false;
    }

    return true;
  });

  const handleToggleTask = async (id: string) => {
    setActionError(null);
    try {
      await toggleTaskCompletion(id);
    } catch (err: any) {
      setActionError(err?.message || 'Erreur lors de la mise à jour.');
    }
  };

  const handleAssignChange = async (taskId: string, newAssignee: TeamMember) => {
    setActionError(null);
    try {
      await updateTask(taskId, { assignedTo: newAssignee });
    } catch (err: any) {
      setActionError(err?.message || "Erreur lors de l'assignation.");
    }
  };

  const toggleComments = (taskId: string) => {
    setExpandedComments(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleAddComment = async (taskId: string) => {
    const text = newCommentText[taskId];
    if (!text || !text.trim()) return;
    setActionError(null);
    try {
      await addTaskComment(taskId, text.trim());
      setNewCommentText(prev => ({ ...prev, [taskId]: '' }));
    } catch (err: any) {
      setActionError(err?.message || "Erreur lors de l'ajout du commentaire.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const dateObj = new Date(newTaskForm.dueDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;

    try {
      await createTask({
        title: newTaskForm.title,
        description: newTaskForm.description,
        priority: newTaskForm.priority,
        category: newTaskForm.category,
        assignedTo: newTaskForm.assignedTo,
        createdBy: currentUserName,
        dueDate: newTaskForm.dueDate,
        dueDateFormatted: formatted
      });

      setIsNewTaskModalOpen(false);
      setNewTaskForm({
        title: '',
        description: '',
        priority: 'Normale',
        category: 'Médicale',
        assignedTo: 'Dr. Martin',
        dueDate: '2026-08-15'
      });
    } catch (err: any) {
      setActionError(err?.message || 'Impossible de créer la tâche.');
    }
  };

  const getInitials = (name: string) => {
    if (name === 'Dr. Martin') return 'DM';
    if (name === 'Dr. Leroy') return 'DL';
    if (name === 'Dr. Bernard') return 'DB';
    return 'DV';
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1580px] w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ListTodo className="w-7 h-7 text-[#3A683D]" />
            <h1 className="text-[26px] font-bold text-[#1B2F1C] tracking-tight">
              Tâches d'équipe
            </h1>
          </div>
          <p className="text-[14px] text-[#52604C] mt-0.5">
            Création, assignation et suivi des tâches médicales et administratives
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => refreshAll()}
            disabled={loading}
            className="px-4 py-2 bg-white border border-[#C7D2BA] text-[#1B2F1C] text-[13px] font-semibold rounded-xl hover:bg-[#F8F8F1] transition-colors flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 text-[#52604C] ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="bg-[#3A683D] hover:bg-[#2F5933] text-white px-5 py-2 rounded-xl font-semibold text-[13.5px] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle tâche</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECDD3] rounded-xl text-[13px] text-[#991B1B] flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs font-bold underline cursor-pointer">Fermer</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="En attente" value={pendingTasks.length} />
        <StatCard title="Mes tâches" value={myTasks.length} valueColor="text-[#3A683D]" />
        <StatCard title="En retard" value={overdueTasks.length} valueColor="text-[#D97706]" />
        <StatCard title="Urgentes" value={urgentTasks.length} valueColor="text-[#DC2626]" />
      </div>

      <div className="bg-white rounded-2xl border border-[#C7D2BA] p-5 shadow-2xs space-y-3">
        <span className="block text-[13.5px] font-bold text-[#1B2F1C]">
          Équipe — tâches en attente
        </span>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setSelectedTeamMember("Toute l'équipe")}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
              selectedTeamMember === "Toute l'équipe"
                ? 'bg-[#E7ECD9] text-[#1B2F1C] border border-[#C7D2BA]'
                : 'bg-white text-[#52604C] border border-[#C7D2BA] hover:bg-[#F8F8F1]'
            }`}
          >
            Toute l'équipe
          </button>

          {[
            { name: 'Dr. Martin', initials: 'DM', count: martinCount },
            { name: 'Dr. Leroy', initials: 'DL', count: leroyCount },
            { name: 'Dr. Bernard', initials: 'DB', count: bernardCount },
          ].map(member => (
            <button
              key={member.name}
              onClick={() => setSelectedTeamMember(member.name)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                selectedTeamMember === member.name
                  ? 'bg-[#E7ECD9] text-[#1B2F1C] border border-[#C7D2BA]'
                  : 'bg-white text-[#52604C] border border-[#C7D2BA] hover:bg-[#F8F8F1]'
              }`}
            >
              <div className="relative">
                <span className="w-6 h-6 rounded-full bg-[#E7ECD9] text-[#3A683D] font-bold text-[10px] flex items-center justify-center">
                  {member.initials}
                </span>
                {member.count > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[#3A683D] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    {member.count}
                  </span>
                )}
              </div>
              <span>{member.name}</span>
            </button>
          ))}

          <button
            onClick={() => setSelectedTeamMember('Dr. Vétérinaire')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
              selectedTeamMember === 'Dr. Vétérinaire'
                ? 'bg-[#E7ECD9] text-[#1B2F1C] border border-[#C7D2BA]'
                : 'bg-white text-[#52604C] border border-[#C7D2BA] hover:bg-[#F8F8F1]'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-[#E7ECD9] text-[#3A683D] font-bold text-[10px] flex items-center justify-center">
              DV
            </span>
            <span>Dr. Vétérinaire</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['À faire', 'Mes tâches', 'Toutes', 'Terminées'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
              statusFilter === filter
                ? 'bg-[#E7ECD9] text-[#1B2F1C] border border-[#C7D2BA]'
                : 'bg-white text-[#52604C] border border-[#C7D2BA] hover:bg-[#F8F8F1]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredTasks.map((task) => {
          const overdue = isOverdue(task);
          const isExpanded = !!expandedComments[task.id];

          return (
            <div
              key={task.id}
              className={`bg-white rounded-2xl border p-5 transition-all shadow-2xs ${
                overdue && !task.completed
                  ? 'border-[#FECDD3] bg-gradient-to-r from-[#FFFBFB] to-white'
                  : 'border-[#C7D2BA]'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleTask(task.id)}
                  className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                    task.completed
                      ? 'bg-[#3A683D] border-[#3A683D] text-white'
                      : 'border-[#C7D2BA] hover:border-[#3A683D] bg-white'
                  }`}
                  title={task.completed ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
                >
                  {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <h3
                      className={`text-[15.5px] font-bold text-[#1B2F1C] ${
                        task.completed ? 'line-through text-[#859766]' : ''
                      }`}
                    >
                      {task.title}
                    </h3>

                    {task.priority === 'Urgente' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FEE2E2] text-[#DC2626]">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Urgente</span>
                      </span>
                    )}
                    {task.priority === 'Haute' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                        <span>Haute</span>
                      </span>
                    )}
                    {task.priority === 'Normale' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#E7ECD9] text-[#1B2F1C]">
                        <span>Normale</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#E7ECD9] text-[#3A683D]">
                      {task.category === 'Médicale' ? (
                        <Stethoscope className="w-3 h-3 text-[#3A683D]" />
                      ) : (
                        <FileText className="w-3 h-3 text-[#52604C]" />
                      )}
                      <span>{task.category}</span>
                    </span>

                    {overdue && (
                      <span className="text-[12px] font-semibold text-[#DC2626] ml-1">
                        En retard
                      </span>
                    )}
                  </div>

                  <p className="text-[13.5px] text-[#52604C] leading-relaxed">
                    {task.description}
                  </p>

                  <div className="flex items-center flex-wrap gap-2 text-[12.5px] text-[#52604C]">
                    <span>
                      Échéance : <strong className="text-[#1B2F1C]">{task.dueDateFormatted}</strong>
                    </span>
                    <span className="text-[#C7D2BA]">·</span>
                    <span>
                      Créée par : <strong className="text-[#1B2F1C]">{task.createdBy}</strong>
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap gap-4 pt-1">
                    <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#C7D2BA] rounded-lg text-[13px] shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-[#E7ECD9] text-[#3A683D] font-bold text-[9px] flex items-center justify-center">
                        {getInitials(task.assignedTo)}
                      </span>
                      <select
                        value={task.assignedTo}
                        onChange={(e) => handleAssignChange(task.id, e.target.value as TeamMember)}
                        className="bg-transparent font-medium text-[#1B2F1C] text-[13px] focus:outline-none cursor-pointer pr-4"
                      >
                        <option value="Dr. Martin">Dr. Martin</option>
                        <option value="Dr. Leroy">Dr. Leroy</option>
                        <option value="Dr. Bernard">Dr. Bernard</option>
                        <option value="Dr. Vétérinaire">Dr. Vétérinaire</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#859766] pointer-events-none absolute right-2" />
                    </div>

                    <button
                      onClick={() => toggleComments(task.id)}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#52604C] hover:text-[#1B2F1C] transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#859766]" />
                      <span>{task.comments?.length || 0} commentaire(s)</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#859766] transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#E7ECD9] space-y-3">
                      {task.comments && task.comments.length > 0 ? (
                        <div className="space-y-2">
                          {task.comments.map((c) => (
                            <div
                              key={c.id}
                              className="bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl p-3 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11.5px] text-[#859766]">
                                <span className="font-semibold text-[#1B2F1C]">{c.author}</span>
                                <span>{c.date}</span>
                              </div>
                              <p className="text-[12.5px] text-[#52604C]">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] text-[#859766] italic">
                          Aucun commentaire pour le moment.
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newCommentText[task.id] || ''}
                          onChange={(e) =>
                            setNewCommentText(prev => ({ ...prev, [task.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddComment(task.id);
                            }
                          }}
                          placeholder="Ajouter une note ou un commentaire..."
                          className="flex-1 px-3 py-1.5 bg-[#F8F8F1] border border-[#C7D2BA] rounded-xl text-[13px] focus:outline-none focus:border-[#3A683D] focus:bg-white"
                        />
                        <button
                          onClick={() => handleAddComment(task.id)}
                          className="px-3 py-1.5 bg-[#3A683D] text-white rounded-xl text-[12px] font-semibold hover:bg-[#2F5933] flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Publier</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#C7D2BA] text-[#52604C]">
            Aucune tâche trouvée pour ce filtre.
          </div>
        )}
      </div>

      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Créer une nouvelle tâche d'équipe"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
              Titre de la tâche *
            </label>
            <input
              type="text"
              value={newTaskForm.title}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
              placeholder="Ex : Commande vaccins rage, Pansement..."
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:outline-none focus:border-[#3A683D]"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
              Description / Instructions cliniques *
            </label>
            <textarea
              value={newTaskForm.description}
              onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
              rows={3}
              placeholder="Précisez les consignes, références ou doses..."
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:outline-none focus:border-[#3A683D]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
                Priorité *
              </label>
              <select
                value={newTaskForm.priority}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              >
                <option value="Normale">Normale</option>
                <option value="Haute">Haute</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
                Catégorie *
              </label>
              <select
                value={newTaskForm.category}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value as TaskCategory })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              >
                <option value="Médicale">Médicale</option>
                <option value="Administrative">Administrative</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
                Assignée à *
              </label>
              <select
                value={newTaskForm.assignedTo}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, assignedTo: e.target.value as TeamMember })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
              >
                <option value="Dr. Martin">Dr. Martin</option>
                <option value="Dr. Leroy">Dr. Leroy</option>
                <option value="Dr. Bernard">Dr. Bernard</option>
                <option value="Dr. Vétérinaire">Dr. Vétérinaire</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#1B2F1C] mb-1">
                Date d'échéance *
              </label>
              <input
                type="date"
                value={newTaskForm.dueDate}
                onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-[14px] bg-white border border-[#C7D2BA] rounded-xl focus:border-[#3A683D] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E7ECD9]">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-2 border border-[#C7D2BA] text-[#52604C] rounded-xl text-[13px] font-medium hover:bg-[#F8F8F1] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#3A683D] text-white rounded-xl text-[13px] font-medium hover:bg-[#2F5933] cursor-pointer"
            >
              Créer la tâche
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
