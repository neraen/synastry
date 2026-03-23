/**
 * UI Components - Central export
 * Premium Glassmorphism Design System
 */

// === NEW DESIGN SYSTEM COMPONENTS ===
export { CelestialText } from './CelestialText';
export { GlassCard } from './GlassCard';
export { GoldButton } from './GoldButton';
export { GhostButton } from './GhostButton';
export { CelestialChip } from './CelestialChip';
export { SectionHeader } from './SectionHeader';
export { CosmicProgressRing } from './CosmicProgressRing';
export { TransitCard } from './TransitCard';
export { NavBar } from './NavBar';
export { AppHeader } from './AppHeader';
export { TabHeader } from './TabHeader';
export { FormattedText } from './FormattedText';

// === LEGACY COMPONENTS (to be migrated) ===

// Layout
export { Screen } from './Screen';

// Typography
export { AppText, AppHeading, ScoreText, TagText } from './Text';

// Inputs
export { AppInput, SearchInput } from './Input';
export { AppDatePicker, AppTimePicker } from './DatePicker';

// Interactive
export { CopyableText } from './CopyableText';

// Buttons
export { AppButton, IconButton } from './Button';
export { GradientButton, LinkButton, IconButton as GlassIconButton } from './GradientButton';

// Cards
export { AppCard, ScoreCard, SectionCard } from './Card';
// GlassCard exported from new design system above
// GradientGlassCard removed - use GlassCard with gradient prop or wrap with LinearGradient
export { HoroscopeCard } from './HoroscopeCard';
export { CompatibilityShareCard } from './CompatibilityShareCard';
export { CompatibilityShareButton } from './CompatibilityShareButton';

// Zodiac
export { ZodiacCircle, ZodiacPair, getZodiacSign, ZODIAC_DATA } from './ZodiacCircle';
export type { ZodiacSign } from './ZodiacCircle';

// Progress
export { ProgressBar, ScoreRow, CircularProgress } from './ProgressBar';

// Spacing
export {
    Spacer,
    SpacerXS,
    SpacerSM,
    SpacerMD,
    SpacerLG,
    SpacerXL,
    Spacer2XL,
    SectionSpacer,
} from './Spacer';

// Dividers
export { Divider } from './Divider';

// Legal
export { LegalScreen } from './LegalScreen';

// States
export {
    LoadingState,
    InlineLoading,
    EmptyState,
    ErrorState,
    LoadingOverlay,
} from './States';

// Legacy exports (for backward compatibility during migration)
export { default as TextField } from './TextField';
export { default as ButtonPrimary } from './ButtonPrimary';
export { default as ButtonOutline } from './ButtonOutline';
