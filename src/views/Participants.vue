<template>
  <div>
    <PageHeader title="Участники обучения" description="Реестр сотрудников для обучения">
      <Button class="gap-2" @click="openCreate" :disabled="submitting">
        <Plus class="w-4 h-4" />
        Добавить участника
      </Button>
    </PageHeader>

    <!-- SEARCH -->
    <div class="relative mb-6 max-w-sm">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        v-model="search"
        placeholder="Поиск по ФИО, email, компании..."
        class="pl-10"
        :disabled="loading"
      />
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="flex items-center justify-center h-96">
      <div class="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>

    <!-- EMPTY -->
    <EmptyState
      v-else-if="filtered.length === 0"
      :icon="Users"
      title="Нет участников"
      :description="search ? 'Ничего не найдено по вашему запросу' : 'Добавьте первого участника'"
    >
      <Button variant="outline" class="gap-2" @click="openCreate" :disabled="submitting">
        <Plus class="w-4 h-4" />
        Добавить
      </Button>
    </EmptyState>

    <!-- TABLE -->
    <div v-else class="bg-card rounded-2xl border border-border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              <th class="text-left px-6 py-3 text-xs uppercase text-muted-foreground">ФИО</th>
              <th class="text-left px-6 py-3 text-xs uppercase text-muted-foreground">Компания</th>
              <th class="text-left px-6 py-3 text-xs uppercase text-muted-foreground">Email</th>
              <th class="text-left px-6 py-3 text-xs uppercase text-muted-foreground min-w-[200px]">Учебные группы</th>
              <th class="text-right px-6 py-3 text-xs uppercase text-muted-foreground w-24">Действия</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-border">
            <tr 
              v-for="emp in filtered" 
              :key="emp.id" 
              class="hover:bg-muted/30 transition-colors"
              :class="{ 'opacity-50': deletingId === emp.id }"
            >
              <td class="px-6 py-4 font-medium truncate max-w-[200px]">{{ emp.full_name }}</td>
              <td class="px-6 py-4 text-sm text-muted-foreground truncate max-w-[150px]">{{ emp.company_name || "—" }}</td>
              <td class="px-6 py-4 text-sm truncate max-w-[180px]">{{ emp.email || "—" }}</td>

              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1.5">
                  <template v-if="emp.training_groups?.length">
                    <router-link
                      v-for="grp in emp.training_groups"
                      :key="grp.id"
                      :to="`/groups/${grp.id}`"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      :title="`${grp.name} • ${getStatusLabel(grp.status)}`"
                    >
                      {{ grp.name }}
                      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="getStatusColor(grp.status)" />
                    </router-link>
                  </template>
                  <span v-else class="text-xs text-muted-foreground">—</span>
                </div>
              </td>

              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" class="h-8 w-8" @click="openEdit(emp)" :disabled="submitting || deletingId === emp.id">
                    <Pencil class="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" class="h-8 w-8 text-destructive" @click="handleDelete(emp.id)" :disabled="submitting || deletingId === emp.id">
                    <Loader2 v-if="deletingId === emp.id" class="w-3.5 h-3.5 animate-spin" />
                    <Trash2 v-else class="w-3.5 h-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL -->
    <Transition name="modal">
      <div v-if="dialogOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keyup.escape="closeModal">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeModal" />

        <div class="relative bg-card rounded-2xl p-6 w-full max-w-lg z-10 border border-border shadow-xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">{{ editing ? "Редактировать сотрудника" : "Новый сотрудник" }}</h2>
            <Button variant="ghost" size="icon" class="h-8 w-8" @click="closeModal" :disabled="submitting">
              <X class="w-4 h-4" />
            </Button>
          </div>

          <form @submit.prevent="handleSave" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label>Табельный номер *</Label>
                <Input v-model="form.employee_code" :disabled="submitting || !!editing" :class="{ 'border-destructive': errors.employee_code }" />
                <p v-if="errors.employee_code" class="text-xs text-destructive">{{ errors.employee_code[0] }}</p>
              </div>
              <div class="space-y-1.5">
                <Label>Email</Label>
                <Input v-model="form.email" type="email" :disabled="submitting" :class="{ 'border-destructive': errors.email }" />
                <p v-if="errors.email" class="text-xs text-destructive">{{ errors.email[0] }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label>Фамилия *</Label>
                <Input v-model="form.last_name" :disabled="submitting" :class="{ 'border-destructive': errors.last_name }" />
                <p v-if="errors.last_name" class="text-xs text-destructive">{{ errors.last_name[0] }}</p>
              </div>
              <div class="space-y-1.5">
                <Label>Имя *</Label>
                <Input v-model="form.first_name" :disabled="submitting" :class="{ 'border-destructive': errors.first_name }" />
                <p v-if="errors.first_name" class="text-xs text-destructive">{{ errors.first_name[0] }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label>Отчество</Label>
                <Input v-model="form.middle_name" :disabled="submitting" :class="{ 'border-destructive': errors.middle_name }" />
                <p v-if="errors.middle_name" class="text-xs text-destructive">{{ errors.middle_name[0] }}</p>
              </div>
              <div class="space-y-1.5">
                <Label>Полное ФИО *</Label>
                <Input v-model="form.full_name" :disabled="submitting" :class="{ 'border-destructive': errors.full_name }" />
                <p v-if="errors.full_name" class="text-xs text-destructive">{{ errors.full_name[0] }}</p>
              </div>
            </div>

            <div class="space-y-1.5">
              <Label>Компания *</Label>
              <select 
                v-model="form.company_id" 
                class="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                :disabled="submitting || companiesLoading"
                :class="{ 'border-destructive': errors.company_id }"
              >
                <option value="" disabled>{{ companiesLoading ? 'Загрузка...' : 'Выберите компанию' }}</option>
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <p v-if="errors.company_id" class="text-xs text-destructive">{{ errors.company_id[0] }}</p>
            </div>

            <div class="flex gap-2 pt-2">
              <Button type="submit" class="w-full gap-2" :disabled="submitting || !form.full_name || !form.company_id || !form.employee_code || !form.last_name || !form.first_name">
                <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
                {{ editing ? "Сохранить" : "Создать" }}
              </Button>
              <Button type="button" variant="outline" class="w-full" @click="closeModal" :disabled="submitting">Отмена</Button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import apiClient from "@/api/axios";
import { toast } from "@/composables/use-toast";
import { Users, Plus, Pencil, Trash2, Search, X, Loader2 } from "lucide-vue-next";

import PageHeader from "@/components/ui/PageHeader.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Button from "@/components/ui/button.vue";
import Input from "@/components/ui/input.vue";
import Label from "@/components/ui/label.vue";

// State
const employees = ref([]);
const companies = ref([]);
const companiesLoading = ref(false);
const loading = ref(true);
const submitting = ref(false);
const deletingId = ref(null);
const errors = ref({});

const search = ref("");
const dialogOpen = ref(false);
const editing = ref(null);

const form = ref({
  employee_code: "", last_name: "", first_name: "", middle_name: "",
  full_name: "", email: "", company_id: "",
});

// Helpers
function parseNestedData(response, fallback = []) {
  if (!response?.data) return fallback;
  return response.data.employees || response.data.data?.employees || response.data.data || response.data || fallback;
}

async function loadCompanies() {
  if (companies.value.length) return;
  companiesLoading.value = true;
  try {
    const res = await apiClient.get('/companies/list');
    const raw = res.data?.companies || res.data?.data?.companies || res.data?.data || res.data || [];
    companies.value = raw.map(c => ({ id: c.id, name: c.name }));
  } catch (e) {
    console.warn('Не удалось загрузить справочник компаний:', e);
    extractCompaniesFromEmployeesFallback();
  } finally {
    companiesLoading.value = false;
  }
}

function extractCompaniesFromEmployeesFallback() {
  const map = new Map();
  employees.value.forEach(emp => {
    if (emp.company && !map.has(emp.company.id)) {
      map.set(emp.company.id, { id: emp.company.id, name: emp.company.name });
    }
  });
  companies.value = Array.from(map.values());
}

async function load() {
  loading.value = true;
  try {
    await Promise.all([loadEmployees(), loadCompanies()]);
    await loadTrainingGroups();
  } catch (e) {
    console.error("Ошибка загрузки данных:", e);
    toast({ title: "Ошибка загрузки", description: e.response?.data?.message || e.message, variant: "destructive" });
  } finally {
    loading.value = false;
  }
}

async function loadEmployees() {
  const empRes = await apiClient.get('/employees/list');
  const rawEmployees = parseNestedData(empRes, []);
  employees.value = rawEmployees.map(emp => ({
    ...emp,
    company_name: emp.company?.name || null,
    training_groups: []
  }));
}

async function loadTrainingGroups() {
  try {
    const res = await apiClient.get('/training-groups');
    const groups = res.data?.data?.data || res.data?.data || [];
    const groupsByEmployee = {};
    
    groups.forEach(group => {
      const groupName = group.course?.name || group.course_name || 'Без названия';
      group.participants?.forEach(p => {
        if (!groupsByEmployee[p.employee_id]) groupsByEmployee[p.employee_id] = [];
        groupsByEmployee[p.employee_id].push({ id: group.id, name: groupName, status: group.status });
      });
    });

    employees.value.forEach(emp => emp.training_groups = groupsByEmployee[emp.id] || []);
  } catch (e) { console.warn('Не удалось загрузить учебные группы:', e); }
}

function getStatusLabel(status) {
  return { planned: 'Планируется', in_progress: 'В процессе', completed: 'Завершено', cancelled: 'Отменено' }[status] || status;
}

function getStatusColor(status) {
  return { planned: 'bg-blue-500', in_progress: 'bg-amber-500', completed: 'bg-green-500', cancelled: 'bg-gray-400' }[status] || 'bg-gray-400';
}

onMounted(load);

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return employees.value;
  return employees.value.filter((emp) => {
    const inBasic = (emp.full_name || "").toLowerCase().includes(q) || (emp.email || "").toLowerCase().includes(q) || (emp.company_name || "").toLowerCase().includes(q);
    const inGroups = emp.training_groups?.some(g => (g.name || "").toLowerCase().includes(q));
    return inBasic || inGroups;
  });
});

// 🔒 Гарантированное закрытие модалки
function closeModal() {
  if (submitting.value) return;
  dialogOpen.value = false;
  editing.value = null;
  errors.value = {};
}

function openCreate() {
  editing.value = null;
  form.value = { employee_code: "", last_name: "", first_name: "", middle_name: "", full_name: "", email: "", company_id: "" };
  errors.value = {};
  dialogOpen.value = true;
}

function openEdit(emp) {
  editing.value = emp;
  form.value = {
    employee_code: emp.employee_code || "",
    last_name: emp.last_name || "",
    first_name: emp.first_name || "",
    middle_name: emp.middle_name || "",
    full_name: emp.full_name || "",
    email: emp.email || "",
    company_id: emp.company_id || "",
  };
  errors.value = {};
  dialogOpen.value = true;
}

// 💾 Сохранение с гарантированным закрытием при успехе
async function handleSave() {
  submitting.value = true;
  errors.value = {};

  try {
    const payload = { ...form.value };
    
    if (editing.value?.id) {
      await apiClient.post(`/employees/${editing.value.id}`, payload);
      toast({ title: "Сотрудник обновлён" });
    } else {
      await apiClient.post('/employees/create', payload);
      toast({ title: "Сотрудник создан" });
    }

    // ✅ Сразу закрываем модалку после успешного ответа сервера
    dialogOpen.value = false;
    editing.value = null;
    errors.value = {};

    // Перезагружаем список в фоне (ошибка здесь не должна влиять на закрытие)
    try {
      await load();
    } catch (loadErr) {
      console.warn('Ошибка перезагрузки списка:', loadErr);
    }
  } catch (e) {
    // При ошибке валидации или сети модалка остаётся открытой
    if (e.response?.status === 422 && e.response.data?.errors) {
      errors.value = e.response.data.errors;
      toast({ title: "Проверьте заполнение полей", variant: "destructive" });
    } else {
      toast({ title: "Ошибка сохранения", description: e.response?.data?.message || e.message, variant: "destructive" });
    }
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(id) {
  const emp = employees.value.find(e => e.id === id);
  if (!confirm(`Удалить "${emp?.full_name || 'сотрудника'}"?`)) return;

  deletingId.value = id;
  try {
    await apiClient.delete(`/employees/${id}/soft`);
    toast({ title: "Сотрудник удалён" });
    employees.value = employees.value.filter(e => e.id !== id);
  } catch (e) {
    toast({ title: "Ошибка удаления", description: e.response?.data?.message || e.message, variant: "destructive" });
  } finally {
    deletingId.value = null;
  }
}

watch(dialogOpen, (isOpen) => {
  if (!isOpen) return;
  const handler = (e) => e.key === "Escape" && closeModal();
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
});
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .relative, .modal-leave-active .relative { transition: transform 0.2s ease, opacity 0.2s ease; }
.modal-enter-from .relative, .modal-leave-to .relative { opacity: 0; transform: scale(0.98) translateY(8px); }
</style>