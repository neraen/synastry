/**
 * Ton Ciel — la démonstration, variante web (aperçu de développement).
 * Skia doit charger son moteur WebAssembly avant tout import de composant Skia.
 *
 * La variante web vit ici et non dans `app/` : expo-router embarque tous les
 * fichiers de `app/` dans chaque bundle, et le moteur Skia du navigateur
 * (canvaskit) ne se compile pas sur Android ni iOS.
 */
import React from 'react';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

export default function SkyPrototypeRouteWeb() {
    return (
        <WithSkiaWeb
            opts={{ locateFile: (file: string) => `/${file}` }}
            getComponent={() => import('@/components/sky/SkyPrototype')}
        />
    );
}
