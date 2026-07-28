import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  clampAnnotationPoint,
  createCroppedScreenshotBlob,
  drawScreenshotAnnotations,
  type ScreenshotAnnotation,
  type ScreenshotAnnotationColor,
  type ScreenshotCropRect,
  screenshotAnnotationColorOptions,
} from "../utils/screenshot-annotations"
import {
  CheckIcon,
  CropIcon,
  DrawIcon,
  HighlightIcon,
  RectangleIcon,
  ResetIcon,
  UndoIcon,
} from "./icons"
import { Button } from "./primitives/button"
import { cn } from "./primitives/cn"

type AnnotationTool = "draw" | "highlight" | "rectangle"

const DEFAULT_TOOL: AnnotationTool = "draw"
const DEFAULT_COLOR = screenshotAnnotationColorOptions[0].value
const MIN_CROP_RECT_SIZE = 0.02

export function ScreenshotAnnotationEditor(props: {
  annotations: ScreenshotAnnotation[]
  disabled: boolean
  onChange: (annotations: ScreenshotAnnotation[]) => void
  onCrop?: (blob: Blob) => void
  src: string
}): React.JSX.Element {
  const annotationsRef = useRef(props.annotations)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rectangleOriginRef = useRef<{ x: number; y: number } | null>(null)
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<AnnotationTool>(DEFAULT_TOOL)
  const [color, setColor] = useState<ScreenshotAnnotationColor>(DEFAULT_COLOR)
  const [draftAnnotation, setDraftAnnotation] =
    useState<ScreenshotAnnotation | null>(null)
  const draftAnnotationRef = useRef<ScreenshotAnnotation | null>(null)
  const [containerSize, setContainerSize] = useState<{
    width: number
    height: number
  }>({ width: 0, height: 0 })
  const [isCropping, setIsCropping] = useState(false)
  const [cropRect, setCropRect] = useState<ScreenshotCropRect | null>(null)
  const cropRectRef = useRef<ScreenshotCropRect | null>(null)
  const cropOriginRef = useRef<{ x: number; y: number } | null>(null)
  const [cropBusy, setCropBusy] = useState(false)

  useEffect(() => {
    annotationsRef.current = props.annotations
  }, [props.annotations])

  useEffect(() => {
    draftAnnotationRef.current = draftAnnotation
  }, [draftAnnotation])

  useEffect(() => {
    cropRectRef.current = cropRect
  }, [cropRect])

  useEffect(() => {
    let active = true
    const image = new Image()
    image.decoding = "async"
    image.onload = () => {
      if (!active) {
        return
      }

      setLoadedImage(image)
    }
    image.onerror = () => {
      if (!active) {
        return
      }

      setLoadedImage(null)
    }
    image.src = props.src

    return () => {
      active = false
    }
  }, [props.src])

  const previousSrcRef = useRef(props.src)
  useEffect(() => {
    if (previousSrcRef.current === props.src) {
      return
    }

    previousSrcRef.current = props.src
    setIsCropping(false)
    setCropRect(null)
    cropRectRef.current = null
    cropOriginRef.current = null
    setCropBusy(false)
  }, [props.src])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }

      setContainerSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      })
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  const aspectRatio =
    loadedImage && loadedImage.naturalWidth > 0
      ? loadedImage.naturalHeight / loadedImage.naturalWidth
      : 9 / 16
  const availableWidth = Math.max(containerSize.width, 1)
  // Height-fit only when the layout provides a real bounded height (desktop
  // dialog). In unbounded contexts (single-column mobile) the observed height
  // is content-driven; fitting to it would collapse the canvas.
  const fitByHeight = containerSize.height >= 200
  const displayWidth = Math.max(
    Math.floor(
      Math.min(
        availableWidth,
        fitByHeight ? containerSize.height / aspectRatio : availableWidth
      )
    ),
    1
  )
  const displayHeight = Math.max(Math.round(displayWidth * aspectRatio), 1)
  const renderedAnnotations = useMemo(() => {
    return draftAnnotation
      ? [...props.annotations, draftAnnotation]
      : props.annotations
  }, [draftAnnotation, props.annotations])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!(canvas && loadedImage)) {
      return
    }

    const context = canvas.getContext("2d")
    if (!context) {
      return
    }

    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.round(displayWidth * devicePixelRatio)
    canvas.height = Math.round(displayHeight * devicePixelRatio)
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    drawScreenshotAnnotations({
      annotations: renderedAnnotations,
      context,
      height: displayHeight,
      image: loadedImage,
      width: displayWidth,
    })

    if (cropRect) {
      drawCropOverlay({
        context,
        height: displayHeight,
        rect: cropRect,
        width: displayWidth,
      })
    }
  }, [displayHeight, displayWidth, loadedImage, renderedAnnotations, cropRect])

  const commitDraftAnnotation = (annotation: ScreenshotAnnotation | null) => {
    if (!annotation) {
      return
    }

    props.onChange([...annotationsRef.current, annotation])
    setDraftAnnotation(null)
    draftAnnotationRef.current = null
    rectangleOriginRef.current = null
  }

  const startCropping = () => {
    setDraftAnnotation(null)
    draftAnnotationRef.current = null
    rectangleOriginRef.current = null
    setCropRect(null)
    cropRectRef.current = null
    cropOriginRef.current = null
    setIsCropping(true)
  }

  const cancelCropping = () => {
    setIsCropping(false)
    setCropRect(null)
    cropRectRef.current = null
    cropOriginRef.current = null
  }

  const applyCrop = async () => {
    const activeCrop = cropRectRef.current
    if (!(props.onCrop && activeCrop) || cropBusy) {
      return
    }

    setCropBusy(true)
    try {
      const blob = await createCroppedScreenshotBlob({
        imageUrl: props.src,
        rect: activeCrop,
      })
      if (blob) {
        props.onCrop(blob)
      }
      cancelCropping()
    } finally {
      setCropBusy(false)
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (props.disabled || !loadedImage || event.button !== 0) {
      return
    }

    const point = toCanvasPoint(event)
    event.currentTarget.setPointerCapture(event.pointerId)

    if (isCropping) {
      cropOriginRef.current = point
      const nextRect = { x: point.x, y: point.y, width: 0, height: 0 }
      setCropRect(nextRect)
      cropRectRef.current = nextRect
      return
    }

    if (tool === "rectangle") {
      rectangleOriginRef.current = point
      setDraftAnnotation({
        kind: "rectangle",
        color,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      })
      return
    }

    setDraftAnnotation({
      color,
      kind: "stroke",
      points: [point],
      tool,
    })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!loadedImage) {
      return
    }

    if (isCropping) {
      const origin = cropOriginRef.current
      const activeCrop = cropRectRef.current
      if (!(origin && activeCrop)) {
        return
      }

      const point = toCanvasPoint(event)
      const nextRect = {
        x: Math.min(origin.x, point.x),
        y: Math.min(origin.y, point.y),
        width: Math.abs(point.x - origin.x),
        height: Math.abs(point.y - origin.y),
      }
      setCropRect(nextRect)
      cropRectRef.current = nextRect
      return
    }

    if (!draftAnnotation) {
      return
    }

    const point = toCanvasPoint(event)
    if (draftAnnotation.kind === "rectangle") {
      const origin = rectangleOriginRef.current ?? {
        x: draftAnnotation.x,
        y: draftAnnotation.y,
      }
      setDraftAnnotation({
        color: draftAnnotation.color,
        kind: "rectangle",
        x: Math.min(origin.x, point.x),
        y: Math.min(origin.y, point.y),
        width: Math.abs(point.x - origin.x),
        height: Math.abs(point.y - origin.y),
      })
      return
    }

    setDraftAnnotation({
      ...draftAnnotation,
      points: [...draftAnnotation.points, point],
    })
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (isCropping) {
      cropOriginRef.current = null
      const activeCrop = cropRectRef.current
      if (
        activeCrop &&
        (activeCrop.width < 0.005 || activeCrop.height < 0.005)
      ) {
        setCropRect(null)
        cropRectRef.current = null
      }
      return
    }

    const activeDraft = draftAnnotationRef.current
    if (!activeDraft) {
      return
    }

    const point = toCanvasPoint(event)
    const finalizedDraft =
      activeDraft.kind === "stroke"
        ? {
            ...activeDraft,
            points: [...activeDraft.points, point],
          }
        : activeDraft

    if (
      finalizedDraft.kind === "rectangle" &&
      (finalizedDraft.width < 0.01 || finalizedDraft.height < 0.01)
    ) {
      setDraftAnnotation(null)
      draftAnnotationRef.current = null
      rectangleOriginRef.current = null
      return
    }

    commitDraftAnnotation(finalizedDraft)
  }

  const hasAnnotations = props.annotations.length > 0
  const cropReady =
    cropRect !== null &&
    cropRect.width >= MIN_CROP_RECT_SIZE &&
    cropRect.height >= MIN_CROP_RECT_SIZE

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr]">
      {isCropping ? (
        <div className="flex flex-wrap items-center gap-2 px-0 py-0 pb-4">
          <CropIcon className="h-4 w-4 text-muted-foreground" />
          <p className="m-0 flex-1 text-muted-foreground text-sm">
            Ziehen Sie mit der Maus ein Rechteck über den gewünschten
            Ausschnitt.
          </p>
          <Button
            className="gap-2"
            disabled={props.disabled || cropBusy || !cropReady}
            onClick={() => {
              applyCrop().catch(() => undefined)
            }}
            size="sm"
            type="button"
          >
            <CheckIcon className="h-4 w-4" />
            <span>{cropBusy ? "Wird zugeschnitten…" : "Übernehmen"}</span>
          </Button>
          <Button
            disabled={props.disabled || cropBusy}
            onClick={cancelCropping}
            size="sm"
            type="button"
            variant="outline"
          >
            Abbrechen
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 px-0 py-0 pb-4">
          <ToolButton
            active={tool === "draw"}
            disabled={props.disabled}
            icon={<DrawIcon className="h-4 w-4" />}
            label="Zeichnen"
            onClick={() => {
              setTool("draw")
            }}
          />
          <ToolButton
            active={tool === "highlight"}
            disabled={props.disabled}
            icon={<HighlightIcon className="h-4 w-4" />}
            label="Markieren"
            onClick={() => {
              setTool("highlight")
            }}
          />
          <ToolButton
            active={tool === "rectangle"}
            disabled={props.disabled}
            icon={<RectangleIcon className="h-4 w-4" />}
            label="Rechteck"
            onClick={() => {
              setTool("rectangle")
            }}
          />
          <div className="flex items-center gap-2">
            {screenshotAnnotationColorOptions.map((option) => (
              <ColorButton
                active={color === option.value}
                color={option.value}
                disabled={props.disabled}
                key={option.value}
                label={option.label}
                onClick={() => {
                  setColor(option.value)
                }}
              />
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {props.onCrop ? (
              <Button
                className="gap-2"
                disabled={props.disabled || !loadedImage}
                onClick={startCropping}
                size="sm"
                type="button"
                variant="outline"
              >
                <CropIcon className="h-4 w-4" />
                <span>Ausschnitt wählen</span>
              </Button>
            ) : null}
            <Button
              className="gap-2"
              disabled={props.disabled || !hasAnnotations}
              onClick={() => {
                props.onChange(props.annotations.slice(0, -1))
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <UndoIcon className="h-4 w-4" />
            </Button>
            <Button
              className="gap-2"
              disabled={props.disabled || !hasAnnotations}
              onClick={() => {
                props.onChange([])
                setDraftAnnotation(null)
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <ResetIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 overflow-auto" ref={containerRef}>
        <div className="flex h-full min-h-full w-full items-center justify-center">
          <canvas
            aria-label="Screenshot-Bearbeitung"
            className={cn(
              "block rounded-xl bg-white shadow-sm",
              props.disabled ? "cursor-default" : "cursor-crosshair"
            )}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            ref={canvasRef}
            style={{
              touchAction: "none",
            }}
          />
        </div>
      </div>
    </div>
  )

  function toCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>): {
    x: number
    y: number
  } {
    const rect = event.currentTarget.getBoundingClientRect()
    return clampAnnotationPoint({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    })
  }
}

function drawCropOverlay(input: {
  context: CanvasRenderingContext2D
  height: number
  rect: ScreenshotCropRect
  width: number
}): void {
  const { context, width, height, rect } = input
  const rx = rect.x * width
  const ry = rect.y * height
  const rw = rect.width * width
  const rh = rect.height * height

  context.save()
  context.beginPath()
  context.rect(0, 0, width, height)
  context.rect(rx, ry, rw, rh)
  context.fillStyle = "rgba(0, 0, 0, 0.55)"
  context.fill("evenodd")

  context.setLineDash([6, 4])
  context.strokeStyle = "#FFFFFF"
  context.lineWidth = 2
  context.strokeRect(rx, ry, rw, rh)
  context.restore()
}

function ToolButton(props: {
  active: boolean
  disabled: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <Button
      className={cn(
        "gap-2",
        props.active ? "border-transparent bg-foreground text-background" : null
      )}
      disabled={props.disabled}
      onClick={props.onClick}
      size="sm"
      type="button"
      variant={props.active ? "secondary" : "outline"}
    >
      <span className="text-sm">{props.icon}</span>
      <span>{props.label}</span>
    </Button>
  )
}

function ColorButton(props: {
  active: boolean
  color: string
  disabled: boolean
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      aria-label={props.label}
      className={cn(
        "h-5 w-5 rounded-full border transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        props.active ? "scale-110 border-foreground" : "border-border"
      )}
      disabled={props.disabled}
      onClick={props.onClick}
      style={{
        backgroundColor: props.color,
      }}
      type="button"
    />
  )
}
