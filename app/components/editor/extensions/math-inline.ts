import { Node, InputRule } from '@tiptap/core'

export const MathInline = Node.create({
  name: 'mathInline',

  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span.math-inline[data-latex]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { class: 'math-inline', 'data-latex': HTMLAttributes.latex }]
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$([^$]+)\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1]
          const { tr } = state
          const node = this.type.create({ latex })

          tr.replaceWith(range.from, range.to, node)
        },
      }),
    ]
  },
})
