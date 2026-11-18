import React, { useRef, useState, useEffect } from "react";

/**
 * Card3DTilt
 * Ultra-smooth 3D Perspective Tilt wrapper with dynamic specular light reflection.
 * Automatically disables on mobile / touch viewports to eliminate touch-scroll glitches.
 */
export default function Card3DTilt({
  children,
  className = "",
  maxTilt = 8,
  glare = true,
  scale = 1.015,
  onClick,
  style = {}
}) {
  const cardRef = useRef(null);
  const rafRef = useRef(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [transformStyle, setTransformStyle] = useState("");
  const [glareStyle, setGlareStyle] = useState({ opacity: 0 });

  useEffect(() => {
    const checkTouch = () => {
      const isTouch =
        (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
        (typeof window !== "undefined" && "ontouchstart" in window) ||
        (typeof window !== "undefined" && window.innerWidth < 768);
      setIsTouchDevice(Boolean(isTouch));
    };
    checkTouch();
    window.addEventListener("resize", checkTouch, { passive: true });
    return () => {
      window.removeEventListener("resize", checkTouch);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // On touch / mobile screens, render smoothly without 3D perspective manipulation
  if (isTouchDevice) {
    return (
      <div onClick={onClick} className={className} style={style}>
        {children}
      </div>
    );
  }

  const handlePointerMove = (e) => {
    if (e.pointerType === "touch") return;
    if (!cardRef.current) return;
    if (rafRef.current) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotX = ((y - centerY) / centerY) * -maxTilt;
      const rotY = ((x - centerX) / centerX) * maxTilt;

      setTransformStyle(
        `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
      );

      if (glare) {
        setGlareStyle({
          opacity: 0.18,
          background: `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 65%)`
        });
      }
    });
  };

  const handlePointerLeave = () => {
    setTransformStyle("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setGlareStyle({ opacity: 0 });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: transformStyle,
        transformStyle: "preserve-3d",
        ...style
      }}
    >
      {children}
      {glare && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300"
          style={{
            ...glareStyle,
            mixBlendMode: "overlay"
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
