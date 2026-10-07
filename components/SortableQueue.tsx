'use client'

import { useRef, useState, useTransition, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { reorderPatients } from '@/app/actions'
import { Icon } from './Icon'

type Item = { id: string; content: ReactNode }
type Drag = { id: string; pointerId: number; startY: number; start: number; target: number; rects: DOMRect[]; gap: number }

/**
 * Today's waiting patients, which an assistant can drag into a new order by the handle, with a
 * finger or a mouse, or move with the arrow keys. The new order is saved straight away.
 */
export function SortableQueue({ items, handleLabel }: { items: Item[]; handleLabel: string }) {
  const serverOrder = items.map((i) => i.id)
  const [order, setOrder] = useState(serverOrder)
  const [seen, setSeen] = useState(serverOrder.join())
  if (serverOrder.join() !== seen) {
    // The server sent a new list (someone was added, called in or removed): start from it.
    setSeen(serverOrder.join())
    setOrder(serverOrder)
  }
  const byId = new Map(items.map((i) => [i.id, i]))
  const ids = order.filter((id) => byId.has(id))

  const listRef = useRef<HTMLOListElement>(null)
  const drag = useRef<Drag | null>(null)
  const [dragState, setDragState] = useState<{ id: string; dy: number; start: number; target: number; shift: number; settling: boolean } | null>(
    null,
  )
  const [, startTransition] = useTransition()
  // Turns transitions off for the frame where the list swaps to its new order, so nothing slides twice.
  const [still, setStill] = useState(false)

  function commit(next: string[]) {
    setOrder(next)
    startTransition(() => reorderPatients(next))
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, id: string) {
    if (e.button !== 0 || !listRef.current) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rects = [...listRef.current.children].map((el) => el.getBoundingClientRect())
    const start = ids.indexOf(id)
    const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 0
    drag.current = { id, pointerId: e.pointerId, startY: e.clientY, start, target: start, rects, gap }
    setDragState({ id, dy: 0, start, target: start, shift: rects[start].height + gap, settling: false })
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    const dy = e.clientY - d.startY
    const mid = (r: DOMRect) => r.top + r.height / 2
    const center = mid(d.rects[d.start]) + dy
    let t = d.start
    while (t + 1 < d.rects.length && center > mid(d.rects[t + 1])) t++
    while (t - 1 >= 0 && center < mid(d.rects[t - 1])) t--
    d.target = t
    setDragState({ id: d.id, dy, start: d.start, target: t, shift: d.rects[d.start].height + d.gap, settling: false })
  }

  function onPointerUp(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    drag.current = null
    const { start, target, rects } = d
    // Glide into the empty spot, then swap the list over without any jump.
    const finalDy = target > start ? rects[target].bottom - rects[start].bottom : rects[target].top - rects[start].top
    setDragState({ id: d.id, dy: finalDy, start, target, shift: rects[start].height + d.gap, settling: true })
    window.setTimeout(() => {
      setStill(true)
      setDragState(null)
      requestAnimationFrame(() => requestAnimationFrame(() => setStill(false)))
      if (target !== start) {
        const next = [...ids]
        next.splice(target, 0, ...next.splice(start, 1))
        commit(next)
      }
    }, 180)
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, id: string) {
    const i = ids.indexOf(id)
    const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : -1
    if (to < 0 || to >= ids.length) return
    e.preventDefault()
    const next = [...ids]
    next.splice(to, 0, ...next.splice(i, 1))
    commit(next)
    // Keep focus on the handle that moved.
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(`[data-handle="${id}"]`)?.focus())
  }

  function offsetFor(index: number): number {
    if (!dragState) return 0
    const { start, target, shift } = dragState
    if (target > start && index > start && index <= target) return -shift
    if (target < start && index >= target && index < start) return shift
    return 0
  }

  return (
    <ol className={`list sortable${dragState ? ' is-dragging' : ''}${still ? ' is-still' : ''}`} ref={listRef}>
      {ids.map((id, index) => {
        const dragging = dragState?.id === id
        const y = dragging ? dragState.dy : offsetFor(index)
        return (
          <li
            key={id}
            className={`queue-item sortable-item${dragging ? ' dragging' : ''}${dragging && dragState.settling ? ' settling' : ''}`}
            style={y ? { transform: `translateY(${y}px)` } : undefined}
          >
            <button
              type="button"
              className="drag-handle"
              aria-label={handleLabel}
              data-handle={id}
              onPointerDown={(e) => onPointerDown(e, id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={(e) => onKeyDown(e, id)}
            >
              <Icon name="grip" size={18} />
            </button>
            {byId.get(id)!.content}
          </li>
        )
      })}
    </ol>
  )
}
