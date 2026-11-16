'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import AiLottieAnimation from '@/components/ai-lottie-animation';

type Point = { x: number; y: number };

export default function AboutAiLauncher() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('al-burhan-ai-launcher-position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          setPosition({
            x: Math.max(8, Math.min(parsed.x, window.innerWidth - 152)),
            y: Math.max(8, Math.min(parsed.y, window.innerHeight - 152)),
          });
        }
      }
    } catch {
      // Keep the default bottom-right position if saved coordinates are invalid.
    }

  }, []);

  const drag = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    x: number;
    y: number;
    moved: boolean;
  }>({ pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0, x: 0, y: 0, moved: false });

  if (!mounted) return null;

  return createPortal(
    <div
      className="alburhan-ai-float-wrap about-ai-float-portal"
      style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : { right: 20, bottom: 18, left: 'auto', top: 'auto' }}
    >
      <button
        type="button"
        className="alburhan-ai-float-button"
        aria-label="Open Al-Burhan AI assistant. Drag to move."
        title="AI Assistant — drag to move, click to chat"
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          drag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: rect.left,
            originY: rect.top,
            x: rect.left,
            y: rect.top,
            moved: false,
          };
          setPosition({ x: rect.left, y: rect.top });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (current.pointerId !== event.pointerId) return;
          const dx = event.clientX - current.startX;
          const dy = event.clientY - current.startY;
          if (!current.moved && Math.hypot(dx, dy) > 4) current.moved = true;
          if (!current.moved) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const next = {
            x: Math.max(8, Math.min(current.originX + dx, window.innerWidth - rect.width - 8)),
            y: Math.max(8, Math.min(current.originY + dy, window.innerHeight - rect.height - 8)),
          };
          current.x = next.x;
          current.y = next.y;
          setPosition(next);
        }}
        onPointerUp={(event) => {
          const current = drag.current;
          if (current.pointerId !== event.pointerId) return;
          current.pointerId = null;
          if (current.moved) {
            try { localStorage.setItem('al-burhan-ai-launcher-position', JSON.stringify({ x: current.x, y: current.y })); } catch {}
          }
        }}
        onPointerCancel={() => { drag.current.pointerId = null; drag.current.moved = false; }}
        onClick={() => {
          if (drag.current.moved) {
            drag.current.moved = false;
            return;
          }
          router.push('/?openAI=1');
        }}
      >
        <AiLottieAnimation className="alburhan-ai-lottie" />
        <span className="alburhan-ai-float-halo" aria-hidden="true" />
      </button>
      <span className="alburhan-ai-float-label" aria-hidden="true">Ask Al-Burhan AI</span>
    </div>,
    document.body,
  );
}
