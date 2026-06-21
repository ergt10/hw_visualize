<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useVisStore } from '../stores/visStore.js';

const props = defineProps({
  data: { type: Object, required: true },
  initializer: { type: Function, required: true },
});

const el = ref(null);
const store = useVisStore();
let chart = null;
let observer = null;

onMounted(async () => {
  chart = await props.initializer(el.value, props.data, store);
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(el.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.__dispose?.();
  chart?.dispose?.();
});
</script>

<template>
  <div ref="el" class="chart"></div>
</template>
