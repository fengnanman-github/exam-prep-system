<template>
  <div class="stat-card">
    <h3>{{ title }}</h3>
    <p class="number">{{ value }}</p>
  </div>
</template>

<script>
export default {
  name: 'StatsCard',
  props: {
    title: {
      type: String,
      required: true
    },
    value: {
      type: [Number, String],
      default: '加载中...'
    }
  }
}
</script>
