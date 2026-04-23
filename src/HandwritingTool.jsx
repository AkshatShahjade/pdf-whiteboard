/* eslint-disable react-refresh/only-export-components */
import {
  DrawShapeUtil,
  Polyline2d,
  SVGContainer,
  StateNode,
  Vec,
  b64Vecs,
  createShapeId,
  createShapePropsMigrationSequence,
  drawShapeProps,
  getColorValue,
  getPointsFromDrawSegments,
  useDefaultColorTheme,
} from 'tldraw'

const MIN_POINT_DISTANCE = 0.2

const STROKE_SIZES = {
  s: 2,
  m: 4,
  l: 8,
  xl: 16,
}

const handwritingMigrations = createShapePropsMigrationSequence({
  sequence: [],
  sequenceId: 'com.tldraw.shape.handwriting',
  retroactive: false,
})

function getStrokePath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    path += ` L ${points[i].x} ${points[i].y}`
  }
  return path
}

function HandwritingSvg({ shape }) {
  const theme = useDefaultColorTheme()
  const points = getPointsFromDrawSegments(shape.props.segments, shape.props.scaleX, shape.props.scaleY)
  const strokePath = getStrokePath(points)
  const baseWidth = STROKE_SIZES[shape.props.size] ?? 4

  return (
    <path
      d={strokePath}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke={getColorValue(theme, shape.props.color, 'solid')}
      strokeWidth={(shape.props.scale || 1) * baseWidth}
      vectorEffect="non-scaling-stroke"
    />
  )
}

export class HandwritingShapeUtil extends DrawShapeUtil {
  static type = 'handwriting'
  static props = drawShapeProps
  static migrations = handwritingMigrations

  getGeometry(shape) {
    const points = getPointsFromDrawSegments(shape.props.segments, shape.props.scaleX, shape.props.scaleY)

    if (points.length < 2) {
      return super.getGeometry(shape)
    }

    return new Polyline2d({ points })
  }

  component(shape) {
    return (
      <SVGContainer>
        <HandwritingSvg shape={shape} />
      </SVGContainer>
    )
  }

  indicator(shape) {
    const points = getPointsFromDrawSegments(shape.props.segments, shape.props.scaleX, shape.props.scaleY)
    return <path d={getStrokePath(points)} />
  }

  getIndicatorPath(shape) {
    return new Path2D(getStrokePath(getPointsFromDrawSegments(shape.props.segments, shape.props.scaleX, shape.props.scaleY)))
  }

  getInterpolatedProps(startShape, endShape, t) {
    return t < 0.5 ? startShape.props : endShape.props
  }
}

class HandwritingIdle extends StateNode {
  static id = 'idle'

  onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 })
  }

  onPointerDown(info) {
    this.parent.transition('drawing', info)
  }

  onCancel() {
    this.editor.setCurrentTool('select')
  }
}

class HandwritingDrawing extends StateNode {
  static id = 'drawing'

  info = {}
  shapeId = null
  isPenOrStylus = false
  points = []

  onEnter(info) {
    this.info = info
    this.startShape()
  }

  startShape() {
    const origin = this.editor.inputs.getOriginPagePoint()
    const z = this.info?.point?.z ?? 0.5

    this.isPenOrStylus = z > 0 && z < 1

    const pressure = this.isPenOrStylus ? +(z * 1.25).toFixed(2) : 0.5
    this.points = [new Vec(0, 0, pressure)]
    this.shapeId = createShapeId()

    this.editor.createShape({
      id: this.shapeId,
      type: 'handwriting',
      x: origin.x,
      y: origin.y,
      props: {
        isPen: this.isPenOrStylus,
        scale: this.editor.getResizeScaleFactor(),
        isComplete: false,
        segments: [{ type: 'free', path: b64Vecs.encodePoints(this.points) }],
      },
    })
  }

  onPointerMove() {
    const shape = this.shapeId ? this.editor.getShape(this.shapeId) : null
    if (!shape) return

    const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
    const localPoint = this.editor.getPointInShapeSpace(shape, currentPagePoint).toFixed()
    const pressure = this.isPenOrStylus ? +(currentPagePoint.z * 1.25).toFixed(2) : 0.5
    const nextPoint = new Vec(localPoint.x, localPoint.y, pressure)
    const prev = this.points[this.points.length - 1]

    if (prev && Vec.Dist(prev, nextPoint) < MIN_POINT_DISTANCE) return

    this.points.push(nextPoint)
    this.editor.updateShapes([
      {
        id: shape.id,
        type: shape.type,
        props: {
          segments: [{ type: 'free', path: b64Vecs.encodePoints(this.points) }],
        },
      },
    ])
  }

  onPointerUp() {
    this.complete()
  }

  onComplete() {
    this.complete()
  }

  onCancel() {
    this.complete()
  }

  complete() {
    if (!this.shapeId) {
      this.parent.transition('idle')
      return
    }

    this.editor.updateShapes([{ id: this.shapeId, type: 'handwriting', props: { isComplete: true } }])
    this.parent.transition('idle')
  }
}

export class HandwritingTool extends StateNode {
  static id = 'handwriting'
  static initial = 'idle'
  static isLockable = false
  static useCoalescedEvents = true

  static children() {
    return [HandwritingIdle, HandwritingDrawing]
  }

  shapeType = 'handwriting'
}

export const handwritingToolUiOverrides = {
  tools(editor, tools) {
    return {
      ...tools,
      handwriting: {
        id: 'handwriting',
        label: 'tool.handwriting',
        icon: 'tool-handwriting',
        kbd: 'w',
        onSelect() {
          editor.setCurrentTool('handwriting')
        },
      },
    }
  },
  toolbar(editor, toolbarItems, helpers) {
    const drawIndex = toolbarItems.findIndex((item) => item.id === 'draw')
    if (drawIndex !== -1) {
      toolbarItems.splice(drawIndex, 0, helpers.toolItem(editor.getTool('handwriting')))
    } else {
      toolbarItems.push(helpers.toolItem(editor.getTool('handwriting')))
    }
    return toolbarItems
  },
  translations: {
    en: {
      'tool.handwriting': 'Handwriting',
    },
  },
}
