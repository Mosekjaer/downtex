import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Figure extension for Draw.io diagram integration.
 *
 * Renders a block node with an iframe pointing to the draw.io embed viewer,
 * plus an editable caption below.
 *
 * TODO (T076): Subscribe to `postgres_changes` on the `figures` table via
 * Supabase Realtime to receive live SHA / status updates. When a row changes
 * (e.g. new `last_sha`), update the iframe src so collaborators see the
 * latest diagram without refreshing.
 *
 * Example subscription pattern:
 *   supabase
 *     .channel('figure-updates')
 *     .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'figures' }, payload => {
 *       // Find the matching figure node in the editor and refresh its svgUrl / embedUrl
 *     })
 *     .subscribe()
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      insertFigure: (attrs: {
        figureId: string
        githubRepo: string
        githubPath: string
        caption?: string
        svgUrl?: string
      }) => ReturnType
    }
  }
}

function buildEmbedUrl(repo: string, path: string, branch = 'main'): string {
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`
  const filename = path.split('/').pop() ?? 'diagram'
  return `https://viewer.diagrams.net/?tags=%7B%7D&target=blank&highlight=0000ff&edit=_blank&layers=1&nav=1&title=${encodeURIComponent(filename)}#U${encodeURIComponent(rawUrl)}`
}

export const Figure = Node.create({
  name: 'figure',

  group: 'block',
  defining: true,

  // The diagram area is not editable; the caption is.
  content: 'inline*',

  addAttributes() {
    return {
      figureId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-figure-id') || '',
      },
      githubRepo: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-github-repo') || '',
      },
      githubPath: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-github-path') || '',
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') || '',
      },
      svgUrl: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-svg-url') || null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure.drawio-figure',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const repo = HTMLAttributes['data-github-repo'] || node.attrs.githubRepo
    const path = HTMLAttributes['data-github-path'] || node.attrs.githubPath
    const embedUrl = repo && path ? buildEmbedUrl(repo, path) : ''

    return [
      'figure',
      mergeAttributes(
        {
          class: 'drawio-figure',
          'data-figure-id': node.attrs.figureId,
          'data-github-repo': node.attrs.githubRepo,
          'data-github-path': node.attrs.githubPath,
          'data-caption': node.attrs.caption,
          'data-svg-url': node.attrs.svgUrl,
        },
      ),
      // Diagram preview area (non-editable)
      [
        'div',
        {
          class: 'drawio-figure__preview',
          contenteditable: 'false',
        },
        embedUrl
          ? [
              'iframe',
              {
                src: embedUrl,
                frameborder: '0',
                style: 'width:100%;height:400px;border:1px solid #e4e4e7;border-radius:6px;',
                allowfullscreen: 'true',
              },
            ]
          : [
              'div',
              {
                class: 'drawio-figure__placeholder',
                style:
                  'width:100%;height:200px;display:flex;align-items:center;justify-content:center;border:2px dashed #d4d4d8;border-radius:6px;color:#a1a1aa;font-size:14px;',
              },
              'Draw.io diagram — no source configured',
            ],
      ],
      // Editable caption
      [
        'figcaption',
        {
          class: 'drawio-figure__caption',
          style: 'text-align:center;font-size:0.875rem;color:#52525b;margin-top:0.5rem;',
        },
        0, // hole for inline content (caption)
      ],
    ]
  },

  addCommands() {
    return {
      insertFigure:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: attrs.caption
              ? [{ type: 'text', text: attrs.caption }]
              : [],
          })
        },
    }
  },
})
