"use client"
import { Tldraw, BaseBoxShapeUtil, TLBaseShape, HTMLContainer, RecordProps, T } from 'tldraw'
import 'tldraw/tldraw.css'
import { useSyncDemo } from '@tldraw/sync'

// Type definition
type IFrameShape = TLBaseShape<
  'iframe',
  {
    w: number
    h: number
    url: string
  }
>

// Functional component for rendering the iframe
function IFrameComponent({ shape }: { shape: IFrameShape }) {
  return (
    <HTMLContainer
      style={{
        width: shape.props.w,
        height: shape.props.h,
        pointerEvents: 'auto',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -28,
          left: 0,
          maxWidth: '100%',
          padding: '6px 10px',
          borderRadius: '6px 6px 0 0',
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          color: '#f9fafb',
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
        }}
        title={shape.props.url}
      >
        {shape.props.url}
      </div>
      <iframe
        src={shape.props.url}
        width="100%"
        height="100%"
        style={{
          border: 'none',
          borderRadius: '4px',
          pointerEvents: 'none',
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </HTMLContainer>
  )
}

// Functional component for the indicator
function IFrameIndicator({ shape }: { shape: IFrameShape }) {
  return <rect width={shape.props.w} height={shape.props.h} />
}

// Minimal class wrapper (required by tldraw)
class IFrameShapeUtil extends BaseBoxShapeUtil<IFrameShape> {
  static override type = 'iframe' as const
  static override props: RecordProps<IFrameShape> = {
    w: T.number,
    h: T.number,
    url: T.string,
  }

  getDefaultProps(): IFrameShape['props'] {
    return {
      w: 1024,
      h: 768,
      url: 'https://www.rasmic.xyz',
    }
  }

  component(shape: IFrameShape) {
    return <IFrameComponent shape={shape} />
  }

  indicator(shape: IFrameShape) {
    return <IFrameIndicator shape={shape} />
  }
}

// Define custom shapes array
const customShapeUtils = [IFrameShapeUtil]

export default function App() {
  const store = useSyncDemo({ 
    roomId: '1',
    shapeUtils: customShapeUtils,
  })

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw 
        store={store}
        shapeUtils={customShapeUtils}
        onMount={(editor) => {
          const iframeShapes = editor
            .getCurrentPageShapes()
            .filter((shape) => shape.type === 'iframe') as IFrameShape[]

          if (iframeShapes.length === 0) {
            editor.createShape({
              type: 'iframe',
              x: 100,
              y: 100,
              props: {
                w: 1024,
                h: 768,
                url: 'https://www.rasmic.xyz',
              },
            })
            return
          }

          const [primary, ...rest] = iframeShapes

          if (primary.props.url !== 'https://www.rasmic.xyz') {
            editor.updateShape({
              id: primary.id,
              type: 'iframe',
              props: { ...primary.props, url: 'https://www.rasmic.xyz' },
            })
          }

          if (rest.length) {
            editor.deleteShapes(rest.map((shape) => shape.id))
          }
        }}
      />
    </div>
  )
}