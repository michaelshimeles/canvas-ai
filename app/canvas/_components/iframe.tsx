import { ArrowUpRightIcon, GripVerticalIcon } from "lucide-react"
import { toast } from "sonner"
import { BaseBoxShapeUtil, DefaultToolbar, HTMLContainer, RecordProps, T, TLBaseShape, TLComponents } from "tldraw"


// Type definition
export type IFrameShape = TLBaseShape<
    'iframe',
    {
        w: number
        h: number
        url: string
    }
>


// Functional component for the indicator
export function IFrameIndicator({ shape }: { shape: IFrameShape }) {
    const headerHeight = 40
    return <rect width={shape.props.w} height={shape.props.h + headerHeight} />
}

export const components: TLComponents = {
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

// Functional component for rendering the iframe
export function IFrameComponent({ shape }: { shape: IFrameShape }) {
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

// Minimal class wrapper (required by tldraw)
export class IFrameShapeUtil extends BaseBoxShapeUtil<IFrameShape> {
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
