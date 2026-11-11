/**
 * Ton Ciel — emblème de la constellation personnelle.
 *
 * Dans le ciel, la constellation s'étire sur une grande partie de la voûte : on
 * ne la voit jamais entière. L'emblème la montre d'un seul regard.
 */

import React, { useMemo } from 'react';
import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';

import { colors } from '@/theme';
import { emblemPoints } from './emblem-geometry';
import type { ConstellationNode } from './sky-model';

type Props = {
    nodes: ConstellationNode[];
    size: number;
};

export function ConstellationEmblem({ nodes, size }: Props) {
    const { points, path } = useMemo(() => {
        const pts = emblemPoints(nodes, size);
        const p = Skia.Path.Make();
        pts.forEach((pt, i) => (i === 0 ? p.moveTo(pt.x, pt.y) : p.lineTo(pt.x, pt.y)));
        return { points: pts, path: p };
    }, [nodes, size]);

    return (
        <Canvas style={{ width: size, height: size }}>
            <Path path={path} color={colors.sky.constellation} opacity={0.35} style="stroke" strokeWidth={5} strokeJoin="round">
                <BlurMask blur={6} style="normal" />
            </Path>
            <Path path={path} color={colors.sky.constellation} style="stroke" strokeWidth={1.6} strokeJoin="round" />
            {points.map((pt, i) => pt.node.kind === 'planet' ? (
                <Group key={i}>
                    <Circle cx={pt.x} cy={pt.y} r={9} color={pt.node.color} opacity={0.55}>
                        <BlurMask blur={7} style="normal" />
                    </Circle>
                    <Circle cx={pt.x} cy={pt.y} r={4} color={pt.node.color} />
                </Group>
            ) : (
                <Circle key={i} cx={pt.x} cy={pt.y} r={2.2} color={pt.node.color} />
            ))}
        </Canvas>
    );
}
