<template>
  <div>
    <PageHeader title="Компании" description="Справочник компаний-заказчиков">
      <Button @click="openCreate" class="gap-2">
        <Plus class="w-4 h-4" /> Добавить компанию
      </Button>
    </PageHeader>

    <div class="relative mb-6 max-w-sm">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input placeholder="Поиск..." v-model="search" class="pl-10" />
    </div>

    <div v-if="loading" class="flex items-center justify-center h-96">
      <div class="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>

    <template v-else>
      <EmptyState
        v-if="filtered.length === 0"
        :icon="Building2"
        title="Нет компаний"
        description="Добавьте первую компанию"
      >
        <Button @click="openCreate" variant="outline" class="gap-2">
          <Plus class="w-4 h-4" /> Добавить
        </Button>
      </EmptyState>

      <div v-else class="bg-card rounded-2xl border border-border overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              <th class="px-6 py-3 text-left text-xs uppercase">Код</th>
              <th class="px-6 py-3 text-left text-xs uppercase">Название</th>
              <th class="px-6 py-3 text-right text-xs uppercase">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="company in filtered"
              :key="company.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-6 py-4 text-sm font-mono">{{ company.code }}</td>
              <td class="px-6 py-4 font-medium">{{ company.name }}</td>
              <td class="px-6 py-4 text-right">
                <Button size="icon" variant="ghost" class="h-8 w-8" @click="openEdit(company)">
                  <Pencil class="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  class="h-8 w-8 text-destructive"
                  @click="handleDelete(company.id)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <Dialog v-model="dialogOpen">
      <h2 class="text-lg font-semibold mb-4">
        {{ editing ? 'Редактировать компанию' : 'Новая компания' }}
      </h2>

      <div class="space-y-4">
        <div>
          <Label>Код компании *</Label>
          <Input v-model="form.code" placeholder="Например: ООО-001" />
          <p v-if="errors.code" class="text-xs text-destructive mt-1">{{ errors.code }}</p>
        </div>

        <div>
          <Label>Название *</Label>
          <Input v-model="form.name" placeholder='ООО "Ромашка"' />
          <p v-if="errors.name" class="text-xs text-destructive mt-1">{{ errors.name }}</p>
        </div>

        <Button
          @click="handleSave"
          :disabled="saving"
          class="w-full"
        >
          <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          {{ editing ? 'Сохранить' : 'Создать' }}
        </Button>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-vue-next'
import apiClient  from '@/api/axios'
import Button     from '@/components/ui/button.vue'
import Input      from '@/components/ui/input.vue'
import Dialog     from '@/components/ui/dialog.vue'
import Label      from '@/components/ui/label.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { toast }  from '@/composables/use-toast'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const companies  = ref([])
const loading    = ref(true)
const saving     = ref(false)
const search     = ref('')
const dialogOpen = ref(false)
const editing    = ref(null)
const errors     = ref({})
const form       = ref({ code: '', name: '' })

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------
const load = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/companies/list')
    companies.value = Array.isArray(data)
      ? data
      : (data.data ?? data.companies ?? [])
  } catch (e) {
    toast({
      title: 'Ошибка загрузки',
      description: e?.response?.data?.message ?? e.message,
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
const filtered = computed(() =>
  companies.value.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.value.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.value.toLowerCase())
  )
)

// ---------------------------------------------------------------------------
// Dialog helpers
// ---------------------------------------------------------------------------
const openCreate = async () => {
  editing.value    = null
  errors.value     = {}
  dialogOpen.value = true
  await nextTick()
  form.value = { code: '', name: '' }
}

const openEdit = async (company) => {
  editing.value    = company
  errors.value     = {}
  dialogOpen.value = true
  await nextTick()
  // spread разрывает ссылку на объект из массива — иначе v-model мутирует оригинал
  form.value = { ...company }
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------
const handleSave = async () => {
  if (!form.value.code || !form.value.name) {
    if (!form.value.code) errors.value.code = 'Обязательное поле'
    if (!form.value.name) errors.value.name = 'Обязательное поле'
    return
  }

  errors.value = {}
  saving.value = true

  const payload = {
    code: String(form.value.code),
    name: String(form.value.name),
  }

  try {
    if (editing.value) {
      await apiClient.post(`/companies/${editing.value.id}`, payload)
      toast({ title: 'Компания обновлена' })
    } else {
      await apiClient.post('/companies/create', payload)
      toast({ title: 'Компания создана' })
    }
    dialogOpen.value = false
    await load()
  } catch (e) {
    if (e?.response?.status === 422) {
      const fieldErrors = e.response.data?.errors ?? {}
      errors.value = Object.fromEntries(
        Object.entries(fieldErrors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      )
    } else {
      toast({
        title: 'Ошибка сохранения',
        description: e?.response?.data?.message ?? e.message,
        variant: 'destructive',
      })
    }
  } finally {
    saving.value = false
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
const handleDelete = async (id) => {
  try {
    await apiClient.delete(`/companies/${id}/soft`)
    companies.value = companies.value.filter((c) => c.id !== id)
    toast({ title: 'Компания удалена' })
  } catch (e) {
    toast({
      title: 'Ошибка удаления',
      description: e?.response?.data?.message ?? e.message,
      variant: 'destructive',
    })
  }
}
</script>