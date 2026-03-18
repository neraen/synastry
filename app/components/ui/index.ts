/**
 * UI Components - Central export
 */

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

// Cards
export { AppCard, ScoreCard, SectionCard } from './Card';
export { HoroscopeCard } from './HoroscopeCard';
export { CompatibilityShareCard } from './CompatibilityShareCard';
export { CompatibilityShareButton } from './CompatibilityShareButton';

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
// These will be removed after all screens are migrated
export { default as TextField } from './TextField';
export { default as ButtonPrimary } from './ButtonPrimary';
export { default as ButtonOutline } from './ButtonOutline';
