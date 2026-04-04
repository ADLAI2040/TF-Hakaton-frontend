import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { courseService } from '@/api/courseService';
import router from '@/router';

export const useCourseStore = defineStore('course', () => {

  const error = ref<string | null>(null);
  const loading = ref(false); 
  const responseData = ref(false); 


  async function create_course(payload: { 
      code: number;
      title: string;
      description: string;
      duration_days: number; 
    }) {
    loading.value = true;
    error.value = null;

    try {
      const { data: response } = await courseService.create(payload);
      responseData.value = response;
    } catch (e: any) {
      // Если Laravel вернул validation errors
      if (e.response?.status === 422) {
        const errors = e.response.data.errors;
        error.value = Object.values(errors).flat().join(', ');
      } else {
        error.value =
          e.response?.data?.message || 'Ошибка регистрации';
      }
      throw e;
    } finally {
      loading.value = false;
    }
}
async function read_courses() {
  const { data: response } = await courseService.read();
  return response; 
}
  async function update_course(id: number, payload: { 
      code: number;
      title: string;
      description: string;
      duration_days: number; 
    }) {
    try {
      const { data: response } = await courseService.update(id, payload);
      responseData.value = response;
      
    } catch (e: any) {
      // Если Laravel вернул validation errors
      if (e.response?.status === 422) {
        const errors = e.response.data.errors;
        error.value = Object.values(errors).flat().join(', ');
      } else {
        error.value =
          e.response?.data?.message || 'Ошибка регистрации';
      }
      throw e;
    } finally {
      loading.value = false;
    }
}
  async function delete_course(id: number) {
    try {
      const { data: response } = await courseService.delete(id);
      responseData.value = response;
    } catch (e: any) {
      // Если Laravel вернул validation errors
      if (e.response?.status === 422) {
        const errors = e.response.data.errors;
        error.value = Object.values(errors).flat().join(', ');
      } else {
        error.value =
          e.response?.data?.message || 'Ошибка регистрации';
      }
      throw e;
    } finally {
      loading.value = false;
    }
}
});
