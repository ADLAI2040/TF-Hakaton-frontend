import apiClient from '@/api/axios';

export const trainingGroupService = {
  list: () =>
    apiClient.get('/training-groups'),

  create: (payload: object) =>
    apiClient.post('/training-groups', payload),

  update: (id: number, payload: object) =>
    apiClient.put(`/training-groups/${id}`, payload),

  delete: (id: number) =>
    apiClient.delete(`/training-groups/${id}`),

  // Участники группы
  getParticipants: (groupId: number) =>
    apiClient.get(`/training-groups/${groupId}/participants`),

  addParticipant: (groupId: number, payload: { employee_id: number; completion_percent?: number }) =>
    apiClient.post(`/training-groups/${groupId}/participants`, payload),

  updateParticipant: (groupId: number, participantId: number, payload: { completion_percent: number }) =>
    apiClient.patch(`/training-groups/${groupId}/participants/${participantId}`, payload),

  removeParticipant: (groupId: number, participantId: number) =>
    apiClient.delete(`/training-groups/${groupId}/participants/${participantId}`),

  // Статус группы
  changeStatus: (id: number, status: string) =>
    apiClient.patch(`/training-groups/${id}/status`, { status }),
};