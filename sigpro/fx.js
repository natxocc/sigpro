const fx = ({ name, duration = 200, scale, slide, rotate, blur }, child) => {
  const el = typeof child === "function" ? child() : child;
  if (!(el instanceof Node)) return el;
  if (name) {
    el.style.animation = `${name}-in ${duration}ms`;
    return el;
  }
  const hasTransform = scale || slide || rotate || blur;
  const initialTransform = [
    scale ? "scale(0.95)" : "",
    slide ? "translateY(-10px)" : "",
    rotate ? "rotate(-2deg)" : ""
  ].filter(Boolean).join(" ");
  el.style.transition = `all ${duration}ms ease`;
  el.style.opacity = "0";
  if (hasTransform) el.style.transform = initialTransform;
  if (blur) el.style.filter = "blur(4px)";
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    if (hasTransform) el.style.transform = "none";
    if (blur) el.style.filter = "none";
  });
  return el;
};

// Side-effect global
if (typeof window !== "undefined") {
  window.fx = fx;
}

export { fx };