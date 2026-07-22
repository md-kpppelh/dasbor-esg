import { useEffect, useRef } from "react";
import { motion, useInView, useReducedMotion, animate } from "motion/react";
import Lenis from "lenis";

const EASE = [0.16, 1, 0.3, 1]; // easeOutExpo — halus, "produx-like"

/* Smooth scroll global (Lenis). Hormati reduced-motion. Kembalikan ref instance. */
export function useLenis() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
    ref.current = lenis;
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); ref.current = null; };
  }, [reduce]);
  return ref;
}

/* Reveal saat masuk viewport (opacity + y). Reduced-motion → fade saja. */
export function Reveal({ children, delay = 0, y = 26, className, style, as = "div" }) {
  const reduce = useReducedMotion();
  const M = motion[as] || motion.div;
  return (
    <M
      className={className}
      style={style}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </M>
  );
}

/* Angka menghitung naik saat terlihat. `to` numerik; `fmt` memformat. null → "–". */
export function CountUp({ to, fmt = (v) => Math.round(v), duration = 1.15, className, style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const reduce = useReducedMotion();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (to == null) { node.textContent = "–"; return; }
    if (reduce || !inView) { node.textContent = inView ? fmt(to) : fmt(0); return; }
    const controls = animate(0, to, { duration, ease: EASE, onUpdate: (v) => { if (ref.current) ref.current.textContent = fmt(v); } });
    return () => controls.stop();
  }, [inView, to, reduce]); // eslint-disable-line
  return <span ref={ref} className={className} style={style}>{to == null ? "–" : fmt(0)}</span>;
}

/* Wrapper stagger untuk entrance hero (anak = <motion.* variants={ITEM}>). */
export const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
export const ITEM = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};
