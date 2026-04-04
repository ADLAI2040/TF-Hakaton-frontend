<template>
  <div>
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <router-link to="/groups">
        <Button variant="ghost" size="icon" class="h-9 w-9">
          <ArrowLeft class="w-5 h-5" />
        </Button>
      </router-link>

      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold truncate">{{ group?.course?.name || 'Группа' }}</h1>
        <p class="text-sm text-muted-foreground">
          {{ group?.start_date || '—' }} — {{ group?.end_date || '—' }}
        </p>
      </div>

      <StatusBadge :status="group?.status" />

      <!-- Действия -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" class="gap-2" @click="editDialogOpen = true" :disabled="deletingGroup">
          <Pencil class="w-4 h-4" /> 
          <span class="hidden sm:inline">Редактировать</span>
        </Button>

        <Button 
          variant="destructive" 
          class="gap-2" 
          :disabled="deletingGroup || loading"
          @click="deleteGroup"
        >
          <Loader2 v-if="deletingGroup" class="w-4 h-4 animate-spin" />
          <Trash2 v-else class="w-4 h-4" />
          {{ deletingGroup ? 'Удаление...' : 'Удалить группу' }}
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center h-96">
      <div class="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="!group" class="text-center py-20 text-muted-foreground">
      Группа не найдена
    </div>

    <!-- Content -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- LEFT: участники -->
      <div class="lg:col-span-2">
        <div class="bg-card rounded-2xl border border-border">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 class="font-semibold">Участники группы ({{ groupParticipants.length }})</h2>
            <Button 
              size="sm" 
              class="gap-2" 
              :disabled="addingLoading || deletingGroup"
              @click="selectorOpen = true"
            >
              <Loader2 v-if="addingLoading" class="w-4 h-4 animate-spin" />
              <UserPlus v-else class="w-4 h-4" /> 
              {{ addingLoading ? 'Добавление...' : 'Добавить' }}
            </Button>
          </div>

          <div v-if="groupParticipants.length === 0" class="p-8 text-center text-muted-foreground text-sm">
            Нет участников в группе
          </div>

          <div v-else class="divide-y divide-border">
            <div 
              v-for="gp in groupParticipants" 
              :key="gp.id" 
              class="px-6 py-4 flex items-center gap-4 transition-opacity"
              :class="{ 'opacity-50 pointer-events-none': removingId === gp.id }"
            >
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ gp.employee?.full_name || 'Неизвестный' }}</p>
                <p v-if="gp.employee?.email" class="text-xs text-muted-foreground">{{ gp.employee.email }}</p>
              </div>

              <div class="w-48 relative">
                <Slider
                  :model-value="gp.completion_percent || 0"
                  :min="0"
                  :max="100"
                  :step="5"
                  :disabled="savingProgressId === gp.id"
                  @update:modelValue="(val) => handleSliderUpdate(gp.id, val)"
                />
                <!-- Индикатор сохранения -->
                <div v-if="savingProgressId === gp.id" class="absolute -top-1.5 -right-1.5">
                  <Loader2 class="w-3.5 h-3.5 animate-spin text-primary bg-background rounded-full" />
                </div>
              </div>

              <span class="text-sm font-medium w-12 text-right tabular-nums">{{ gp.completion_percent || 0 }}%</span>

              <Button 
                size="icon" 
                variant="ghost" 
                class="h-8 w-8 text-destructive" 
                :disabled="removingId === gp.id || addingLoading || deletingGroup"
                @click="removeParticipant(gp.id)"
              >
                <Loader2 v-if="removingId === gp.id" class="w-3.5 h-3.5 animate-spin" />
                <Trash2 v-else class="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: прогресс и стоимость -->
      <div class="space-y-6">
        <div class="bg-card rounded-2xl border border-border p-6">
          <h3 class="font-semibold mb-4">Общий прогресс</h3>
          <div class="text-4xl font-bold text-primary mb-2">{{ averageProgress }}%</div>
          <ProgressBar :value="averageProgress" size="lg" :showLabel="false" />
        </div>

        <div class="bg-card rounded-2xl border border-border p-6">
          <h3 class="font-semibold mb-4">Стоимость группы</h3>
          <div class="text-lg">{{ formatPrice(group.group_cost) }} ₽</div>
          <div v-if="group.course?.price?.[0]?.price" class="text-sm text-muted-foreground">
            за человека: {{ formatPrice(group.price_per_person) }} ₽
          </div>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <GroupFormDialog 
      v-model:open="editDialogOpen" 
      :editingGroup="group" 
      @saved="onGroupSaved"
    />
    <ParticipantSelector
      v-model:open="selectorOpen"
      :existingIds="groupParticipants.map(gp => gp.employee_id)"
      @select="handleAddParticipants"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import apiClient from '@/api/axios'

import { ArrowLeft, Pencil, Trash2, UserPlus, Loader2 } from 'lucide-vue-next'
import Button from '@/components/ui/button.vue'
import Slider from '@/components/ui/Slider.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import GroupFormDialog from '@/components/groups/GroupFormDialog.vue'
import ParticipantSelector from '@/components/groups/ParticipantSelector.vue'
import { toast } from '@/composables/use-toast'

const route = useRoute()
const router = useRouter()

const group = ref(null)
const groupParticipants = ref([])
const loading = ref(true)
const editDialogOpen = ref(false)
const selectorOpen = ref(false)
const removingId = ref(null)
const addingLoading = ref(false)
const savingProgressId = ref(null)
const deletingGroup = ref(false) // ✅ Новое состояние

// Debounce таймер для слайдера
let sliderDebounceTimer = null

// Загрузка данных группы
const loadGroup = async () => {
  const id = route.params.id
  if (!id) {
    toast({ title: 'ID группы не указан', variant: 'destructive' })
    return
  }

  loading.value = true
  try {
    const { data } = await apiClient.get(`/training-groups/${id}`)
    
    if (data?.success && data?.data) {
      group.value = data.data
      groupParticipants.value = data.data.participants || []
    } else {
      throw new Error(data?.message || 'Неверный формат ответа')
    }
  } catch (e) {
    console.error('Ошибка загрузки группы:', e)
    
    if (e.response?.status === 404) {
      toast({ title: 'Группа не найдена', variant: 'destructive' })
      router.push('/groups')
    } else {
      toast({ 
        title: 'Ошибка загрузки', 
        description: e.response?.data?.message || e.message,
        variant: 'destructive' 
      })
    }
    
    group.value = null
    groupParticipants.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadGroup)

watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId) loadGroup()
})

const onGroupSaved = async () => {
  toast({ title: 'Группа обновлена' })
  await loadGroup()
}

const averageProgress = computed(() => {
  if (!groupParticipants.value.length) return 0
  const total = groupParticipants.value.reduce((sum, gp) => sum + (gp.completion_percent || 0), 0)
  return Math.round(total / groupParticipants.value.length)
})

// Обработчик слайдера с мгновенным UI-обновлением и debounce
const handleSliderUpdate = (gpId, value) => {
  const numValue = Number(value)
  const participant = groupParticipants.value.find(p => p.id === gpId)
  
  if (participant) participant.completion_percent = numValue

  clearTimeout(sliderDebounceTimer)
  sliderDebounceTimer = setTimeout(() => {
    updateCompletion(gpId, numValue)
  }, 500)
}

const updateCompletion = async (gpId, value) => {
  if (savingProgressId.value === gpId) return
  savingProgressId.value = gpId

  const participant = groupParticipants.value.find(p => p.id === gpId)
  const prevValue = participant?.completion_percent ?? 0

  try {
    const { data } = await apiClient.patch(
      `/training-groups/${group.value.id}/participants/${gpId}`,
      { completion_percent: value }
    )

    if (data?.data && participant) {
      Object.assign(participant, data.data)
    }
  } catch (e) {
    console.error('Ошибка обновления прогресса:', e)
    if (participant) participant.completion_percent = prevValue
    toast({ 
      title: 'Не удалось сохранить прогресс', 
      description: e.response?.data?.message || e.message,
      variant: 'destructive' 
    })
  } finally {
    savingProgressId.value = null
  }
}

const removeParticipant = async (gpId) => {
  if (!confirm('Удалить участника из группы?')) return
  
  removingId.value = gpId
  const originalList = [...groupParticipants.value]
  
  try {
    groupParticipants.value = groupParticipants.value.filter(gp => gp.id !== gpId)
    
    await apiClient.delete(
      `/training-groups/${group.value.id}/participants/${gpId}`
    )
    toast({ title: 'Участник удалён' })
  } catch (e) {
    console.error('Ошибка удаления участника:', e)
    groupParticipants.value = originalList
    toast({ 
      title: 'Ошибка удаления', 
      description: e.response?.data?.message || e.message,
      variant: 'destructive' 
    })
  } finally {
    removingId.value = null
  }
}

const handleAddParticipants = async (employeeIds) => {
  const existing = new Set(groupParticipants.value.map(gp => gp.employee_id))
  const newIds = employeeIds.filter(id => !existing.has(id))
  
  if (!newIds.length) {
    toast({ title: 'Сотрудники уже добавлены', variant: 'destructive' })
    return
  }

  addingLoading.value = true
  try {
    const results = await Promise.allSettled(
      newIds.map(id => 
        apiClient.post(
          `/training-groups/${group.value.id}/participants`,
          { employee_id: id, completion_percent: 0 }
        )
      )
    )
    
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failCount = results.length - successCount
    
    if (failCount > 0) {
      toast({
        title: `Частичный успех`,
        description: `Добавлено: ${successCount}, ошибок: ${failCount}`,
        variant: 'warning'
      })
    } else {
      toast({ title: `Добавлено участников: ${successCount}` })
    }
    
    selectorOpen.value = false
    await loadGroup()
  } catch (e) {
    console.error('Ошибка добавления участников:', e)
    toast({ 
      title: 'Ошибка добавления', 
      description: e.response?.data?.message || e.message,
      variant: 'destructive' 
    })
  } finally {
    addingLoading.value = false
  }
}

// ✅ Удаление группы
const deleteGroup = async () => {
  if (!confirm('Вы уверены, что хотите удалить эту группу? Все привязанные участники будут удалены безвозвратно.')) return

  deletingGroup.value = true
  try {
    await apiClient.delete(`/training-groups/${group.value.id}`)
    toast({ title: 'Группа успешно удалена' })
    router.push('/groups')
  } catch (e) {
    console.error('Ошибка удаления группы:', e)
    toast({
      title: 'Ошибка удаления',
      description: e.response?.data?.message || e.message,
      variant: 'destructive'
    })
  } finally {
    deletingGroup.value = false
  }
}

const formatPrice = (v) => {
  const num = Number(v || 0)
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
</script>