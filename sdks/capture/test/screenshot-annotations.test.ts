import { describe, expect, it } from "bun:test"

import {
  clampScreenshotTextOrigin,
  drawScreenshotAnnotations,
  type ScreenshotAnnotation,
} from "../src/ui/capture-widget/utils/screenshot-annotations"

function createRecordingContext(): {
  context: CanvasRenderingContext2D
  calls: string[]
  fillTexts: Array<{ fillStyle: string; text: string; x: number; y: number }>
} {
  const calls: string[] = []
  const fillTexts: Array<{
    fillStyle: string
    text: string
    x: number
    y: number
  }> = []
  let fillStyle = ""

  const context = {
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(value: string) {
      fillStyle = value
    },
    font: "",
    lineCap: "butt",
    lineJoin: "miter",
    lineWidth: 1,
    strokeStyle: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    beginPath() {
      calls.push("beginPath")
    },
    clearRect() {
      calls.push("clearRect")
    },
    drawImage() {
      calls.push("drawImage")
    },
    fillRect() {
      calls.push("fillRect")
    },
    fillText(text: string, x: number, y: number) {
      fillTexts.push({ fillStyle, text, x, y })
    },
    lineTo() {
      calls.push("lineTo")
    },
    measureText(text: string) {
      return { width: text.length * 20 }
    },
    moveTo() {
      calls.push("moveTo")
    },
    restore() {
      calls.push("restore")
    },
    save() {
      calls.push("save")
    },
    stroke() {
      calls.push("stroke")
    },
    strokeRect() {
      calls.push("strokeRect")
    },
  }

  return {
    calls,
    context: context as unknown as CanvasRenderingContext2D,
    fillTexts,
  }
}

const image = {} as CanvasImageSource

describe("screenshot text annotations", () => {
  it("draws text in the selected color at the click position", () => {
    const recording = createRecordingContext()

    drawScreenshotAnnotations({
      annotations: [
        {
          kind: "text",
          color: "#3B82F6",
          text: "Hinweis",
          x: 0.2,
          y: 0.3,
        },
      ],
      context: recording.context,
      height: 200,
      image,
      width: 400,
    })

    expect(recording.fillTexts).toEqual([
      {
        fillStyle: "#3B82F6",
        text: "Hinweis",
        x: 80,
        y: 60,
      },
    ])
  })

  it("keeps explicit line breaks and wraps long text", () => {
    const recording = createRecordingContext()

    drawScreenshotAnnotations({
      annotations: [
        {
          kind: "text",
          color: "#EF4444",
          text: "Oben\nABCDEFGHIJKLMNOP",
          x: 0,
          y: 0,
        },
      ],
      context: recording.context,
      height: 80,
      image,
      width: 80,
    })

    expect(recording.fillTexts.map((entry) => entry.text)).toEqual([
      "Obe",
      "n",
      "ABC",
      "DEF",
      "GHI",
      "JKL",
      "MNO",
      "P",
    ])
  })

  it("still draws strokes and rectangles together with text", () => {
    const recording = createRecordingContext()
    const annotations: ScreenshotAnnotation[] = [
      {
        kind: "stroke",
        tool: "draw",
        color: "#F97316",
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.2, y: 0.2 },
        ],
      },
      {
        kind: "rectangle",
        color: "#22C55E",
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.2,
      },
      {
        kind: "text",
        color: "#EF4444",
        text: "Siehe hier",
        x: 0.4,
        y: 0.5,
      },
    ]

    drawScreenshotAnnotations({
      annotations,
      context: recording.context,
      height: 200,
      image,
      width: 400,
    })

    expect(recording.calls).toContain("stroke")
    expect(recording.calls).toContain("fillRect")
    expect(recording.fillTexts.map((entry) => entry.text)).toEqual([
      "Siehe hier",
    ])
  })

  it("skips blank text and rejects unknown annotation kinds", () => {
    const recording = createRecordingContext()

    drawScreenshotAnnotations({
      annotations: [
        {
          kind: "text",
          color: "#F97316",
          text: "   ",
          x: 0.1,
          y: 0.1,
        },
      ],
      context: recording.context,
      height: 100,
      image,
      width: 100,
    })

    expect(recording.fillTexts).toEqual([])

    expect(() => {
      drawScreenshotAnnotations({
        annotations: [
          {
            kind: "nope",
          } as unknown as ScreenshotAnnotation,
        ],
        context: recording.context,
        height: 100,
        image,
        width: 100,
      })
    }).toThrow("Unknown screenshot annotation")
  })

  it("keeps a text origin inside the screenshot", () => {
    const origin = clampScreenshotTextOrigin({
      height: 300,
      point: { x: 0.99, y: 0.99 },
      width: 400,
    })

    expect(origin.x).toBeCloseTo(0.82)
    expect(origin.y).toBeCloseTo(280 / 300)
    expect(origin.x).toBeGreaterThanOrEqual(0)
    expect(origin.y).toBeGreaterThanOrEqual(0)
  })
})
