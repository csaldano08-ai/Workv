export interface CheckResult {
  errors: string[];
  warnings?: string[];
}
export function checkConfig(appJson: unknown, packageJson: unknown, options: { release: boolean }): { errors: string[]; warnings: string[] };
export function checkSources(files: { path: string; content: string }[]): { errors: string[] };
export function checkStrings(files: { path: string; content: string }[], dictionary: Record<string, string>): { errors: string[] };
