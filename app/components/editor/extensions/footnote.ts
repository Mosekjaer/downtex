import { Node } from '@tiptap/core'

export const Footnote = Node.create({
  name: 'footnote',

  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-footnote') || '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'sup.footnote-ref[data-footnote]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', { class: 'footnote-ref', 'data-footnote': HTMLAttributes.text }, '\u2020']
  },
})
