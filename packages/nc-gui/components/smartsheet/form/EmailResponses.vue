<script setup lang="ts">
interface BaseCollaborator {
  id?: string
  email: string
  display_name?: string | null
  meta?: any
}

const props = withDefaults(
  defineProps<{
    // JSON map of `{ "email": boolean }` stored on the form view's `email` field
    modelValue?: string | null
    baseId?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    baseId: '',
    disabled: false,
  },
)

const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change'): void
}>()

const { $api } = useNuxtApp()

const { t } = useI18n()

const { getBaseUsers } = useBases()

const isOpen = ref(false)

const searchText = ref('')

const isLoading = ref(false)

const collaborators = ref<BaseCollaborator[]>([])

const emailMap = computed<Record<string, boolean>>(() => {
  try {
    return JSON.parse(props.modelValue || '') || {}
  } catch {
    return {}
  }
})

const selectedEmails = computed(() =>
  Object.entries(emailMap.value)
    .filter(([, enabled]) => !!enabled)
    .map(([email]) => email),
)

const selectedCount = computed(() => selectedEmails.value.length)

const filteredCollaborators = computed(() =>
  collaborators.value.filter((collab) => searchCompare([collab.display_name ?? '', collab.email], searchText.value)),
)

const triggerLabel = computed(() => {
  if (!selectedCount.value) return t('general.none')

  if (selectedCount.value === 1) {
    const email = selectedEmails.value[0]
    const collab = collaborators.value.find((c) => c.email === email)
    return collab?.display_name || email
  }

  return t('labels.peopleSelected', { count: selectedCount.value }, selectedCount.value)
})

function isSelected(email: string) {
  return !!emailMap.value[email]
}

function persist(map: Record<string, boolean>) {
  emits('update:modelValue', JSON.stringify(map))
  emits('change')
}

async function checkSmtp() {
  // CE requires the SMTP plugin to be active before form emails can be sent
  if (isEeUI) return true

  const isActive = await $api.plugin.status('smtp')
  if (!isActive) {
    message.info(t('msg.toast.formEmailSMTP'))
    return false
  }

  return true
}

async function toggle(email: string, value: boolean) {
  if (props.disabled) return

  if (value && !(await checkSmtp())) return

  const map = { ...emailMap.value }
  if (value) {
    map[email] = true
  } else {
    delete map[email]
  }

  persist(map)
}

async function selectAll() {
  if (props.disabled || !collaborators.value.length) return

  if (!(await checkSmtp())) return

  const map = { ...emailMap.value }
  for (const collab of collaborators.value) {
    map[collab.email] = true
  }

  persist(map)
}

function clearAll() {
  if (props.disabled) return

  persist({})
}

async function loadCollaborators() {
  if (!props.baseId) return

  isLoading.value = true
  try {
    const { users } = await getBaseUsers({ baseId: props.baseId })
    collaborators.value = (users || [])
      .filter((user: any) => user.email && !user.deleted)
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        meta: user.meta,
      }))
  } catch {
    collaborators.value = []
  } finally {
    isLoading.value = false
  }
}

watch(isOpen, (open) => {
  if (open) {
    searchText.value = ''
    loadCollaborators()
  }
})

onMounted(() => {
  loadCollaborators()
})
</script>

<template>
  <NcDropdown
    v-model:visible="isOpen"
    :disabled="disabled"
    placement="bottomRight"
    overlay-class-name="nc-form-email-responses-overlay"
  >
    <div
      v-e="[`a:form-view:email-responses`]"
      class="nc-form-email-responses-trigger flex items-center justify-between gap-2 min-w-[180px] h-8 px-3 rounded-lg border-1 border-nc-border-gray-medium transition-colors"
      :class="disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-nc-border-gray-dark'"
      data-testid="nc-form-email-responses-trigger"
    >
      <span class="truncate" :class="selectedCount ? 'text-nc-content-gray' : 'text-nc-content-gray-muted'">
        {{ triggerLabel }}
      </span>
      <GeneralIcon icon="settings" class="flex-none text-nc-content-gray-muted" />
    </div>

    <template #overlay>
      <div class="nc-form-email-responses-list flex flex-col py-2 w-[280px]" @click.stop>
        <div class="px-2 pb-2">
          <a-input
            v-model:value="searchText"
            :placeholder="$t('placeholder.findBaseCollaborator')"
            class="!rounded-lg nc-form-email-responses-search"
            allow-clear
            data-testid="nc-form-email-responses-search"
          >
            <template #prefix>
              <GeneralIcon icon="search" class="text-nc-content-gray-muted mr-1" />
            </template>
          </a-input>
        </div>

        <div class="flex flex-col max-h-[240px] overflow-y-auto nc-scrollbar-thin px-1">
          <div v-if="isLoading" class="px-3 py-2 text-nc-content-gray-muted">{{ $t('general.loading') }}</div>
          <div v-else-if="!filteredCollaborators.length" class="px-3 py-2 text-nc-content-gray-muted">
            {{ $t('labels.noResults') }}
          </div>
          <div
            v-for="collab in filteredCollaborators"
            :key="collab.email"
            class="flex items-center px-2 py-1 rounded-lg hover:bg-nc-bg-gray-light"
            :data-testid="`nc-form-email-responses-item-${collab.email}`"
          >
            <NcSwitch
              :checked="isSelected(collab.email)"
              :disabled="disabled"
              placement="right"
              size="small"
              content-wrapper-class="flex-1 min-w-0 !pl-0"
              @change="(val: boolean) => toggle(collab.email, val)"
            >
              <div class="flex items-center gap-2 min-w-0 pl-2">
                <GeneralUserIcon size="small" :user="collab" class="flex-none" />
                <NcTooltip class="truncate" show-on-truncate-only>
                  <template #title>{{ collab.display_name || collab.email }}</template>
                  {{ collab.display_name || collab.email.slice(0, collab.email.indexOf('@')) }}
                </NcTooltip>
              </div>
            </NcSwitch>
          </div>
        </div>

        <div class="flex items-center gap-4 px-3 pt-2 mt-1 border-t-1 border-nc-border-gray-light">
          <NcButton
            type="text"
            size="small"
            :disabled="disabled || !collaborators.length"
            data-testid="nc-form-email-responses-select-all"
            @click="selectAll"
          >
            {{ $t('general.selectAll') }}
          </NcButton>
          <NcButton
            type="text"
            size="small"
            :disabled="disabled || !selectedCount"
            data-testid="nc-form-email-responses-clear-all"
            @click="clearAll"
          >
            {{ $t('labels.clearAll') }}
          </NcButton>
        </div>
      </div>
    </template>
  </NcDropdown>
</template>
