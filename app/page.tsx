"use client"
import { useRef, useState } from 'react'
import Chatbot from '@/components/chatbot'
import { Tldraw, BaseBoxShapeUtil, TLBaseShape, HTMLContainer, RecordProps, T, Editor, createShapeId, DefaultToolbar, TLComponents } from 'tldraw'
import 'tldraw/tldraw.css'
import { useSyncDemo } from '@tldraw/sync'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

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

const components: TLComponents = {
  Toolbar: () => <DefaultToolbar orientation="vertical" />,
  StylePanel: () => null,
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

  const editorRef = useRef<Editor | null>(null)
  const [urlInput, setUrlInput] = useState('https://www.rasmic.xyz')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const captureSelection = async () => {
    const editor = editorRef.current
    if (!editor) return

    const selectedIds = [...editor.getSelectedShapeIds()]
    if (selectedIds.length === 0) {
      toast.error('Please select some shapes first!')
      return
    }

    const result = await editor.toImage(selectedIds, {
      format: 'png',
      scale: 2,
      background: true,
    })

    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      setCapturedImage(dataUrl)
      // Dispatch event so chatbot knows an image is ready
      window.dispatchEvent(new CustomEvent('canvas-image-captured', { detail: dataUrl }))
    }
    reader.readAsDataURL(result.blob)
  }

  const handleAddIframe = () => {
    const editor = editorRef.current
    if (!editor) return

    const trimmedUrl = urlInput.trim()
    if (!trimmedUrl) return

    const normalizedUrl = /^https?:\/\//i.test(trimmedUrl)
      ? trimmedUrl
      : `https://${trimmedUrl}`

    const centerScreenPoint = editor.getViewportScreenCenter()
    const centerPagePoint = editor.screenToPage(centerScreenPoint)

    const width = 1024
    const height = 768
    const shapeId = createShapeId()

    editor.createShape({
      id: shapeId,
      type: 'iframe',
      x: centerPagePoint.x - width / 2,
      y: centerPagePoint.y - height / 2,
      props: {
        w: width,
        h: height,
        url: normalizedUrl,
      },
    })

    editor.select(shapeId)
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 12,
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          color: '#f9fafb',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.35)',
        }}
      >
        <label style={{ fontSize: 12, fontWeight: 600 }}>Iframe URL</label>
        <input
          value={urlInput}
          onChange={(event) => setUrlInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleAddIframe()
            }
          }}
          placeholder="https://rasmic.xyz"
          style={{
            flex: 1,
            minWidth: 260,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(148, 163, 184, 0.4)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            color: '#f8fafc',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleAddIframe}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#f8fafc',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Add iframe
        </button>
      </div>
      <Button
        onClick={captureSelection}
        style={{
          position: 'absolute',
          bottom: 16,
          left: '80%',
          zIndex: 1000,
        }}
        variant="default"
      >
        📸 Capture Selection
      </Button>
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 500,
          right: 100,
          zIndex: 1000,
          pointerEvents: 'auto',
        }}
      >
        <Chatbot />
      </div>
      <Tldraw 
        store={store}
        components={components}
        shapeUtils={customShapeUtils}
        onMount={(editor) => {
          editorRef.current = editor
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
          }
        }}
      />
    </div>
  )
}