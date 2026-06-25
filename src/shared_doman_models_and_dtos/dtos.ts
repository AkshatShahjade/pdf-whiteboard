export interface PointDTO {
  x: number;
  y: number;
}

export interface RectMarkDTO {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LassoMarkDTO {
  id: string;
  type: 'lasso';
  x: number;
  y: number;
  w: number;
  h: number;
  points: PointDTO[];
}

export interface SectionMarkDTO {
  id: string;
  type: 'section';
  y: number;
  h: number;
  w: number;
}

export type MarkDTO = RectMarkDTO | LassoMarkDTO | SectionMarkDTO;

export interface SlotSessionDTO {
  contentId: string;
  contentType: string;
  zoom: number;
  tool: string;
  selectedMarkId: string | null;
  scrollTop: number;
  marks: MarkDTO[];
}

export interface SessionDTO {
  leftPct: number;
  slots: Record<string, SlotSessionDTO>;
  metadata?: Record<string, any>;
}

export interface WhiteboardDTO {
  id: string;
  snapshot: any;
}
