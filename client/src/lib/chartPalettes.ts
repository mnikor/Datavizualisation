export const colorPalettes = {
  default: {
    name: 'Default',
    colors: ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
  },
  jnj: {
    name: 'Johnson & Johnson',
    colors: ['#C8102E', '#00447C', '#71A860', '#F58220', '#6B2C91', '#FDB913']
  },
  nature: {
    name: 'Nature Publishing',
    colors: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4']
  },
  nejm: {
    name: 'NEJM Style',
    colors: ['#BC3C29', '#0072B5', '#E18727', '#20854E', '#7876B1', '#6F99AD']
  },
  vibrant: {
    name: 'Vibrant',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']
  },
  grayscale: {
    name: 'Grayscale Print',
    colors: ['#111827', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6']
  },
  colorblind: {
    name: 'Colorblind Safe',
    colors: ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#F0E442', '#56B4E9']
  }
} as const;

export type PaletteKey = keyof typeof colorPalettes;
