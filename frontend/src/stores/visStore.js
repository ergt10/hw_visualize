import { defineStore } from 'pinia';

export const useVisStore = defineStore('vis', {
  state: () => ({
    city: null,
    dateRange: null,
    genres: null,
    metric: 'plays',
    evoGenre: null,
    track: null,
  }),
  actions: {
    setState(patch) {
      Object.assign(this, patch);
    },
    toggleCity(index) {
      this.city = this.city === index ? null : index;
    },
    toggleGenre(index, total) {
      const current = this.genres === null
        ? new Set(Array.from({ length: total }, (_, i) => i))
        : new Set(this.genres);
      current.has(index) ? current.delete(index) : current.add(index);
      if (current.size === 0) return;
      this.genres = current.size === total ? null : [...current].sort((a, b) => a - b);
    },
    reset() {
      this.city = null;
      this.dateRange = null;
      this.genres = null;
      this.metric = 'plays';
      this.track = null;
    },
  },
});
