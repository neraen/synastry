/**
 * Ton Ciel — la démonstration (iOS et Android).
 *
 * La variante web vit ici et non dans `app/` : expo-router embarque tous les
 * fichiers de `app/` dans chaque bundle, et le moteur Skia du navigateur
 * (canvaskit) ne se compile pas sur Android ni iOS.
 */
export { default } from '@/components/sky/SkyPrototype';
