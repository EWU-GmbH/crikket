export interface ScreenshotAnnotationPoint {
  x: number
  y: number
}

export const screenshotAnnotationColorOptions = [
  { label: "Orange", value: "#F97316" },
  { label: "Rot", value: "#EF4444" },
  { label: "Blau", value: "#3B82F6" },
  { label: "Grün", value: "#22C55E" },
] as const

export type ScreenshotAnnotationColor =
  (typeof screenshotAnnotationColorOptions)[number]["value"]

export interface ScreenshotStrokeAnnotation {
  kind: "stroke"
  tool: "draw" | "highlight"
  points: ScreenshotAnnotationPoint[]
  color: ScreenshotAnnotationColor
}

export interface ScreenshotRectangleAnnotation {
  kind: "rectangle"
  x: number
  y: number
  width: number
  height: number
  color: ScreenshotAnnotationColor
}

export interface ScreenshotTextAnnotation {
  kind: "text"
  x: number
  y: number
  text: string
  color: ScreenshotAnnotationColor
}

export type ScreenshotAnnotation =
  | ScreenshotStrokeAnnotation
  | ScreenshotRectangleAnnotation
  | ScreenshotTextAnnotation

export const screenshotTextFontFamily = "ui-sans-serif, system-ui, sans-serif"
export const screenshotTextMaxLength = 500

/** Normalized (0–1) crop rectangle relative to the full screenshot. */
export interface ScreenshotCropRect {
  x: number
  y: number
  width: number
  height: number
}

const MIN_CROP_EDGE_PX = 2

export async function createCroppedScreenshotBlob(input: {
  imageUrl: string
  rect: ScreenshotCropRect
}): Promise<Blob | null> {
  const image = await loadImage(input.imageUrl)
  const cropX = Math.round(clampUnit(input.rect.x) * image.naturalWidth)
  const cropY = Math.round(clampUnit(input.rect.y) * image.naturalHeight)
  const cropWidth = Math.round(clampUnit(input.rect.width) * image.naturalWidth)
  const cropHeight = Math.round(
    clampUnit(input.rect.height) * image.naturalHeight
  )

  if (cropWidth < MIN_CROP_EDGE_PX || cropHeight < MIN_CROP_EDGE_PX) {
    return null
  }

  const canvas = document.createElement("canvas")
  canvas.width = cropWidth
  canvas.height = cropHeight

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Failed to create screenshot crop canvas.")
  }

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to export cropped screenshot."))
        return
      }

      resolve(blob)
    }, "image/png")
  })
}

export async function createAnnotatedScreenshotBlob(input: {
  annotations: ScreenshotAnnotation[]
  imageUrl: string
}): Promise<Blob | null> {
  if (input.annotations.length === 0) {
    return null
  }

  const image = await loadImage(input.imageUrl)
  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Failed to create screenshot annotation canvas.")
  }

  drawScreenshotAnnotations({
    annotations: input.annotations,
    context,
    height: canvas.height,
    image,
    width: canvas.width,
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to export annotated screenshot."))
        return
      }

      resolve(blob)
    }, "image/png")
  })
}

export function drawScreenshotAnnotations(input: {
  annotations: ScreenshotAnnotation[]
  context: CanvasRenderingContext2D
  height: number
  image: CanvasImageSource
  width: number
}): void {
  input.context.clearRect(0, 0, input.width, input.height)
  input.context.drawImage(input.image, 0, 0, input.width, input.height)

  for (const annotation of input.annotations) {
    drawAnnotation({
      annotation,
      context: input.context,
      height: input.height,
      width: input.width,
    })
  }
}

export function clampAnnotationPoint(
  point: ScreenshotAnnotationPoint
): ScreenshotAnnotationPoint {
  return {
    x: clampUnit(point.x),
    y: clampUnit(point.y),
  }
}

export function getScreenshotTextStyle(
  width: number,
  height: number
): { font: string; fontSize: number; lineHeight: number } {
  const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.042))
  const lineHeight = Math.round(fontSize * 1.25)

  return {
    font: `600 ${fontSize}px ${screenshotTextFontFamily}`,
    fontSize,
    lineHeight,
  }
}

export function getScreenshotTextFrame(input: {
  height: number
  width: number
  x: number
  y: number
}): {
  font: string
  fontSize: number
  left: number
  lineHeight: number
  maxWidth: number
  top: number
} {
  const style = getScreenshotTextStyle(input.width, input.height)
  const edge = screenshotTextEdgePadding(input.width, input.height)
  const left = input.x * input.width
  const top = input.y * input.height

  return {
    ...style,
    left,
    maxWidth: Math.max(style.fontSize * 2, input.width - left - edge),
    top,
  }
}

export function clampScreenshotTextOrigin(input: {
  height: number
  point: ScreenshotAnnotationPoint
  width: number
}): ScreenshotAnnotationPoint {
  const style = getScreenshotTextStyle(input.width, input.height)
  const edge = screenshotTextEdgePadding(input.width, input.height)
  const minBox = style.fontSize * 4
  const maxX = Math.max(0, (input.width - minBox - edge) / input.width)
  const maxY = Math.max(0, (input.height - style.lineHeight) / input.height)

  return clampAnnotationPoint({
    x: Math.min(input.point.x, maxX),
    y: Math.min(input.point.y, maxY),
  })
}

function drawAnnotation(input: {
  annotation: ScreenshotAnnotation
  context: CanvasRenderingContext2D
  height: number
  width: number
}): void {
  switch (input.annotation.kind) {
    case "rectangle":
      drawRectangle({
        ...input,
        annotation: input.annotation,
      })
      return
    case "stroke":
      drawStroke({
        ...input,
        annotation: input.annotation,
      })
      return
    case "text":
      drawText({
        ...input,
        annotation: input.annotation,
      })
      return
    default: {
      const unreachable: never = input.annotation
      throw new Error(
        `Unknown screenshot annotation: ${JSON.stringify(unreachable)}`
      )
    }
  }
}

function drawStroke(input: {
  annotation: ScreenshotStrokeAnnotation
  context: CanvasRenderingContext2D
  height: number
  width: number
}): void {
  if (input.annotation.points.length === 0) {
    return
  }

  const { context, width, height } = input
  const strokeWidth =
    input.annotation.tool === "highlight"
      ? Math.max(14, Math.round(Math.min(width, height) * 0.025))
      : Math.max(3, Math.round(Math.min(width, height) * 0.006))

  const [firstPoint, ...remainingPoints] = input.annotation.points
  if (!firstPoint) {
    return
  }

  context.save()
  context.strokeStyle =
    input.annotation.tool === "highlight"
      ? withAlpha(input.annotation.color, 0.28)
      : input.annotation.color
  context.lineCap = "round"
  context.lineJoin = "round"
  context.lineWidth = strokeWidth
  context.beginPath()
  context.moveTo(firstPoint.x * width, firstPoint.y * height)
  for (const point of remainingPoints) {
    context.lineTo(point.x * width, point.y * height)
  }

  if (remainingPoints.length === 0) {
    context.lineTo(firstPoint.x * width + 0.01, firstPoint.y * height + 0.01)
  }

  context.stroke()
  context.restore()
}

function drawRectangle(input: {
  annotation: ScreenshotRectangleAnnotation
  context: CanvasRenderingContext2D
  height: number
  width: number
}): void {
  const { annotation, context, width, height } = input
  const x = annotation.x * width
  const y = annotation.y * height
  const rectangleWidth = annotation.width * width
  const rectangleHeight = annotation.height * height

  context.save()
  context.fillStyle = withAlpha(annotation.color, 0.08)
  context.strokeStyle = annotation.color
  context.lineWidth = Math.max(3, Math.round(Math.min(width, height) * 0.005))
  context.fillRect(x, y, rectangleWidth, rectangleHeight)
  context.strokeRect(x, y, rectangleWidth, rectangleHeight)
  context.restore()
}

function drawText(input: {
  annotation: ScreenshotTextAnnotation
  context: CanvasRenderingContext2D
  height: number
  width: number
}): void {
  const text = input.annotation.text
  if (text.trim().length === 0) {
    return
  }

  const frame = getScreenshotTextFrame({
    height: input.height,
    width: input.width,
    x: input.annotation.x,
    y: input.annotation.y,
  })
  const { context } = input

  context.save()
  context.font = frame.font
  context.textAlign = "left"
  context.textBaseline = "top"
  context.fillStyle = input.annotation.color

  const lines = wrapScreenshotText(context, text, frame.maxWidth)
  for (const [index, line] of lines.entries()) {
    if (line.length === 0) {
      continue
    }

    context.fillText(line, frame.left, frame.top + index * frame.lineHeight)
  }

  context.restore()
}

const screenshotTextWordSplitPattern = /(\s+)/u
const screenshotTextTrailingSpacePattern = /\s+$/u
const screenshotTextOnlySpacePattern = /^\s+$/u

function wrapScreenshotText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = []

  for (const paragraph of text.split("\n")) {
    lines.push(...wrapScreenshotParagraph(context, paragraph, maxWidth))
  }

  return lines
}

function wrapScreenshotParagraph(
  context: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number
): string[] {
  if (paragraph.length === 0) {
    return [""]
  }

  const lines: string[] = []
  let current = ""
  for (const word of paragraph.split(screenshotTextWordSplitPattern)) {
    if (word.length === 0) {
      continue
    }

    current = appendScreenshotWord({
      context,
      current,
      lines,
      maxWidth,
      word,
    })
  }

  lines.push(current.replace(screenshotTextTrailingSpacePattern, ""))
  return lines
}

function appendScreenshotWord(input: {
  context: CanvasRenderingContext2D
  current: string
  lines: string[]
  maxWidth: number
  word: string
}): string {
  const candidate =
    input.current.length === 0 ? input.word : `${input.current}${input.word}`
  if (fitsScreenshotText(input.context, candidate, input.maxWidth)) {
    return candidate
  }

  if (input.current.length > 0) {
    input.lines.push(
      input.current.replace(screenshotTextTrailingSpacePattern, "")
    )
  }

  if (screenshotTextOnlySpacePattern.test(input.word)) {
    return ""
  }

  if (fitsScreenshotText(input.context, input.word, input.maxWidth)) {
    return input.word
  }

  return pushScreenshotTextChunks(
    input.context,
    input.word,
    input.maxWidth,
    input.lines
  )
}

function pushScreenshotTextChunks(
  context: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
  lines: string[]
): string {
  let chunk = ""
  for (const char of word) {
    const nextChunk = `${chunk}${char}`
    if (
      fitsScreenshotText(context, nextChunk, maxWidth) ||
      chunk.length === 0
    ) {
      chunk = nextChunk
      continue
    }

    lines.push(chunk)
    chunk = char
  }

  return chunk
}

function fitsScreenshotText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): boolean {
  return context.measureText(text).width <= maxWidth
}

function screenshotTextEdgePadding(width: number, height: number): number {
  return Math.max(8, Math.round(Math.min(width, height) * 0.01))
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = "async"
    image.onload = () => {
      resolve(image)
    }
    image.onerror = () => {
      reject(new Error("Failed to load screenshot for annotation."))
    }
    image.src = source
  })
}

function withAlpha(color: ScreenshotAnnotationColor, alpha: number): string {
  const hex = color.slice(1)
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
