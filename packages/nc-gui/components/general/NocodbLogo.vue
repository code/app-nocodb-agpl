<script setup lang="ts">
interface Props {
  // Rendered width & height in px (icon is square)
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 28,
})

const { size } = toRefs(props)

const { isDark } = useTheme()

// Same vector mark in both themes — colored on light, monochrome light-gray in dark mode
const icon = computed<IconMapKey>(() => (isDark.value ? 'nocodb1Dark' : 'nocodb1'))

const sizeStyle = computed(() => ({
  width: `${size.value}px`,
  height: `${size.value}px`,
  minWidth: `${size.value}px`,
  minHeight: `${size.value}px`,
}))
</script>

<template>
  <GeneralIcon :icon="icon" :style="sizeStyle" class="nc-nocodb-logo select-none" />
</template>
