import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

// Report output must stay inside the working tree: the repository root when the tool
// runs inside a checkout (found by walking up to the nearest .git), otherwise the
// current working directory. The reportDir CLI flag is untrusted input.
function findAllowedBaseDir(): string {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return process.cwd();
    current = parent;
  }
}

const ALLOWED_BASE_DIR = findAllowedBaseDir();

function resolveGuardedPath(...segments: string[]): string {
  const resolved = path.resolve(...segments);
  if (resolved !== ALLOWED_BASE_DIR && !resolved.startsWith(ALLOWED_BASE_DIR + path.sep)) {
    throw new Error(`Refusing to write outside "${ALLOWED_BASE_DIR}": "${resolved}"`);
  }
  return resolved;
}

export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';

export const IMPACT_LEVELS: ImpactLevel[] = ['critical', 'serious', 'moderate', 'minor'];

export interface ViolationNodeSummary {
  target: string;
  html: string;
  failureSummary?: string;
}

export interface ViolationSummary {
  id: string;
  impact: ImpactLevel;
  description: string;
  help: string;
  helpUrl: string;
  wcagTags: string[];
  nodeCount: number;
  nodes: ViolationNodeSummary[];
}

export interface ScreenResult {
  screen: string;
  url: string;
  error?: string;
  violations: ViolationSummary[];
  passCount: number;
  incompleteCount: number;
}

export interface AccessibilityReport {
  generatedAt: string;
  baseUrl: string;
  axeCoreVersion: string;
  tags: string[];
  viewport: { width: number; height: number };
  totals: Record<ImpactLevel, number> & { violations: number; screensWithErrors: number };
  screens: ScreenResult[];
}

export function countViolationsByImpact(screens: ScreenResult[]): Record<ImpactLevel, number> & { violations: number; screensWithErrors: number } {
  const totals = { critical: 0, serious: 0, moderate: 0, minor: 0, violations: 0, screensWithErrors: 0 };
  for (const screen of screens) {
    if (screen.error) {
      totals.screensWithErrors++;
      continue;
    }
    for (const violation of screen.violations) {
      totals[violation.impact] += violation.nodeCount;
      totals.violations += violation.nodeCount;
    }
  }
  return totals;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(resolveGuardedPath(dirPath), { recursive: true });
}

export async function writeJsonReport(report: AccessibilityReport, reportDir: string) {
  await ensureDir(reportDir);
  const filePath = resolveGuardedPath(reportDir, 'accessibility-report.json');
  await fs.writeFile(filePath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  console.log(`JSON report written: ${filePath}`);
}

function impactEmoji(impact: ImpactLevel): string {
  switch (impact) {
    case 'critical':
      return '🟥';
    case 'serious':
      return '🟧';
    case 'moderate':
      return '🟨';
    case 'minor':
      return '🟦';
  }
}

function escapeMarkdownTableCell(text: string): string {
  return text.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function generateMarkdownReport(report: AccessibilityReport): string {
  const lines: string[] = [];
  lines.push('# Accessibility Report');
  lines.push('');
  lines.push(`> Generated: ${report.generatedAt} | axe-core ${report.axeCoreVersion} | Rules: ${report.tags.join(', ')} | Viewport: ${report.viewport.width}x${report.viewport.height}`);
  lines.push(`> Base URL: ${report.baseUrl}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`Total violations (affected elements): **${report.totals.violations}** — 🟥 Critical: ${report.totals.critical}, 🟧 Serious: ${report.totals.serious}, 🟨 Moderate: ${report.totals.moderate}, 🟦 Minor: ${report.totals.minor}`);
  if (report.totals.screensWithErrors > 0) {
    lines.push('');
    lines.push(`⚠️ ${report.totals.screensWithErrors} screen(s) could not be analyzed (load error) — see details below.`);
  }
  lines.push('');
  lines.push('| Screen | 🟥 Critical | 🟧 Serious | 🟨 Moderate | 🟦 Minor | Total | Passes |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');

  const sortedScreens = [...report.screens].sort((a, b) => {
    const countTotal = (s: ScreenResult) => s.violations.reduce((sum, v) => sum + v.nodeCount, 0);
    return countTotal(b) - countTotal(a);
  });

  for (const screen of sortedScreens) {
    if (screen.error) {
      lines.push(`| ${escapeMarkdownTableCell(screen.screen)} | - | - | - | - | ⚠️ error | - |`);
      continue;
    }
    const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const violation of screen.violations) {
      byImpact[violation.impact] += violation.nodeCount;
    }
    const total = byImpact.critical + byImpact.serious + byImpact.moderate + byImpact.minor;
    lines.push(`| ${escapeMarkdownTableCell(screen.screen)} | ${byImpact.critical} | ${byImpact.serious} | ${byImpact.moderate} | ${byImpact.minor} | ${total} | ${screen.passCount} |`);
  }

  lines.push('');
  lines.push('## Most common rule violations');
  lines.push('');
  const ruleCounts = new Map<string, { impact: ImpactLevel; help: string; helpUrl: string; nodeCount: number; screenCount: number }>();
  for (const screen of report.screens) {
    for (const violation of screen.violations) {
      const existing = ruleCounts.get(violation.id);
      if (existing) {
        existing.nodeCount += violation.nodeCount;
        existing.screenCount += 1;
      } else {
        ruleCounts.set(violation.id, { impact: violation.impact, help: violation.help, helpUrl: violation.helpUrl, nodeCount: violation.nodeCount, screenCount: 1 });
      }
    }
  }
  const sortedRules = [...ruleCounts.entries()].sort((a, b) => b[1].nodeCount - a[1].nodeCount);
  if (sortedRules.length === 0) {
    lines.push('No violations found. 🎉');
  } else {
    lines.push('| Rule | Impact | Elements | Screens | Help |');
    lines.push('| --- | --- | ---: | ---: | --- |');
    for (const [ruleId, info] of sortedRules) {
      lines.push(`| \`${ruleId}\` | ${impactEmoji(info.impact)} ${info.impact} | ${info.nodeCount} | ${info.screenCount} | [${escapeMarkdownTableCell(info.help)}](${info.helpUrl}) |`);
    }
  }

  lines.push('');
  lines.push('## Details per screen');
  for (const screen of sortedScreens) {
    lines.push('');
    lines.push(`### ${screen.screen}`);
    lines.push('');
    lines.push(`URL: \`${screen.url}\``);
    if (screen.error) {
      lines.push('');
      lines.push(`⚠️ Could not analyze this screen: ${screen.error}`);
      continue;
    }
    if (screen.violations.length === 0) {
      lines.push('');
      lines.push('No violations found. 🎉');
      continue;
    }
    for (const impact of IMPACT_LEVELS) {
      const violationsForImpact = screen.violations.filter(v => v.impact === impact);
      for (const violation of violationsForImpact) {
        lines.push('');
        lines.push(`- ${impactEmoji(impact)} **${violation.id}** (${impact}) — ${violation.nodeCount} element(s)`);
        lines.push(`  - ${violation.help} ([docs](${violation.helpUrl}))`);
        for (const node of violation.nodes.slice(0, 3)) {
          lines.push(`  - \`${escapeMarkdownTableCell(node.target)}\``);
        }
        if (violation.nodeCount > 3) {
          lines.push(`  - … and ${violation.nodeCount - 3} more (see JSON report)`);
        }
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

export async function writeMarkdownReport(report: AccessibilityReport, reportDir: string) {
  await ensureDir(reportDir);
  const filePath = resolveGuardedPath(reportDir, 'accessibility-report.md');
  await fs.writeFile(filePath, generateMarkdownReport(report), 'utf-8');
  console.log(`Markdown report written: ${filePath}`);
}

function badgeColor(totals: AccessibilityReport['totals']): string {
  if (totals.critical > 0) return '#e05d44';
  if (totals.serious > 0) return '#fe7d37';
  if (totals.moderate > 0) return '#dfb317';
  if (totals.minor > 0) return '#a4a61d';
  return '#4c1';
}

export function generateBadgeSvg(report: AccessibilityReport): string {
  const label = 'accessibility';
  const value = `${report.totals.violations} violations`;
  const color = badgeColor(report.totals);
  // Approximate text widths (Verdana 11px averages ~6.5px per character) - the
  // same flat badge style shields.io uses, kept dependency-free on purpose.
  const labelWidth = Math.round(label.length * 6.5) + 12;
  const valueWidth = Math.round(value.length * 6.5) + 12;
  const totalWidth = labelWidth + valueWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>
`;
}

export async function writeBadge(report: AccessibilityReport, reportDir: string) {
  const badgeDir = resolveGuardedPath(reportDir, 'badges');
  await ensureDir(badgeDir);
  const filePath = resolveGuardedPath(badgeDir, 'accessibility.svg');
  await fs.writeFile(filePath, generateBadgeSvg(report), 'utf-8');
  console.log(`Badge written: ${filePath}`);
}
