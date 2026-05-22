export type TagIcon = 'sparkle' | 'bolt' | 'heart' | 'anchor' | 'pulse' | 'chat';

export interface CompatibilityTag {
    icon: TagIcon;
    label: string;
}

export interface CompatibilityItem {
    planet: string;
    badge: string;
    title: string;
    summary: string;
    detail: string;
    tags: CompatibilityTag[];
}

export interface CompatibilityDimension {
    id: string;
    name: string;
    value: number;
    detail: string;
}

export interface CompatibilityAnalyse {
    headline: string;
    summary: string[];
    long_text: string[];
}

export interface CompatibilityAspectCle {
    planet_a: string;
    planet_b: string;
    name: string;
    desc: string;
}

export interface CompatibilityAnalysisV2 {
    tagline: string;
    analyse: CompatibilityAnalyse;
    dimensions: Record<string, { detail: string }>;
    forces: CompatibilityItem[];
    vigilance: CompatibilityItem[];
    aspect_cle: CompatibilityAspectCle;
    conseil: { title: string; text: string };
}

export interface CompatibilityScoreV2 {
    score_global: number;
    dimensions: Record<string, number>;
}

/** Fully assembled v2 data ready for display */
export interface CompatibilityV2Data {
    userName: string;
    userInitial: string;
    partnerName: string;
    partnerInitial: string;
    score: number;
    tagline: string;
    dimensions: CompatibilityDimension[];
    analyse: CompatibilityAnalyse;
    forces: CompatibilityItem[];
    vigilance: CompatibilityItem[];
    aspect_cle: CompatibilityAspectCle;
    conseil: { title: string; text: string };
}
