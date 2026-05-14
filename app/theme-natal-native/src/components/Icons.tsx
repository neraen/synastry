import React from 'react';
import Svg, { Path, Circle, Polyline, Polygon, Rect, Line } from 'react-native-svg';

type P = { size?: number; color?: string };

const stroke = (color: string) => ({
  stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none',
});

export const SparkleIcon = ({ size = 16, color = '#E5C266' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2l2.3 6.7L21 11l-6.7 2.3L12 20l-2.3-6.7L3 11l6.7-2.3L12 2z" fill={color} />
  </Svg>
);

export const HelpIcon = ({ size = 14, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" {...stroke(color)} />
    <Path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4" {...stroke(color)} />
    <Circle cx="12" cy="17" r="0.6" fill={color} />
  </Svg>
);

export const PinIcon = ({ size = 14, color = '#E5C266' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" {...stroke(color)} />
    <Circle cx="12" cy="10" r="3" {...stroke(color)} />
  </Svg>
);

export const CakeIcon = ({ size = 14, color = '#E5C266' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="11" width="18" height="10" rx="2" {...stroke(color)} />
    <Path d="M3 15h18M8 11V8m4 3V8m4 3V8" {...stroke(color)} />
  </Svg>
);

export const ClockIcon = ({ size = 14, color = '#E5C266' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" {...stroke(color)} />
    <Polyline points="12 6 12 12 16 14" {...stroke(color)} />
  </Svg>
);

export const SunIcon = ({ size = 22, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="4" {...stroke(color)} />
    <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" {...stroke(color)} />
  </Svg>
);

export const StarIcon = ({ size = 22, color = '#E5C266', filled = true }: P & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon
      points="12,2 14.9,8.9 22,9.7 16.7,14.4 18.2,22 12,18.3 5.8,22 7.3,14.4 2,9.7 9.1,8.9"
      fill={filled ? color : 'none'} stroke={color} strokeWidth={2} strokeLinejoin="round"
    />
  </Svg>
);

export const HeartIcon = ({ size = 22, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...stroke(color)} />
  </Svg>
);

export const ChatIcon = ({ size = 22, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" {...stroke(color)} />
  </Svg>
);

export const BoltIcon = ({ size = 22, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon points="13,2 3,14 12,14 11,22 21,10 12,10" {...stroke(color)} />
  </Svg>
);
