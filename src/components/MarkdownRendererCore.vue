<script setup lang="ts">
/**
 * MarkdownRenderer —— 基于 v-md-editor 的 Markdown 渲染组件
 *
 * 仅做预览渲染（非编辑），接收 Markdown 原文字符串。
 * 主题色覆写为 PMS 浅色风格：白底、深色正文、标题深绿/蓝色。
 */
import VMdPreview from '@kangc/v-md-editor/lib/preview'
import '@kangc/v-md-editor/lib/style/preview.css'
import githubTheme from '@kangc/v-md-editor/lib/theme/github'
import '@kangc/v-md-editor/lib/theme/style/github.css'

VMdPreview.use(githubTheme)

defineProps<{
  content: string
}>()
</script>

<template>
  <div class="pms-md">
    <VMdPreview :text="content" mode="preview" />
  </div>
</template>

<style>
.pms-md .vuepress-markdown-body {
  background-color: transparent !important;
  color: hsl(var(--foreground));
  font-family: theme('fontFamily.sans');
  font-size: 15px;
  line-height: 1.8;
}

.pms-md .vuepress-markdown-body h1,
.pms-md .vuepress-markdown-body h2,
.pms-md .vuepress-markdown-body h3,
.pms-md .vuepress-markdown-body h4 {
  font-family: theme('fontFamily.display');
  color: hsl(var(--foreground));
  border-bottom-color: hsl(var(--border));
  letter-spacing: -0.01em;
}

.pms-md .vuepress-markdown-body h1 {
  font-size: 1.9rem;
}

.pms-md .vuepress-markdown-body h2 {
  font-size: 1.4rem;
  color: hsl(var(--primary));
}

.pms-md .vuepress-markdown-body h3 {
  font-size: 1.15rem;
  color: hsl(var(--accent));
}

.pms-md .vuepress-markdown-body a {
  color: hsl(var(--accent));
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}
.pms-md .vuepress-markdown-body a:hover {
  border-bottom-color: hsl(var(--accent));
}

.pms-md .vuepress-markdown-body strong {
  color: hsl(var(--foreground));
}

.pms-md .vuepress-markdown-body blockquote {
  border-left-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.06);
  color: hsl(var(--muted-foreground));
  border-radius: 0 0.5rem 0.5rem 0;
}

.pms-md .vuepress-markdown-body code {
  background: hsl(var(--secondary));
  color: hsl(var(--accent));
  border-radius: 0.375rem;
}

.pms-md .vuepress-markdown-body pre {
  background: hsl(var(--secondary)) !important;
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
}

.pms-md .vuepress-markdown-body pre code {
  color: hsl(var(--foreground));
}

.pms-md .vuepress-markdown-body ul,
.pms-md .vuepress-markdown-body ol {
  padding-left: 1.4em;
}

.pms-md .vuepress-markdown-body li::marker {
  color: hsl(var(--primary));
}

.pms-md .vuepress-markdown-body img {
  border-radius: 0.75rem;
}

.pms-md .vuepress-markdown-body hr {
  border-color: hsl(var(--border));
}

.pms-md .vuepress-markdown-body table tr {
  background: transparent;
  border-color: hsl(var(--border));
}
.pms-md .vuepress-markdown-body table th,
.pms-md .vuepress-markdown-body table td {
  border-color: hsl(var(--border));
}
</style>
