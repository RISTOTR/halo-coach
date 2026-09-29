<script lang="ts">
import { defineComponent, h } from 'vue'
import { renderSafeMarkdown } from '~/utils/safeMarkdown'

export default defineComponent({
  props: { content: { type: String, default: '' } },
  setup(props) {
    return () => h('div', { class: 'space-y-2 whitespace-pre-wrap break-words' }, renderSafeMarkdown(props.content))
  }
})
</script>
