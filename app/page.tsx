"use client"
import Chatbot from '@/components/chatbot'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageRecordType, TLPageId } from '@tldraw/editor'
import { useSyncDemo } from '@tldraw/sync'
import { ArrowUpRightIcon, GripVerticalIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BaseBoxShapeUtil, createShapeId, DefaultToolbar, Editor, HTMLContainer, RecordProps, T, TLBaseShape, TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

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
  const handleOpenInNewTab = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent tldraw from handling the event
    e.preventDefault()
    console.log('Opening URL:', shape.props.url)
    window.open(shape.props.url, '_blank', 'noopener,noreferrer')
    toast.success('Opened in new tab!')
  }

  const headerHeight = 40

  return (
    <HTMLContainer
      style={{
        width: shape.props.w,
        height: shape.props.h + headerHeight,
        pointerEvents: 'auto',
        position: 'relative',
      }}
    >
      {/* Drag Handle Header - Now part of the shape, not overlayed */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '8px 12px',
          borderRadius: '8px 8px 0 0',
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          // Allow pointer events for the entire header, but tldraw will handle dragging
          pointerEvents: 'auto',
        }}
      >
        {/* Drag handle area - takes up most of the header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            minWidth: 0,
            cursor: 'grab',
            // This allows tldraw's default drag behavior to work
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '4px 6px',
              borderRadius: 6,
              border: '1px solid rgba(148, 163, 184, 0.4)',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.3) 100%)',
              color: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)',
            }}
            title="Drag to move iframe"
          >
            <GripVerticalIcon style={{ width: 18, height: 18 }} />
          </div>
          <div
            style={{
              flex: 1,
              color: '#f1f5f9',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.01em',
            }}
            title={shape.props.url}
          >
            {shape.props.url || 'Empty iframe'}
          </div>
        </div>
        {/* Open in new tab button */}
        <button
          onClick={handleOpenInNewTab}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid rgba(148, 163, 184, 0.4)',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s ease',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)'
          }}
          title="Open in new tab"
        >
          <span>Open</span>
          <ArrowUpRightIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
      {/* Iframe content */}
      <iframe
        src={shape.props.url}
        width="100%"
        height={shape.props.h}
        style={{
          position: 'absolute',
          top: headerHeight,
          left: 0,
          border: 'none',
          borderRadius: '0 0 8px 8px',
          pointerEvents: 'auto',
          backgroundColor: '#ffffff',
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </HTMLContainer>
  )
}

const components: TLComponents = {
  Toolbar: () => <DefaultToolbar orientation="vertical" />,
  StylePanel: () => null,
  Minimap: () => null,
  ZoomMenu: () => null,
  MainMenu: () => null,
  PageMenu: () => null,
  NavigationPanel: () => null,
  QuickActions: () => null,
  MenuPanel: () => null,
  TopPanel: () => null,
  HelperButtons: () => null,
  ActionsMenu: () => null,
}

// Functional component for the indicator
function IFrameIndicator({ shape }: { shape: IFrameShape }) {
  const headerHeight = 40
  return <rect width={shape.props.w} height={shape.props.h + headerHeight} />
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
      url: '',
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
  const unsubscribeSelectionRef = useRef<(() => void) | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showMessages, setShowMessages] = useState(true)
  const [showTerminal, setShowTerminal] = useState(false)
  const [isFullscreenChat, setIsFullscreenChat] = useState(false)
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([])
  const [activePageId, setActivePageId] = useState<string>('')
  const [showOnboarding, setShowOnboarding] = useState(false)

  const syncPages = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    const currentPages = editor.getPages()
    setPages(
      currentPages.map((page, index) => ({
        id: page.id,
        name: page.name ?? `Canvas ${index + 1}`,
      }))
    )
    setActivePageId(editor.getCurrentPageId())
  }, [])

  const handleCreateCanvas = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    const newPageId = PageRecordType.createId('canvas')
    const name = `Canvas ${pages.length + 1}`

    editor.createPage({ id: newPageId, name })
    editor.setCurrentPage(newPageId)
    setActivePageId(newPageId)
    syncPages()
    toast.success(`Created ${name}`)
  }, [pages.length, syncPages])

  const handlePageChange = useCallback(
    (pageId: string) => {
      const editor = editorRef.current
      if (!editor) return

      editor.setCurrentPage(pageId as TLPageId)
      setActivePageId(pageId)
      syncPages()
    },
    [syncPages]
  )


  // Check if onboarding should be shown (first time only)
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
    if (!hasSeenOnboarding) {
      // Small delay to ensure page is loaded
      setTimeout(() => {
        setShowOnboarding(true)
      }, 1500)
    }
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false)
    localStorage.setItem('hasSeenOnboarding', 'true')
  }, [])

  // Cleanup selection listener on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeSelectionRef.current) {
        unsubscribeSelectionRef.current()
      }
    }
  }, [])

  // Listen for sandbox iframe creation events from chatbot
  useEffect(() => {
    const handleCreateSandboxIframe = (event: CustomEvent<{ url: string }>) => {
      const editor = editorRef.current
      if (!editor) return

      const sandboxUrl = event.detail.url
      console.log('Creating iframe for sandbox:', sandboxUrl)

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
          url: sandboxUrl,
        },
      })

      editor.select(shapeId)
      // Update URL input to show the sandbox URL
      setUrlInput(sandboxUrl)
      toast.success('Sandbox iframe created!')
    }

    window.addEventListener('create-sandbox-iframe', handleCreateSandboxIframe as EventListener)
    return () => {
      window.removeEventListener('create-sandbox-iframe', handleCreateSandboxIframe as EventListener)
    }
  }, [])

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
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          borderRadius: 28,
          backgroundColor: 'rgba(20, 20, 25, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(12px)',
          pointerEvents: 'auto',
        }}
      >
        <Select
          value={activePageId || undefined}
          onValueChange={handlePageChange}
          disabled={pages.length === 0}
        >
          <SelectTrigger className="w-[200px] border border-white/10 bg-transparent text-white text-sm font-medium focus:ring-0 focus:ring-offset-0 rounded-[28px]">
            <SelectValue placeholder="Select canvas" className="text-white" />
          </SelectTrigger>
          <SelectContent className="bg-[#141419]/95 border border-white/10 text-white">
            {pages.map((page) => (
              <SelectItem key={page.id} value={page.id} className="text-white focus:bg-white/10 focus:text-white">
                {page.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-xl border border-white/10 bg-[rgba(96,127,255,0.15)] px-3 text-xs font-medium text-white hover:bg-[rgba(96,127,255,0.25)]"
          onClick={handleCreateCanvas}
        >
          New canvas
        </Button>
      </div>
      <div
        data-iframe-container
        style={{
          position: 'absolute',
          top: 16,
          right: isFullscreenChat ? 'calc(20vw + 16px)' : 16,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 28,
          backgroundColor: 'rgba(20, 20, 25, 0.92)',
          color: '#ffffff',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          transition: 'right 0.2s ease',
        }}
      >
        <label style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em' }}>Iframe URL</label>
        <input
          value={urlInput}
          onChange={(event) => setUrlInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleAddIframe()
            }
          }}
          placeholder=""
          style={{
            flex: 1,
            minWidth: 260,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            fontSize: 13,
            outline: 'none',
            transition: 'all 0.15s ease',
            fontWeight: 400,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(96, 127, 255, 0.4)'
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
          }}
        />
        <button
          type="button"
          onClick={handleAddIframe}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, rgb(96, 127, 255) 0%, rgb(74, 100, 224) 100%)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 3px rgba(96, 127, 255, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(96, 127, 255, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(96, 127, 255, 0.3)'
          }}
        >
          Add iframe
        </button>
      </div>
      <div
        style={{
          position: 'fixed',
          right: isFullscreenChat ? 'calc(20vw + 16px)' : 16,
          top: 82,
          zIndex: 1200,
          display: 'flex',
          gap: '10px',
          transition: 'right 0.2s ease',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setIsFullscreenChat((prev) => {
              const newValue = !prev
              // Always show messages when entering fullscreen
              if (newValue) {
                setShowMessages(true)
              }
              return newValue
            })
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '14px',
            backgroundColor: 'rgba(20, 20, 25, 0.92)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(12px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.16), 0 2px 4px rgba(0, 0, 0, 0.12)'
            e.currentTarget.style.backgroundColor = 'rgba(25, 25, 30, 0.95)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
            e.currentTarget.style.backgroundColor = 'rgba(20, 20, 25, 0.92)'
          }}
        >
          {isFullscreenChat ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
        {!isFullscreenChat && (
          <button
            type="button"
            onClick={() => setShowMessages((prev) => !prev)}
            style={{
              padding: '10px 20px',
              borderRadius: '14px',
              backgroundColor: 'rgba(20, 20, 25, 0.92)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(12px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.16), 0 2px 4px rgba(0, 0, 0, 0.12)'
              e.currentTarget.style.backgroundColor = 'rgba(25, 25, 30, 0.95)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
              e.currentTarget.style.backgroundColor = 'rgba(20, 20, 25, 0.92)'
            }}
          >
            {showMessages ? 'Hide Chat' : 'Show Chat'}
          </button>
        )}
      </div>
      <div
        data-chatbot-container
        style={{
          position: isFullscreenChat ? 'fixed' : 'absolute',
          bottom: isFullscreenChat ? 0 : 40,
          left: isFullscreenChat ? 'auto' : 0,
          right: isFullscreenChat ? 0 : 'auto',
          top: isFullscreenChat ? 0 : 'auto',
          width: isFullscreenChat ? 'auto' : '100%',
          display: isFullscreenChat ? 'block' : 'flex',
          justifyContent: isFullscreenChat ? 'flex-start' : 'center',
          zIndex: 1200,
          pointerEvents: 'auto',
        }}
      >
        <Chatbot 
          onCapture={captureSelection} 
          showMessages={showMessages} 
          onToggleMessages={() => setShowMessages((prev) => !prev)}
          isFullscreen={isFullscreenChat}
          onToggleFullscreen={() => setIsFullscreenChat((prev) => !prev)}
        />
      </div>
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          right: isFullscreenChat ? '20vw' : 0 
        }}
      >
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
                  url: '',
                },
              })
            }

            syncPages()

            // Listen for selection changes and update URL input when iframe is selected
            const checkSelection = () => {
              const selectedIds = [...editor.getSelectedShapeIds()]
              if (selectedIds.length === 1) {
                const shape = editor.getShape(selectedIds[0])
                if (shape && shape.type === 'iframe') {
                  const iframeShape = shape as IFrameShape
                  setUrlInput(iframeShape.props.url)
                }
              }
            }

            // Listen to all store changes and check selection
            const unsubscribe = editor.store.listen(
              () => {
                checkSelection()
              },
              { source: 'user', scope: 'document' }
            )

            // Store unsubscribe function for cleanup
            unsubscribeSelectionRef.current = unsubscribe

            // Check initial selection
            checkSelection()
          }}
        />
      </div>
    </div>
  )
}