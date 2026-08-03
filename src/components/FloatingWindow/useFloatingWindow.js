import { useEffect, useRef, useState } from "react";

let _zTop = 1200;
function nextZIndex() { return ++_zTop; }

export function useFloatingWindow({ id = "default", defaultPosition = { x: 20, y: 80 }, isOpen, onClose }) {
  function readPosition() {
    try {
      const raw = sessionStorage.getItem(`osflow-fw-${id}`);
      return raw ? JSON.parse(raw) : defaultPosition;
    } catch {
      return defaultPosition;
    }
  }

  const [position, setPosition] = useState(readPosition);
  const [minimized, setMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [zIndex, setZIndex] = useState(nextZIndex);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try { sessionStorage.setItem(`osflow-fw-${id}`, JSON.stringify(position)); } catch {}
  }, [id, position]);

  useEffect(() => {
    if (!isDragging) return;
    function onMove(e) {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 40, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y))
      });
    }
    function onUp() { setIsDragging(false); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  function handleDragStart(e) {
    if (isMobile) return;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setIsDragging(true);
    e.preventDefault();
  }

  function handleFocus() {
    setZIndex(nextZIndex());
  }

  function handleMinimize() {
    setMinimized((v) => !v);
  }

  return { position, minimized, isDragging, zIndex, isMobile, handleDragStart, handleFocus, handleMinimize };
}
