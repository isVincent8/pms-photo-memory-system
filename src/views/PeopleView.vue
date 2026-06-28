<script setup lang="ts">
/**
 * PeopleView —— 人物列表页
 *
 * 展示所有人物卡片，包含头像、姓名、简介、关联照片数与阶段数。
 */
import { computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { User } from 'lucide-vue-next'

const data = useDataStore()

onMounted(() => {
  if (!data.loaded) data.load()
})

const peopleWithStats = computed(() =>
  data.people.map((person) => {
    const photoCount = data.photos.filter((p) => p.people?.includes(person.id)).length
    const stageCount = person.stageIds?.length ?? 0
    return { person, photoCount, stageCount }
  }),
)
</script>

<template>
  <div class="page-container py-10 md:py-14">
    <header class="mb-10 animate-rise">
      <p class="font-display text-xs tracking-[0.3em] text-primary uppercase">People</p>
      <h1 class="section-title mt-2">人物</h1>
      <p class="mt-2 text-sm text-muted-foreground">生命中的重要角色</p>
    </header>

    <!-- 加载骨架 -->
    <div v-if="!data.loaded" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="surface h-32 animate-pulse" />
    </div>

    <!-- 人物网格 -->
    <div v-else-if="peopleWithStats.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <router-link
        v-for="{ person, photoCount, stageCount } in peopleWithStats"
        :key="person.id"
        :to="`/person/${person.id}`"
        class="surface surface-hover flex items-center gap-4 p-5"
      >
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary"
        >
          <img
            v-if="person.avatar"
            :src="person.avatar"
            :alt="person.name"
            class="h-full w-full object-cover"
          />
          <User v-else :size="24" class="text-muted-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="font-display text-lg font-semibold text-foreground">{{ person.name }}</h2>
          <p v-if="person.bio" class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ person.bio }}</p>
          <div class="mt-2 flex gap-3 text-[10px] text-muted-foreground">
            <span>{{ photoCount }} 张照片</span>
            <span>{{ stageCount }} 个阶段</span>
          </div>
        </div>
      </router-link>
    </div>

    <!-- 空状态 -->
    <div v-else class="py-24 text-center">
      <p class="font-display text-sm text-muted-foreground">还没有人物数据</p>
    </div>
  </div>
</template>
