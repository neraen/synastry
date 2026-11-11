/**
 * Ton Ciel — dessin du poster partageable (format story 9:16).
 *
 * Une seule fonction de dessin sert à l'aperçu à l'écran et à l'export en
 * 1080×1920 : ce qu'on voit est exactement ce qu'on partage.
 *
 * Le disque est une carte du ciel classique : zénith au centre, horizon sur le
 * bord, nord en haut et est à gauche (on regarde le ciel au-dessus de soi).
 */

import {
    BlurStyle, ClipOp, ImageFormat, PaintStyle, Skia, StrokeCap, StrokeJoin, TileMode,
    type SkCanvas, type SkFont, type SkPaint, type SkPicture, type SkTypeface,
} from '@shopify/react-native-skia';

import i18n from '@/i18n';
import { colors } from '@/theme';
import { emblemPoints } from './emblem-geometry';
import type { SkyModel } from './sky-model';

/** Dimensions de conception ; tout est mis à l'échelle à partir de là. */
export const POSTER_W = 360;
export const POSTER_H = 640;
export const EXPORT_W = 1080;

export type PosterFonts = { display: SkTypeface; body: SkTypeface };

export type PosterContent = {
    model: SkyModel;
    /** Nom de la constellation */
    title: string;
    /** « 14 mars 1994 · 21h30 · Toulouse » */
    subtitle: string;
};

const TINTS = [colors.sky.starBlue, colors.sky.starWhite, colors.sky.starWarm, colors.sky.starRed];

function fill(color: string, alpha = 1, blur = 0): SkPaint {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(color));
    p.setAlphaf(alpha);
    if (blur > 0) p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true));
    return p;
}

function stroke(color: string, width: number, alpha = 1, blur = 0): SkPaint {
    const p = fill(color, alpha, blur);
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(width);
    p.setStrokeCap(StrokeCap.Round);
    p.setStrokeJoin(StrokeJoin.Round);
    return p;
}

/** Police au rendu sous-pixel : sans cela, l'espacement des petites lettres est irrégulier. */
function makeFont(typeface: SkTypeface, size: number): SkFont {
    const font = Skia.Font(typeface, size);
    font.setSubpixel(true);
    font.setLinearMetrics(true);
    return font;
}

/** Largeur d'un texte (somme des glyphes : disponible sur mobile comme sur le web). */
function textWidth(font: SkFont, text: string): number {
    return font.getGlyphWidths(font.getGlyphIDs(text)).reduce((sum, w) => sum + w, 0);
}

function centeredText(canvas: SkCanvas, text: string, cx: number, y: number, font: SkFont, paint: SkPaint) {
    canvas.drawText(text, cx - textWidth(font, text) / 2, y, paint, font);
}

/** Réduit la taille d'une police jusqu'à ce que le texte tienne dans `maxWidth`. */
function fittedFont(typeface: SkTypeface, text: string, size: number, maxWidth: number): SkFont {
    let font = makeFont(typeface, size);
    const width = textWidth(font, text);
    if (width > maxWidth) font = makeFont(typeface, (size * maxWidth) / width);
    return font;
}

/** Dessine le poster sur `canvas`, à la largeur `width` (hauteur = 16/9 × largeur). */
export function drawPoster(canvas: SkCanvas, width: number, content: PosterContent, fonts: PosterFonts) {
    const u = width / POSTER_W; // 1 unité de conception en pixels
    const { model, title, subtitle } = content;

    // Fond
    const bg = Skia.Paint();
    bg.setShader(Skia.Shader.MakeLinearGradient(
        { x: 0, y: 0 }, { x: 0, y: POSTER_H * u },
        [colors.sky.zenith, colors.surfaceLowest, colors.surfaceContainer].map((c) => Skia.Color(c)),
        [0, 0.55, 1], TileMode.Clamp,
    ));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, POSTER_H * u), bg);

    // En-tête
    centeredText(canvas, i18n.t('sky.posterHeader'), width / 2, 52 * u,
        makeFont(fonts.body, 10.5 * u), fill(colors.onSurfaceMuted));

    // ── Carte du ciel ─────────────────────────────────────────────────────────
    const cx = width / 2;
    const cy = 238 * u;
    const R = 150 * u;

    canvas.drawCircle(cx, cy, R, stroke(colors.sky.horizon, 10 * u, 0.2, 10 * u));
    const disc = Skia.Paint();
    disc.setAntiAlias(true);
    disc.setShader(Skia.Shader.MakeRadialGradient(
        { x: cx, y: cy }, R,
        [colors.surfaceContainer, colors.sky.zenith].map((c) => Skia.Color(c)),
        [0, 1], TileMode.Clamp,
    ));
    canvas.drawCircle(cx, cy, R, disc);

    canvas.save();
    const clip = Skia.Path.Make();
    clip.addCircle(cx, cy, R);
    canvas.clipPath(clip, ClipOp.Intersect, true);

    const starPaints = TINTS.map((c) => fill(c));
    const glowPaints = TINTS.map((c) => fill(c, 1, 3 * u));
    const plot = (flat: number[], glow: boolean) => {
        for (let i = 0; i < flat.length; i += 6) {
            const z = flat[i + 2];
            if (z < 0) continue; // sous l'horizon : hors de la carte
            const px = cx - (R * flat[i]) / (1 + z);
            const py = cy - (R * flat[i + 1]) / (1 + z);
            const r = flat[i + 3] * 0.62 * u;
            const tint = flat[i + 4];
            if (glow) {
                glowPaints[tint].setAlphaf(0.35);
                canvas.drawCircle(px, py, r * 2.4, glowPaints[tint]);
                starPaints[tint].setAlphaf(1);
            } else {
                starPaints[tint].setAlphaf(flat[i + 5]);
            }
            canvas.drawCircle(px, py, r, starPaints[tint]);
        }
    };
    plot(model.faintFlat, false);
    plot(model.brightFlat, true);

    for (const p of model.planets) {
        const z = p.vec[2];
        if (z < 0) continue;
        const px = cx - (R * p.vec[0]) / (1 + z);
        const py = cy - (R * p.vec[1]) / (1 + z);
        canvas.drawCircle(px, py, 8 * u, fill(p.color, 0.55, 5 * u));
        canvas.drawCircle(px, py, 3.2 * u, fill(p.color));
    }
    canvas.restore();

    canvas.drawCircle(cx, cy, R, stroke(colors.sky.horizon, 1 * u, 0.45));
    const cardinal = makeFont(fonts.body, 9 * u);
    const muted = fill(colors.onSurfaceMuted);
    centeredText(canvas, 'N', cx, cy - R - 7 * u, cardinal, muted);
    centeredText(canvas, 'S', cx, cy + R + 14 * u, cardinal, muted);
    centeredText(canvas, 'E', cx - R - 10 * u, cy + 3 * u, cardinal, muted);
    centeredText(canvas, i18n.t('sky.west'), cx + R + 10 * u, cy + 3 * u, cardinal, muted);

    // ── Emblème de la constellation ───────────────────────────────────────────
    const size = 144 * u;
    const ox = cx - size / 2;
    const oy = 404 * u;
    const pts = emblemPoints(model.constellation, size, 14 * u);
    const path = Skia.Path.Make();
    pts.forEach((pt, i) => (i === 0 ? path.moveTo(ox + pt.x, oy + pt.y) : path.lineTo(ox + pt.x, oy + pt.y)));
    canvas.drawPath(path, stroke(colors.sky.constellation, 4 * u, 0.35, 4 * u));
    canvas.drawPath(path, stroke(colors.sky.constellation, 1.3 * u));
    for (const pt of pts) {
        if (pt.node.kind === 'planet') {
            canvas.drawCircle(ox + pt.x, oy + pt.y, 6 * u, fill(pt.node.color, 0.55, 4 * u));
            canvas.drawCircle(ox + pt.x, oy + pt.y, 2.8 * u, fill(pt.node.color));
        } else {
            canvas.drawCircle(ox + pt.x, oy + pt.y, 1.6 * u, fill(pt.node.color));
        }
    }

    // ── Textes ────────────────────────────────────────────────────────────────
    const maxText = width - 48 * u;
    centeredText(canvas, title, cx, 578 * u, fittedFont(fonts.display, title, 26 * u, maxText), fill(colors.onSurface));
    centeredText(canvas, subtitle, cx, 598 * u, fittedFont(fonts.body, subtitle, 11 * u, maxText), fill(colors.onSurfaceMuted));
    centeredText(canvas, 'Lunestia', cx, 624 * u, makeFont(fonts.display, 11 * u), fill(colors.primary));
}

/** Poster enregistré comme image vectorielle, pour l'aperçu à l'écran. */
export function posterPicture(width: number, content: PosterContent, fonts: PosterFonts): SkPicture {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, (width * POSTER_H) / POSTER_W));
    drawPoster(canvas, width, content, fonts);
    return recorder.finishRecordingAsPicture();
}

/** Poster en PNG 1080×1920, encodé en base64. Renvoie null si le rendu échoue. */
export function posterPngBase64(content: PosterContent, fonts: PosterFonts): string | null {
    const height = (EXPORT_W * POSTER_H) / POSTER_W;
    const surface = Skia.Surface.MakeOffscreen(EXPORT_W, height) ?? Skia.Surface.Make(EXPORT_W, height);
    if (!surface) return null;
    drawPoster(surface.getCanvas(), EXPORT_W, content, fonts);
    surface.flush();
    return surface.makeImageSnapshot().encodeToBase64(ImageFormat.PNG, 100);
}
