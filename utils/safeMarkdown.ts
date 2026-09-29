import { h, type VNodeChild } from 'vue'
import { marked, type Token } from 'marked'

/** Render a deliberately small Markdown subset using escaped Vue text nodes.
 * No token can supply an HTML tag, HTML string, attribute or URL to the DOM.
 * Links/images retain their labels; raw HTML is displayed as inert text.
 */
export function renderSafeMarkdown(content: string): VNodeChild[] {
  function render(tokens: Token[]): VNodeChild[] {
    return tokens.map((token): VNodeChild => {
      switch (token.type) {
        case 'space': return null
        case 'paragraph': return h('p', render(token.tokens))
        case 'heading': return h('p', [h('strong', render(token.tokens))])
        case 'strong': return h('strong', render(token.tokens))
        case 'em': return h('em', render(token.tokens))
        case 'del': return h('del', render(token.tokens))
        case 'blockquote': return h('blockquote', render(token.tokens))
        case 'list': return h(token.ordered ? 'ol' : 'ul', {
          class: token.ordered ? 'list-decimal pl-5' : 'list-disc pl-5'
        }, token.items.map(
          (item: { tokens: Token[] }) => h('li', render(item.tokens))
        ))
        case 'code': return h('pre', [h('code', token.text)])
        case 'codespan': return h('code', token.text)
        case 'br': return h('br')
        case 'hr': return h('hr')
        case 'link': return render(token.tokens)
        case 'image': return token.text
        case 'text': return token.tokens ? render(token.tokens) : token.text
        // Includes raw HTML and unsupported constructs such as tables.
        default: return token.raw
      }
    })
  }

  return render(marked.lexer(content))
}
