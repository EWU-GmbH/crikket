import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  clampAnnotationPoint,
  clampScreenshotTextOrigin,
  createCroppedScreenshotBlob,
  drawScreenshotAnnotations,
  getScreenshotTextFrame,
  type ScreenshotAnnotation,
  type ScreenshotAnnotationColor,
  type ScreenshotCropRect,
  screenshotAnnotationColorOptions,
  screenshotTextFontFamily,
  screenshotTextMaxLength,
} from "../utils/screenshot-annotations"
import {
  CheckIcon,
  CropIcon,
  DrawIcon,
  HighlightIcon,
  RectangleIcon,
  ResetIcon,
  TextIcon,
  UndoIcon,
} from "./icons"
import { Button } from "./primitives/button"
import { cn } from "./primitives/cn"

type AnnotationTool = "draw" | "highlight" | "rectangle" | "text"

type TextEditorState = {
  color: ScreenshotAnnotationColor
  sessionId: number
  value: string
  x: number
  y: number
}

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
  const textEditorRef = useRef<TextEditorState | null>(null)
  const textSessionRef = useRef(0)
  const undoConsumedRef = useRef(false)
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null)
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

    const nextAnnotations = [...annotationsRef.current, annotation]
    annotationsRef.current = nextAnnotations
    props.onChange(nextAnnotations)
    setDraftAnnotation(null)
    draftAnnotationRef.current = null
    rectangleOriginRef.current = null
  }

  const commitTextEditor = () => {
    const current = textEditorRef.current
    if (!current) {
      return
    }

    textEditorRef.current = null
    setTextEditor(null)
    const text = current.value.trim().slice(0, screenshotTextMaxLength)
    if (text.length === 0) {
      return
    }

    commitDraftAnnotation({
      kind: "text",
      color: current.color,
      text,
      x: current.x,
      y: current.y,
    })
  }

  const cancelTextEditor = () => {
    textEditorRef.current = null
    setTextEditor(null)
  }

  const openTextEditor = (point: { x: number; y: number }) => {
    commitTextEditor()
    const origin = clampScreenshotTextOrigin({
      height: displayHeight,
      point,
      width: displayWidth,
    })
    const next: TextEditorState = {
      color,
      sessionId: textSessionRef.current + 1,
      value: "",
      x: origin.x,
      y: origin.y,
    }
    textSessionRef.current = next.sessionId
    textEditorRef.current = next
    setTextEditor(next)
  }

  const applyColor = (nextColor: ScreenshotAnnotationColor) => {
    setColor(nextColor)
    const current = textEditorRef.current
    if (!current) {
      return
    }

    const next = { ...current, color: nextColor }
    textEditorRef.current = next
    setTextEditor(next)
  }

  const selectTool = (nextTool: AnnotationTool) => {
    if (nextTool !== "text") {
      commitTextEditor()
    }
    setTool(nextTool)
  }

  const replaceAnnotations = (nextAnnotations: ScreenshotAnnotation[]) => {
    annotationsRef.current = nextAnnotations
    props.onChange(nextAnnotations)
  }

  const startCropping = () => {
    commitTextEditor()
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

  const pointerContext: AnnotationPointerContext = {
    color,
    commitDraftAnnotation,
    cropOriginRef,
    cropRectRef,
    disabled: props.disabled,
    draftAnnotation,
    draftAnnotationRef,
    isCropping,
    loadedImage,
    openTextEditor,
    rectangleOriginRef,
    setCropRect,
    setDraftAnnotation,
    tool,
  }
  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    handleAnnotationPointerDown(event, pointerContext)
  }
  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    handleAnnotationPointerMove(event, pointerContext)
  }
  const handlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    handleAnnotationPointerEnd(event, pointerContext)
  }

  const hasAnnotations =
    props.annotations.length > 0 || (textEditor?.value.trim().length ?? 0) > 0
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
              selectTool("draw")
            }}
          />
          <ToolButton
            active={tool === "highlight"}
            disabled={props.disabled}
            icon={<HighlightIcon className="h-4 w-4" />}
            label="Markieren"
            onClick={() => {
              selectTool("highlight")
            }}
          />
          <ToolButton
            active={tool === "rectangle"}
            disabled={props.disabled}
            icon={<RectangleIcon className="h-4 w-4" />}
            label="Rechteck"
            onClick={() => {
              selectTool("rectangle")
            }}
          />
          <ToolButton
            active={tool === "text"}
            disabled={props.disabled}
            icon={<TextIcon className="h-4 w-4" />}
            label="Text"
            onClick={() => {
              selectTool("text")
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
                  applyColor(option.value)
                }}
                onMouseDown={(event) => {
                  if (textEditorRef.current) {
                    event.preventDefault()
                  }

                  applyColor(option.value)
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
                if (undoConsumedRef.current) {
                  undoConsumedRef.current = false
                  return
                }

                replaceAnnotations(annotationsRef.current.slice(0, -1))
              }}
              onMouseDown={(event) => {
                const current = textEditorRef.current
                if (event.button !== 0 || !current) {
                  return
                }

                event.preventDefault()
                cancelTextEditor()
                if (current.value.trim().length === 0) {
                  return
                }

                undoConsumedRef.current = true
                window.setTimeout(() => {
                  undoConsumedRef.current = false
                }, 0)
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
                cancelTextEditor()
                setDraftAnnotation(null)
                draftAnnotationRef.current = null
                replaceAnnotations([])
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
          <div
            className="relative"
            style={{
              height: displayHeight,
              width: displayWidth,
            }}
          >
            <canvas
              aria-label="Screenshot-Bearbeitung"
              className={cn(
                "block rounded-xl bg-white shadow-sm",
                annotationCanvasCursor({
                  disabled: props.disabled,
                  isCropping,
                  tool,
                })
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
            {textEditor ? (
              <ScreenshotTextInput
                color={textEditor.color}
                displayHeight={displayHeight}
                displayWidth={displayWidth}
                onBlur={(sessionId) => {
                  if (textEditorRef.current?.sessionId !== sessionId) {
                    return
                  }

                  commitTextEditor()
                }}
                onCancel={cancelTextEditor}
                onChange={(value) => {
                  const current = textEditorRef.current
                  if (!current) {
                    return
                  }

                  const next = { ...current, value }
                  textEditorRef.current = next
                  setTextEditor(next)
                }}
                onCommit={commitTextEditor}
                sessionId={textEditor.sessionId}
                value={textEditor.value}
                x={textEditor.x}
                y={textEditor.y}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

type AnnotationPointerContext = {
  color: ScreenshotAnnotationColor
  commitDraftAnnotation: (annotation: ScreenshotAnnotation | null) => void
  cropOriginRef: { current: { x: number; y: number } | null }
  cropRectRef: { current: ScreenshotCropRect | null }
  disabled: boolean
  draftAnnotation: ScreenshotAnnotation | null
  draftAnnotationRef: { current: ScreenshotAnnotation | null }
  isCropping: boolean
  loadedImage: HTMLImageElement | null
  openTextEditor: (point: { x: number; y: number }) => void
  rectangleOriginRef: { current: { x: number; y: number } | null }
  setCropRect: (rect: ScreenshotCropRect | null) => void
  setDraftAnnotation: (annotation: ScreenshotAnnotation | null) => void
  tool: AnnotationTool
}

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

function handleAnnotationPointerDown(
  event: ReactPointerEvent<HTMLCanvasElement>,
  input: AnnotationPointerContext
): void {
  if (input.disabled || !input.loadedImage || event.button !== 0) {
    return
  }

  const point = toCanvasPoint(event)

  if (!input.isCropping && input.tool === "text") {
    // Keep the caret in the new field. The browser would otherwise
    // blur it while this pointer gesture is still finishing.
    event.preventDefault()
    input.openTextEditor(point)
    return
  }

  event.currentTarget.setPointerCapture(event.pointerId)

  if (input.isCropping) {
    input.cropOriginRef.current = point
    const nextRect = { x: point.x, y: point.y, width: 0, height: 0 }
    input.setCropRect(nextRect)
    input.cropRectRef.current = nextRect
    return
  }

  if (input.tool === "rectangle") {
    input.rectangleOriginRef.current = point
    input.setDraftAnnotation({
      kind: "rectangle",
      color: input.color,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    })
    return
  }

  if (input.tool !== "draw" && input.tool !== "highlight") {
    return
  }

  input.setDraftAnnotation({
    color: input.color,
    kind: "stroke",
    points: [point],
    tool: input.tool,
  })
}

function handleAnnotationPointerMove(
  event: ReactPointerEvent<HTMLCanvasElement>,
  input: AnnotationPointerContext
): void {
  if (!input.loadedImage) {
    return
  }

  if (input.isCropping) {
    const origin = input.cropOriginRef.current
    const activeCrop = input.cropRectRef.current
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
    input.setCropRect(nextRect)
    input.cropRectRef.current = nextRect
    return
  }

  if (!input.draftAnnotation) {
    return
  }

  const point = toCanvasPoint(event)
  if (input.draftAnnotation.kind === "rectangle") {
    const origin = input.rectangleOriginRef.current ?? {
      x: input.draftAnnotation.x,
      y: input.draftAnnotation.y,
    }
    input.setDraftAnnotation({
      color: input.draftAnnotation.color,
      kind: "rectangle",
      x: Math.min(origin.x, point.x),
      y: Math.min(origin.y, point.y),
      width: Math.abs(point.x - origin.x),
      height: Math.abs(point.y - origin.y),
    })
    return
  }

  if (input.draftAnnotation.kind !== "stroke") {
    return
  }

  input.setDraftAnnotation({
    ...input.draftAnnotation,
    points: [...input.draftAnnotation.points, point],
  })
}

function handleAnnotationPointerEnd(
  event: ReactPointerEvent<HTMLCanvasElement>,
  input: AnnotationPointerContext
): void {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (input.isCropping) {
    input.cropOriginRef.current = null
    const activeCrop = input.cropRectRef.current
    if (activeCrop && (activeCrop.width < 0.005 || activeCrop.height < 0.005)) {
      input.setCropRect(null)
      input.cropRectRef.current = null
    }
    return
  }

  const activeDraft = input.draftAnnotationRef.current
  if (!activeDraft || activeDraft.kind === "text") {
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
    input.setDraftAnnotation(null)
    input.draftAnnotationRef.current = null
    input.rectangleOriginRef.current = null
    return
  }

  input.commitDraftAnnotation(finalizedDraft)
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

function annotationCanvasCursor(input: {
  disabled: boolean
  isCropping: boolean
  tool: AnnotationTool
}): string {
  if (input.disabled) {
    return "cursor-default"
  }

  if (input.tool === "text" && !input.isCropping) {
    return "cursor-text"
  }

  return "cursor-crosshair"
}

function resizeScreenshotTextArea(element: HTMLTextAreaElement): void {
  element.style.height = "0px"
  element.style.height = `${element.scrollHeight}px`
}

function ScreenshotTextInput(props: {
  color: ScreenshotAnnotationColor
  displayHeight: number
  displayWidth: number
  onBlur: (sessionId: number) => void
  onCancel: () => void
  onChange: (value: string) => void
  onCommit: () => void
  sessionId: number
  value: string
  x: number
  y: number
}): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const frame = getScreenshotTextFrame({
    height: props.displayHeight,
    width: props.displayWidth,
    x: props.x,
    y: props.y,
  })

  useEffect(() => {
    const element = inputRef.current
    if (!element || props.sessionId < 1) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      element.focus()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [props.sessionId])

  // Measuring the textarea depends on layout, not on values read inside the effect.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resize when the note or frame changes
  useEffect(() => {
    if (!inputRef.current) {
      return
    }

    resizeScreenshotTextArea(inputRef.current)
  }, [frame.lineHeight, frame.maxWidth, props.value])

  return (
    <textarea
      aria-label="Hinweis auf dem Screenshot"
      className="absolute z-10 m-0 resize-none overflow-hidden border-0 bg-transparent p-0 font-semibold outline-none placeholder:text-current placeholder:opacity-50"
      key={props.sessionId}
      maxLength={screenshotTextMaxLength}
      onBlur={() => {
        props.onBlur(props.sessionId)
      }}
      onChange={(event) => {
        props.onChange(event.currentTarget.value)
        resizeScreenshotTextArea(event.currentTarget)
      }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.key === "Process") {
          return
        }

        if (event.key === "Escape") {
          event.preventDefault()
          props.onCancel()
          return
        }

        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault()
          props.onCommit()
        }
      }}
      placeholder="Hinweis…"
      ref={inputRef}
      spellCheck={false}
      style={{
        caretColor: props.color,
        color: props.color,
        fontFamily: screenshotTextFontFamily,
        fontSize: `${frame.fontSize}px`,
        fontWeight: 600,
        left: frame.left,
        lineHeight: `${frame.lineHeight}px`,
        top: frame.top,
        width: frame.maxWidth,
      }}
      value={props.value}
    />
  )
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
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void
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
      onMouseDown={(event) => {
        if (event.button !== 0) {
          return
        }

        props.onMouseDown(event)
      }}
      style={{
        backgroundColor: props.color,
      }}
      type="button"
    />
  )
}
