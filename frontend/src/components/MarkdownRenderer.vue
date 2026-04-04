<template>
  <div class="markdown-renderer" v-html="renderedHtml"></div>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export default {
  name: 'MarkdownRenderer',
  props: {
    content: {
      type: String,
      default: ''
    }
  },
  computed: {
    renderedHtml() {
      if (!this.content) return ''

      // 配置marked选项
      marked.setOptions({
        breaks: true, // 支持单个换行符
        gfm: true, // GitHub Flavored Markdown
        headerIds: false,
        mangle: false
      })

      // 解析Markdown
      const rawHtml = marked(this.content)

      // 清理HTML，防止XSS攻击
      return DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        ALLOWED_ATTR: ['href', 'title', 'class', 'target']
      })
    }
  }
}
</script>

<style scoped>
.markdown-renderer {
  line-height: 1.6;
  color: #333;
}

.markdown-renderer:deep(h1),
.markdown-renderer:deep(h2),
.markdown-renderer:deep(h3),
.markdown-renderer:deep(h4),
.markdown-renderer:deep(h5),
.markdown-renderer:deep(h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-renderer:deep(h1) { font-size: 1.5em; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.3em; }
.markdown-renderer:deep(h2) { font-size: 1.3em; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.3em; }
.markdown-renderer:deep(h3) { font-size: 1.1em; }

.markdown-renderer:deep(p) {
  margin-bottom: 1em;
}

.markdown-renderer:deep(strong) {
  font-weight: 600;
  color: #000;
}

.markdown-renderer:deep(em) {
  font-style: italic;
}

.markdown-renderer:deep(code) {
  background: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-renderer:deep(pre) {
  background: #f4f4f4;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.markdown-renderer:deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-renderer:deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
  font-style: italic;
}

.markdown-renderer:deep(ul),
.markdown-renderer:deep(ol) {
  padding-left: 2em;
  margin-bottom: 1em;
}

.markdown-renderer:deep(li) {
  margin-bottom: 0.5em;
}

.markdown-renderer:deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.markdown-renderer:deep(a:hover) {
  text-decoration: underline;
}

.markdown-renderer:deep(hr) {
  border: none;
  border-top: 2px solid #e0e0e0;
  margin: 2em 0;
}

.markdown-renderer:deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

.markdown-renderer:deep(th),
.markdown-renderer:deep(td) {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}

.markdown-renderer:deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}
</style>
