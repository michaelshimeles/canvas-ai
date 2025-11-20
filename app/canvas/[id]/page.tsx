"use client"
import Chatbot from '@/components/chatbot'
import TerminalComponent from '@/components/terminal'
import { Button } from '@/components/ui/button'
import { Orb } from "@/components/ui/orb"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageRecordType, TLPageId } from '@tldraw/editor'
import { useSyncDemo } from '@tldraw/sync'
import { ArrowUpRightIcon, Code, FileText, FolderOpen, Globe, GripVerticalIcon, Image, Minimize2, Music, Video, X } from 'lucide-react'
import { useParams } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BaseBoxShapeUtil, createShapeId, DefaultToolbar, Editor, HTMLContainer, RecordProps, T, TLBaseShape, TLComponents, Tldraw, TLShapeId } from 'tldraw'
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

// Icon shape type
type IconShape = TLBaseShape<
  'icon',
  {
    w: number
    h: number
    iconType: string
    label: string
    url: string
    iconSize: number
  }
>

// Window state type
type WindowState = {
  id: string
  iconId: string
  x: number
  y: number
  width: number
  height: number
  url?: string
  title: string
  minimized: boolean
  zIndex: number
  contentType: 'iframe' | 'terminal'
}

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
        {/* Open in new tab button - only show if URL is valid */}
        {shape.props.url && shape.props.url.trim() !== '' && (
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
        )}
      </div>
      {/* Iframe content - only render if URL is valid */}
      {shape.props.url && shape.props.url.trim() !== '' ? (
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
      ) : (
        <div
          style={{
            position: 'absolute',
            top: headerHeight,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(30, 30, 40, 0.8)',
            borderRadius: '0 0 8px 8px',
            color: '#9ca3af',
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ marginBottom: '8px', fontSize: 16, fontWeight: 500 }}>No URL provided</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Enter a URL in the input above to load content</div>
          </div>
        </div>
      )}
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

// Icon component
function IconComponent({ shape }: { shape: IconShape }) {
  const [isSelected, setIsSelected] = useState(false)

  // Icon mapping
  const iconMap: Record<string, React.ReactNode> = {
    browser: <Globe size={48} />,
    document: <FileText size={48} />,
    code: <Code size={48} />,
    image: <Image size={48} />,
    music: <Music size={48} />,
    video: <Video size={48} />,
    folder: <FolderOpen size={48} />,
  }

  // Check if it's a special image-based icon (like terminal)
  const isTerminalIcon = shape.props.iconType === 'terminal'
  const icon = iconMap[shape.props.iconType] || <Globe size={48} />

  return (
    <HTMLContainer
      style={{
        width: shape.props.w,
        height: shape.props.h,
        pointerEvents: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('icon-double-click', { detail: { iconId: shape.id } }))
      }}
      onPointerDown={(e) => {
        // Allow tldraw to handle dragging
        setIsSelected(true)
      }}
      onPointerUp={() => setIsSelected(false)}
      onPointerLeave={() => setIsSelected(false)}
    >
      <div
        style={{
          width: shape.props.iconSize,
          height: shape.props.iconSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isSelected ? 'rgba(96, 127, 255, 0.2)' : 'transparent',
          borderRadius: 8,
          padding: 8,
          transition: 'background-color 0.15s ease',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
            pointerEvents: 'none',
          }}
        >
          {isTerminalIcon ? (
            <img
              src="/terminal.png"
              alt={shape.props.label}
              style={{
                width: shape.props.iconSize,
                height: shape.props.iconSize,
                objectFit: 'contain',
                pointerEvents: 'none',
              }}
            />
          ) : (
            icon
          )}
        </div>
      </div>
      {shape.props.label && (
        <div
          style={{
            marginTop: 6,
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              padding: '4px 12px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.95) 0%, rgba(37, 99, 235, 0.9) 100%)',
              border: '1px solid rgba(37, 99, 235, 0.7)',
              boxShadow: '0 5px 14px rgba(30, 64, 175, 0.35)',
              color: '#f8fafc',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.01em',
              textShadow: '0 1px 2px rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(10px)',
              userSelect: 'none',
            }}
          >
            {shape.props.label}
          </div>
        </div>
      )}
    </HTMLContainer>
  )
}

// Icon indicator
function IconIndicator({ shape }: { shape: IconShape }) {
  return <rect width={shape.props.w} height={shape.props.h} />
}

// Icon shape util
class IconShapeUtil extends BaseBoxShapeUtil<IconShape> {
  static override type = 'icon' as const
  static override props: RecordProps<IconShape> = {
    w: T.number,
    h: T.number,
    iconType: T.string,
    label: T.string,
    url: T.string,
    iconSize: T.number,
  }

  getDefaultProps(): IconShape['props'] {
    return {
      w: 80,
      h: 120,
      iconType: 'browser',
      label: 'App',
      url: '',
      iconSize: 80,
    }
  }

  component(shape: IconShape) {
    return <IconComponent shape={shape} />
  }

  indicator(shape: IconShape) {
    return <IconIndicator shape={shape} />
  }
}

// Define custom shapes array
const customShapeUtils = [IFrameShapeUtil, IconShapeUtil]

export default function App({ params }: { params: { id: string } }) {
  const { id } = useParams<{ id: string }>()
  const store = useSyncDemo({
    roomId: id,
    shapeUtils: customShapeUtils,
  })

  const editorRef = useRef<Editor | null>(null)
  const unsubscribeSelectionRef = useRef<(() => void) | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showMessages, setShowMessages] = useState(true)
  const [isFullscreenChat, setIsFullscreenChat] = useState(false)
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([])
  const [activePageId, setActivePageId] = useState<string>('')
  const [windows, setWindows] = useState<WindowState[]>([])
  const [nextZIndex, setNextZIndex] = useState(1000)
  const [draggingWindow, setDraggingWindow] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [viewportVersion, setViewportVersion] = useState(0)

  // Listen to viewport changes to update window positions
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const unsubscribe = editor.store.listen(
      () => {
        // Throttle updates to avoid too many re-renders
        setViewportVersion(prev => prev + 1)
      },
      { source: 'user', scope: 'document' }
    )

    return () => {
      unsubscribe()
    }
  }, [])

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


  // Initialize fullscreen state from localStorage after mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem('isFullscreenChat')
    if (saved === 'true') {
      setIsFullscreenChat(true)
    }
  }, [])


  // Save fullscreen state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isFullscreenChat', isFullscreenChat.toString())
  }, [isFullscreenChat])

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

  // Window management functions
  const openWindow = useCallback((iconId: string) => {
    const editor = editorRef.current
    if (!editor) return

    const shape = editor.getShape(iconId as TLShapeId)
    if (!shape || shape.type !== 'icon') return
    const iconShape = shape as IconShape

    // Check if window already exists
    const existingWindow = windows.find(w => w.iconId === iconId)
    if (existingWindow) {
      // Bring to front
      setWindows(prev => prev.map(w =>
        w.id === existingWindow.id
          ? { ...w, zIndex: nextZIndex, minimized: false }
          : w
      ))
      setNextZIndex(prev => prev + 1)
      return
    }

    const editorBounds = editor.getViewportPageBounds()
    const contentType = iconShape.props.iconType === 'terminal' ? 'terminal' : 'iframe'
    const windowWidth = contentType === 'terminal' ? 720 : 800
    const windowHeight = contentType === 'terminal' ? 500 : 600

    const newWindow: WindowState = {
      id: createShapeId(),
      iconId,
      x: editorBounds.minX + (editorBounds.width - windowWidth) / 2,
      y: editorBounds.minY + (editorBounds.height - windowHeight) / 2,
      width: windowWidth,
      height: windowHeight,
      title: iconShape.props.label,
      minimized: false,
      zIndex: nextZIndex,
      contentType,
      url: contentType === 'iframe' ? iconShape.props.url || 'https://example.com' : undefined,
    }

    setWindows(prev => [...prev, newWindow])
    setNextZIndex(prev => prev + 1)
    toast.success(`Opened ${iconShape.props.label}`)
  }, [windows, nextZIndex])

  const closeWindow = useCallback((windowId: string) => {
    setWindows(prev => prev.filter(w => w.id !== windowId))
  }, [])

  const minimizeWindow = useCallback((windowId: string) => {
    setWindows(prev => prev.map(w =>
      w.id === windowId ? { ...w, minimized: true } : w
    ))
  }, [])

  const restoreWindow = useCallback((windowId: string) => {
    setWindows(prev => prev.map(w =>
      w.id === windowId
        ? { ...w, minimized: false, zIndex: nextZIndex }
        : w
    ))
    setNextZIndex(prev => prev + 1)
  }, [nextZIndex])

  const bringWindowToFront = useCallback((windowId: string) => {
    setWindows(prev => prev.map(w =>
      w.id === windowId
        ? { ...w, zIndex: nextZIndex }
        : w
    ))
    setNextZIndex(prev => prev + 1)
  }, [nextZIndex])

  // Handle window dragging
  const handleWindowMouseDown = useCallback((e: React.MouseEvent, windowId: string) => {
    e.stopPropagation()
    const window = windows.find(w => w.id === windowId)
    if (!window) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDraggingWindow(windowId)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    bringWindowToFront(windowId)
  }, [windows, bringWindowToFront])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingWindow || !dragOffset) return

      const editor = editorRef.current
      if (!editor) return

      const screenPoint = { x: e.clientX, y: e.clientY }
      const pagePoint = editor.screenToPage(screenPoint)

      setWindows(prev => prev.map(w =>
        w.id === draggingWindow
          ? { ...w, x: pagePoint.x - dragOffset.x, y: pagePoint.y - dragOffset.y }
          : w
      ))
    }

    const handleMouseUp = () => {
      setDraggingWindow(null)
      setDragOffset(null)
    }

    if (draggingWindow) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingWindow, dragOffset])

  // Window component
  const WindowComponent = ({ window }: { window: WindowState }) => {
    const editor = editorRef.current
    if (!editor) return null

    // Use viewportVersion to force re-render on viewport changes
    const _ = viewportVersion

    const pagePoint = { x: window.x, y: window.y }
    const screenPoint = editor.pageToScreen(pagePoint)
    const isTerminalWindow = window.contentType === 'terminal'

    if (window.minimized) {
      return (
        <div
          style={{
            position: 'fixed',
            left: screenPoint.x,
            top: screenPoint.y,
            width: 200,
            height: 40,
            backgroundColor: 'rgba(30, 30, 40, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            cursor: 'pointer',
            zIndex: window.zIndex,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
          onClick={() => restoreWindow(window.id)}
        >
          <span style={{ color: '#ffffff', fontSize: 12 }}>{window.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(window.id)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )
    }

    return (
      <div
        style={{
          position: 'fixed',
          left: screenPoint.x,
          top: screenPoint.y,
          width: window.width,
          height: window.height + 40,
          backgroundColor: isTerminalWindow ? 'rgba(15, 23, 42, 0.96)' : 'rgba(17, 24, 39, 0.95)',
          border: isTerminalWindow ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 12,
          boxShadow: isTerminalWindow
            ? '0 18px 40px rgba(30, 64, 175, 0.35)'
            : '0 8px 24px rgba(0, 0, 0, 0.4)',
          zIndex: window.zIndex,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onMouseDown={(e) => handleWindowMouseDown(e, window.id)}
      >
        {/* Window header */}
        <div
          style={{
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            backgroundColor: isTerminalWindow ? 'rgba(17, 24, 39, 0.95)' : 'rgba(20, 20, 25, 0.95)',
            borderBottom: isTerminalWindow
              ? '1px solid rgba(59, 130, 246, 0.35)'
              : '1px solid rgba(148, 163, 184, 0.2)',
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>
            {window.title}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                minimizeWindow(window.id)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeWindow(window.id)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Window content */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            backgroundColor: isTerminalWindow ? 'rgba(10, 17, 40, 0.95)' : '#ffffff',
            display: 'flex',
            alignItems: 'stretch',
          }}
        >
          {isTerminalWindow ? (
            <div
              style={{
                flex: 1,
                height: '100%',
                padding: 16,
                boxSizing: 'border-box',
                background:
                  'radial-gradient(circle at top, rgba(59, 130, 246, 0.18), transparent 55%)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 16px 32px rgba(2, 6, 23, 0.55)',
                }}
              >
                <TerminalComponent />
              </div>
            </div>
          ) : window.url ? (
            <iframe
              src={window.url}
              width="100%"
              height="100%"
              style={{
                border: 'none',
                pointerEvents: 'auto',
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#9ca3af',
                fontSize: 14,
              }}
            >
              No URL configured
            </div>
          )}
        </div>
      </div>
    )
  }

  // Handle icon double clicks
  useEffect(() => {
    const handleIconDoubleClick = (event: CustomEvent<{ iconId: string }>) => {
      openWindow(event.detail.iconId)
    }

    window.addEventListener('icon-double-click', handleIconDoubleClick as EventListener)
    return () => {
      window.removeEventListener('icon-double-click', handleIconDoubleClick as EventListener)
    }
  }, [openWindow])

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
      {/* Render windows */}
      {windows.map((window) => (
        <WindowComponent key={window.id} window={window} />
      ))}
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
        <Button
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
        </Button>
        {!isFullscreenChat && (
          <Button
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
          </Button>
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

            // Create terminal icon automatically
            const iconShapes = editor
              .getCurrentPageShapes()
              .filter((shape) => shape.type === 'icon') as IconShape[]

            const terminalIconExists = iconShapes.some(
              (shape) => shape.props.iconType === 'terminal'
            )

            if (!terminalIconExists) {
              editor.createShape({
                type: 'icon',
                x: 200,
                y: 200,
                props: {
                  w: 80,
                  h: 120,
                  iconType: 'terminal',
                  label: 'Terminal',
                  url: '',
                  iconSize: 80,
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
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1300,
          pointerEvents: 'auto',
        }}
      >
        <div className="w-[50px] h-[50px]">
          <Orb colors={["#FF6B6B", "#4ECDC4"]} />
        </div>
      </div>
    </div>
  )
}