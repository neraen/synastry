import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * RN 0.85+ peut renvoyer 'unspecified' : on le ramène à null pour que
 * `useColorScheme() ?? 'light'` reste exploitable comme clé light/dark.
 */
export function useColorScheme(): 'light' | 'dark' | null {
  const colorScheme = useRNColorScheme();
  return colorScheme === 'light' || colorScheme === 'dark' ? colorScheme : null;
}
