/**
 * Ton Ciel — voûte céleste interactive (Skia).
 *
 * Deux calques dessinés sur le thread UI :
 *  - étoiles faibles : redessinées seulement quand la caméra bouge ;
 *  - étoiles brillantes, horizon, planètes, constellation : animées (scintillement).
 * Gestes : glisser pour regarder autour de soi, pincer pour zoomer, toucher un astre.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurStyle, Canvas, PaintStyle, Picture, Skia, StrokeCap, useClock } from '@shopify/react-native-skia';
import Animated, {
    Easing, runOnJS, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue,
    withDecay, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useTranslation } from 'react-i18next';
import { colors, typography } from '@/theme';
import { projectVec, scaleFor, type Companion, type SkyModel, type Vec3 } from './sky-model';

const RAD2DEG = 180 / Math.PI;
const FOV_MIN = 45;
const FOV_MAX = 125;
const HIT_RADIUS = 34;
/** Atténuation du ciel sous l'horizon : visible, mais en retrait. */
const UNDERFOOT_DIM = 0.55;
/** Subdivisions d'un trait de constellation (arc de grand cercle). */
const ARC_STEPS = 12;
/** Cosinus de 4° : en dessous de cet écart, deux astres partagent leur étiquette. */
const CLOSE_COS = Math.cos((4 * Math.PI) / 180);
const EMPTY: number[] = [];

export type SkyCanvasHandle = {
    /** Tourne la caméra vers une direction (degrés). */
    lookAt: (azimuth: number, altitude: number, duration?: number) => void;
};

type Props = {
    model: SkyModel;
    width: number;
    height: number;
    /** Bit i à 1 = planète i trouvée */
    discoveredMask: number;
    /** Direction initiale du regard (degrés) */
    initialAzimuth?: number;
    initialAltitude?: number;
    /** Avancement du tracé de la constellation, 0 → 1 */
    reveal: SharedValue<number>;
    onTapPlanet: (index: number) => void;
    /** Ciel à deux : astres d'une autre personne superposés à cette voûte */
    companion?: Companion | null;
    /** Masque les noms d'astres (quand une carte recouvre le ciel) */
    hideLabels?: boolean;
};

function fillPaint(color: string, blur = 0) {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(color));
    if (blur > 0) p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true));
    return p;
}

function strokePaint(color: string, width: number, blur = 0) {
    const p = fillPaint(color, blur);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(width);
    p.setStrokeCap(StrokeCap.Round);
    return p;
}

export const SkyCanvas = forwardRef<SkyCanvasHandle, Props>(function SkyCanvas(
    { model, width, height, discoveredMask, initialAzimuth = 180, initialAltitude = 32, reveal, onTapPlanet, companion, hideLabels }, ref,
) {
    const cx = width / 2;
    const cy = height / 2;

    const az = useSharedValue(initialAzimuth);
    const alt = useSharedValue(initialAltitude);
    const fov = useSharedValue(95);
    const fovStart = useSharedValue(95);
    const mask = useSharedValue(discoveredMask);
    useEffect(() => { mask.value = discoveredMask; }, [discoveredMask, mask]);
    const clock = useClock();

    const paints = useMemo(() => {
        const tints = [colors.sky.starBlue, colors.sky.starWhite, colors.sky.starWarm, colors.sky.starRed];
        return {
            star: tints.map((c) => fillPaint(c)),
            starGlow: tints.map((c) => fillPaint(c, 5)),
            planet: model.planets.map((p) => fillPaint(p.color)),
            planetGlow: model.planets.map((p) => fillPaint(p.color, 12)),
            hidden: fillPaint(colors.sky.hidden, 9),
            horizon: strokePaint(colors.sky.horizon, 1.2),
            horizonGlow: strokePaint(colors.sky.horizon, 7, 8),
            line: strokePaint(colors.sky.constellation, 1.6),
            lineGlow: strokePaint(colors.sky.constellation, 5, 6),
            duoLine: strokePaint(colors.sky.companion, 1.4),
            duoLineGlow: strokePaint(colors.sky.companion, 5, 6),
            duoRing: strokePaint(colors.sky.companion, 1.8),
            duoGlow: fillPaint(colors.sky.companion, 10),
            meeting: fillPaint(colors.sky.constellation, 14),
        };
    }, [model]);

    const { t } = useTranslation();
    const { faintFlat, brightFlat, planetFlat, constellationFlat } = model;

    // Ciel à deux : tableaux à plat pour le worklet (vides en solo).
    const duoPlanetFlat = companion?.planetFlat ?? EMPTY;
    const duoLineFlat = companion?.constellationFlat ?? EMPTY;
    const meetingFlat = useMemo(() => {
        const flat: number[] = [];
        companion?.meetings.forEach((m) => {
            flat.push(
                (m.mine.vec[0] + m.theirs.vec[0]) / 2,
                (m.mine.vec[1] + m.theirs.vec[1]) / 2,
                (m.mine.vec[2] + m.theirs.vec[2]) / 2,
            );
        });
        return flat;
    }, [companion]);

    // Astres en conjonction serrée : on empile leurs noms au lieu de les superposer.
    const labelOffsets = useMemo(() => model.planets.map((p, i) => {
        let stacked = 0;
        for (let j = 0; j < i; j++) {
            const q = model.planets[j].vec;
            if (p.vec[0] * q[0] + p.vec[1] * q[1] + p.vec[2] * q[2] > CLOSE_COS) stacked++;
        }
        return 14 + stacked * 15;
    }), [model]);
    const bounds = useMemo(() => Skia.XYWHRect(0, 0, width, height), [width, height]);

    // ── Calque 1 : étoiles faibles ────────────────────────────────────────────
    const faintPicture = useDerivedValue(() => {
        const s = scaleFor(fov.value, width);
        const a = (alt.value * Math.PI) / 180;
        const zr = (az.value * Math.PI) / 180;
        const ca = Math.cos(a), sa = Math.sin(a), cz = Math.cos(zr), sz = Math.sin(zr);
        const zoom = Math.sqrt(95 / fov.value);

        const recorder = Skia.PictureRecorder();
        const canvas = recorder.beginRecording(bounds);
        for (let i = 0; i < faintFlat.length; i += 6) {
            const x = faintFlat[i], y = faintFlat[i + 1], z = faintFlat[i + 2];
            const depth = x * ca * sz + y * ca * cz + z * sa;
            if (depth < -0.35) continue;
            const k = s / (1 + depth);
            const px = cx + (x * cz - y * sz) * k;
            const py = cy - (-x * sa * sz - y * sa * cz + z * ca) * k;
            if (px < -4 || px > width + 4 || py < -4 || py > height + 4) continue;
            const paint = paints.star[faintFlat[i + 4]];
            // Sous l'horizon : le ciel « sous tes pieds », volontairement estompé.
            paint.setAlphaf(faintFlat[i + 5] * (z < 0 ? UNDERFOOT_DIM : 1));
            canvas.drawCircle(px, py, faintFlat[i + 3] * zoom, paint);
        }
        return recorder.finishRecordingAsPicture();
    });

    // ── Calque 2 : étoiles brillantes, horizon, constellation, planètes ───────
    const livePicture = useDerivedValue(() => {
        const t = clock.value / 1000;
        const s = scaleFor(fov.value, width);
        const a = (alt.value * Math.PI) / 180;
        const zr = (az.value * Math.PI) / 180;
        const ca = Math.cos(a), sa = Math.sin(a), cz = Math.cos(zr), sz = Math.sin(zr);
        const zoom = Math.sqrt(95 / fov.value);

        const recorder = Skia.PictureRecorder();
        const canvas = recorder.beginRecording(bounds);

        // Horizon : cercle de hauteur 0, tracé par petits segments visibles.
        let hx = 0, hy = 0, hOk = false;
        for (let d = 0; d <= 360; d += 4) {
            const r = (d * Math.PI) / 180;
            const x = Math.sin(r), y = Math.cos(r);
            const depth = x * ca * sz + y * ca * cz;
            const ok = depth > -0.3;
            const k = s / (1 + Math.max(depth, -0.9));
            const px = cx + (x * cz - y * sz) * k;
            const py = cy - (-x * sa * sz - y * sa * cz) * k;
            if (ok && hOk) {
                paints.horizonGlow.setAlphaf(0.16);
                canvas.drawLine(hx, hy, px, py, paints.horizonGlow);
                paints.horizon.setAlphaf(0.4);
                canvas.drawLine(hx, hy, px, py, paints.horizon);
            }
            hx = px; hy = py; hOk = ok;
        }

        // Étoiles brillantes, avec halo et scintillement.
        for (let i = 0; i < brightFlat.length; i += 6) {
            const x = brightFlat[i], y = brightFlat[i + 1], z = brightFlat[i + 2];
            const depth = x * ca * sz + y * ca * cz + z * sa;
            if (depth < -0.35) continue;
            const k = s / (1 + depth);
            const px = cx + (x * cz - y * sz) * k;
            const py = cy - (-x * sa * sz - y * sa * cz + z * ca) * k;
            if (px < -20 || px > width + 20 || py < -20 || py > height + 20) continue;
            const tint = brightFlat[i + 4];
            const twinkle = 0.82 + 0.18 * Math.sin(t * 1.7 + brightFlat[i + 5]);
            const dim = z < 0 ? UNDERFOOT_DIM : 1;
            const r = brightFlat[i + 3] * zoom;
            const glow = paints.starGlow[tint];
            glow.setAlphaf(0.32 * twinkle * dim);
            canvas.drawCircle(px, py, r * 2.6, glow);
            const core = paints.star[tint];
            core.setAlphaf(twinkle * dim);
            canvas.drawCircle(px, py, r, core);
        }

        // Constellation : se trace sommet après sommet, en arcs de grand cercle.
        const segments = constellationFlat.length / 3 - 1;
        const drawn = reveal.value * segments;
        if (drawn > 0) {
            paints.lineGlow.setAlphaf(0.28);
            paints.line.setAlphaf(0.9);
            for (let i = 0; i < segments && i < drawn; i++) {
                const j = i * 3;
                const x1 = constellationFlat[j], y1 = constellationFlat[j + 1], z1 = constellationFlat[j + 2];
                const dx = constellationFlat[j + 3] - x1, dy = constellationFlat[j + 4] - y1, dz = constellationFlat[j + 5] - z1;
                const part = Math.min(1, drawn - i);
                let ax = 0, ay = 0, aOk = false;
                for (let step = 0; step <= ARC_STEPS; step++) {
                    const f = Math.min(part, step / ARC_STEPS);
                    let x = x1 + dx * f, y = y1 + dy * f, z = z1 + dz * f;
                    const n = Math.sqrt(x * x + y * y + z * z) || 1;
                    x /= n; y /= n; z /= n;
                    const depth = x * ca * sz + y * ca * cz + z * sa;
                    const ok = depth > -0.2;
                    const k = s / (1 + Math.max(depth, -0.9));
                    const bx = cx + (x * cz - y * sz) * k;
                    const by = cy - (-x * sa * sz - y * sa * cz + z * ca) * k;
                    if (step > 0 && ok && aOk) {
                        canvas.drawLine(ax, ay, bx, by, paints.lineGlow);
                        canvas.drawLine(ax, ay, bx, by, paints.line);
                    }
                    ax = bx; ay = by; aOk = ok;
                    if (f >= part) break;
                }
            }
        }

        // Ciel à deux : la constellation de l'autre, ses astres en anneaux, les rencontres en halo.
        if (duoLineFlat.length > 0) {
            paints.duoLineGlow.setAlphaf(0.22);
            paints.duoLine.setAlphaf(0.75);
            const duoSegments = duoLineFlat.length / 3 - 1;
            for (let i = 0; i < duoSegments; i++) {
                const j = i * 3;
                const x1 = duoLineFlat[j], y1 = duoLineFlat[j + 1], z1 = duoLineFlat[j + 2];
                const dx = duoLineFlat[j + 3] - x1, dy = duoLineFlat[j + 4] - y1, dz = duoLineFlat[j + 5] - z1;
                let ax = 0, ay = 0, aOk = false;
                for (let step = 0; step <= ARC_STEPS; step++) {
                    const f = step / ARC_STEPS;
                    let x = x1 + dx * f, y = y1 + dy * f, z = z1 + dz * f;
                    const n = Math.sqrt(x * x + y * y + z * z) || 1;
                    x /= n; y /= n; z /= n;
                    const depth = x * ca * sz + y * ca * cz + z * sa;
                    const ok = depth > -0.2;
                    const k = s / (1 + Math.max(depth, -0.9));
                    const bx = cx + (x * cz - y * sz) * k;
                    const by = cy - (-x * sa * sz - y * sa * cz + z * ca) * k;
                    if (step > 0 && ok && aOk) {
                        canvas.drawLine(ax, ay, bx, by, paints.duoLineGlow);
                        canvas.drawLine(ax, ay, bx, by, paints.duoLine);
                    }
                    ax = bx; ay = by; aOk = ok;
                }
            }
        }
        for (let i = 0; i < meetingFlat.length; i += 3) {
            let x = meetingFlat[i], y = meetingFlat[i + 1], z = meetingFlat[i + 2];
            const n = Math.sqrt(x * x + y * y + z * z) || 1;
            x /= n; y /= n; z /= n;
            const depth = x * ca * sz + y * ca * cz + z * sa;
            if (depth < -0.35) continue;
            const k = s / (1 + depth);
            const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + i);
            paints.meeting.setAlphaf(0.22 + 0.2 * pulse);
            canvas.drawCircle(
                cx + (x * cz - y * sz) * k, cy - (-x * sa * sz - y * sa * cz + z * ca) * k,
                (24 + 8 * pulse) * zoom, paints.meeting,
            );
        }
        for (let i = 0; i < duoPlanetFlat.length; i += 3) {
            const x = duoPlanetFlat[i], y = duoPlanetFlat[i + 1], z = duoPlanetFlat[i + 2];
            const depth = x * ca * sz + y * ca * cz + z * sa;
            if (depth < -0.35) continue;
            const k = s / (1 + depth);
            const px = cx + (x * cz - y * sz) * k;
            const py = cy - (-x * sa * sz - y * sa * cz + z * ca) * k;
            paints.duoGlow.setAlphaf(0.4);
            canvas.drawCircle(px, py, 12 * zoom, paints.duoGlow);
            canvas.drawCircle(px, py, 6 * zoom, paints.duoRing);
        }

        // Planètes : cachées = lueur qui respire ; trouvées = astre coloré.
        for (let i = 0; i < planetFlat.length / 3; i++) {
            const x = planetFlat[i * 3], y = planetFlat[i * 3 + 1], z = planetFlat[i * 3 + 2];
            const depth = x * ca * sz + y * ca * cz + z * sa;
            if (depth < -0.35) continue;
            const k = s / (1 + depth);
            const px = cx + (x * cz - y * sz) * k;
            const py = cy - (-x * sa * sz - y * sa * cz + z * ca) * k;
            if ((mask.value >> i) & 1) {
                paints.planetGlow[i].setAlphaf(0.55);
                canvas.drawCircle(px, py, 15 * zoom, paints.planetGlow[i]);
                canvas.drawCircle(px, py, 5.2 * zoom, paints.planet[i]);
            } else {
                const breath = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.9);
                paints.hidden.setAlphaf(0.1 + 0.2 * breath);
                canvas.drawCircle(px, py, (9 + 5 * breath) * zoom, paints.hidden);
            }
        }

        return recorder.finishRecordingAsPicture();
    });

    // Pendant la révélation, la caméra suit la pointe du tracé.
    useAnimatedReaction(() => reveal.value, (r) => {
        if (r <= 0 || r >= 1) return;
        const segments = constellationFlat.length / 3 - 1;
        const pos = r * segments;
        const i = Math.min(segments - 1, Math.floor(pos));
        const f = pos - i;
        const j = i * 3;
        const x = constellationFlat[j] + (constellationFlat[j + 3] - constellationFlat[j]) * f;
        const y = constellationFlat[j + 1] + (constellationFlat[j + 4] - constellationFlat[j + 1]) * f;
        const z = constellationFlat[j + 2] + (constellationFlat[j + 5] - constellationFlat[j + 2]) * f;
        const n = Math.sqrt(x * x + y * y + z * z) || 1;
        const targetAz = Math.atan2(x, y) * RAD2DEG;
        const targetAlt = Math.max(-70, Math.min(70, Math.asin(z / n) * RAD2DEG));
        const delta = ((targetAz - az.value) % 360 + 540) % 360 - 180;
        az.set(az.value + delta * 0.07);
        alt.set(alt.value + (targetAlt - alt.value) * 0.07);
    });

    // ── Caméra ────────────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        lookAt: (azimuth, altitude, duration = 1400) => {
            // Chemin le plus court en azimut.
            const delta = ((azimuth - az.value) % 360 + 540) % 360 - 180;
            const easing = Easing.inOut(Easing.cubic);
            az.value = withTiming(az.value + delta, { duration, easing });
            alt.value = withTiming(Math.max(-80, Math.min(85, altitude)), { duration, easing });
        },
    }), [az, alt]);

    const handleTap = (x: number, y: number, azNow: number, altNow: number, fovNow: number) => {
        const s = scaleFor(fovNow, width);
        let best = -1;
        let bestDist = HIT_RADIUS;
        model.planets.forEach((p, i) => {
            const pt = projectVec(p.vec[0], p.vec[1], p.vec[2], azNow, altNow, s, cx, cy);
            if (pt.depth < -0.35) return;
            const d = Math.hypot(pt.x - x, pt.y - y);
            if (d < bestDist) { bestDist = d; best = i; }
        });
        if (best >= 0) onTapPlanet(best);
    };

    const pan = Gesture.Pan()
        .maxPointers(1)
        .onChange((e) => {
            const s = scaleFor(fov.value, width);
            const perPx = (2 / s) * RAD2DEG;
            const spread = Math.max(0.35, Math.cos((alt.value * Math.PI) / 180));
            az.set(az.value - (e.changeX * perPx) / spread);
            alt.set(Math.max(-80, Math.min(85, alt.value + e.changeY * perPx)));
        })
        .onEnd((e) => {
            const s = scaleFor(fov.value, width);
            const perPx = (2 / s) * RAD2DEG;
            az.set(withDecay({ velocity: -e.velocityX * perPx, deceleration: 0.994 }));
            alt.set(withDecay({ velocity: e.velocityY * perPx, deceleration: 0.994, clamp: [-80, 85] }));
        });
    const pinch = Gesture.Pinch()
        .onStart(() => { fovStart.set(fov.value); })
        .onChange((e) => {
            fov.set(Math.max(FOV_MIN, Math.min(FOV_MAX, fovStart.value / e.scale)));
        });
    const tap = Gesture.Tap().maxDistance(12).onEnd((e) => {
        runOnJS(handleTap)(e.x, e.y, az.value, alt.value, fov.value);
    });
    const gesture = Gesture.Simultaneous(pinch, Gesture.Race(pan, tap));

    return (
        <GestureDetector gesture={gesture}>
            <View style={{ width, height, overflow: 'hidden' }}>
                <Canvas style={StyleSheet.absoluteFill}>
                    <Picture picture={faintPicture} />
                    <Picture picture={livePicture} />
                </Canvas>
                {CARDINALS.map((c) => (
                    <SkyLabel key={c.label} text={c.label === 'O' ? t('sky.west') : c.label} vec={c.vec} az={az} alt={alt} fov={fov}
                        width={width} cx={cx} cy={cy} offsetY={10} muted />
                ))}
                {model.planets.map((p, i) => (!hideLabels && (discoveredMask >> i) & 1) ? (
                    <SkyLabel key={p.key} text={p.name} vec={p.vec} az={az} alt={alt} fov={fov}
                        width={width} cx={cx} cy={cy} offsetY={labelOffsets[i]} />
                ) : null)}
            </View>
        </GestureDetector>
    );
});

const CARDINALS: { label: string; vec: Vec3 }[] = [
    { label: 'N', vec: [0, 1, 0] },
    { label: 'E', vec: [1, 0, 0] },
    { label: 'S', vec: [0, -1, 0] },
    { label: 'O', vec: [-1, 0, 0] },
];

const LABEL_WIDTH = 96;

/** Étiquette texte accrochée à un point du ciel (suit la caméra). */
function SkyLabel({ text, vec, az, alt, fov, width, cx, cy, offsetY, muted }: {
    text: string; vec: Vec3;
    az: SharedValue<number>; alt: SharedValue<number>; fov: SharedValue<number>;
    width: number; cx: number; cy: number; offsetY: number; muted?: boolean;
}) {
    const [x, y, z] = vec;
    const style = useAnimatedStyle(() => {
        const p = projectVec(x, y, z, az.value, alt.value, scaleFor(fov.value, width), cx, cy);
        return {
            opacity: p.depth > -0.2 ? 1 : 0,
            transform: [{ translateX: p.x - LABEL_WIDTH / 2 }, { translateY: p.y + offsetY }],
        };
    });
    return (
        <Animated.Text pointerEvents="none" numberOfLines={1}
            style={[styles.label, muted ? styles.labelMuted : null, style]}>
            {text}
        </Animated.Text>
    );
}

const styles = StyleSheet.create({
    label: {
        ...typography.labelSm,
        position: 'absolute',
        left: 0,
        top: 0,
        width: LABEL_WIDTH,
        textAlign: 'center',
        color: colors.onSurface,
    },
    labelMuted: {
        color: colors.onSurfaceMuted,
    },
});
