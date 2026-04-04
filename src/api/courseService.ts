import apiClient from '@/api/axios';


export const courseService = {

  read() {
    return apiClient.get(`/courses/list`);
  },
    

  create(data: { 
      code: number;
      title: string;
      description: string;
      duration_days: number; 
    }) {
    return apiClient.post(`/courses/list`, data);
  },

  update(id: Number,
    data: { 
      code: number;
      title: string;
      description: string;
      duration_days: number; 
    }) {
    return apiClient.post(`/courses/${id}`, data);
  },

  delete(id: Number) {
    return apiClient.delete(`/courses/${id}/soft`);
  }
};
