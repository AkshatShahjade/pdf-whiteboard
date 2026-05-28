import type React from 'react'




const getLocalCoords = (e: React.MouseEvent<HTMLDivElement>,
  ref: React.RefObject<HTMLDivElement>) => {
  if (!ref.current) return { x: 0, y: 0 };
  const rect = ref.current.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

