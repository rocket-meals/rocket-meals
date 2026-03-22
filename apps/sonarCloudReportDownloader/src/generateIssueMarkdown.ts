import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execSync } from 'child_process';
import { IssueData } from './IssueData';

type CsvIssue = IssueData;

interface PrioritizedIssue extends CsvIssue {
  category: string;
  priority: number;
  fileUrl: string;
}

interface GroupedIssue {
  message: string;
  category: string;
  priority: number;
  occurrences: { component: string; line: number | undefined; fileUrl: string }[];
}

// Priority order: SECURITY (highest) > RELIABILITY > MAINTAINABILITY (lowest)
const CATEGORY_PRIORITY: Record<string, number> = {
  security: 0,
  reliability: 1,
  maintainability: 2,
};

const CATEGORY_EMOJI: Record<string, string> = {
  security: '🔒',
  reliability: '🐛',
  maintainability: '🔧',
};

const GITHUB_ISSUE_CHAR_LIMIT = 65000;
const DEFAULT_MAX_ISSUES = 50;

function getRepoRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.warn('Could not determine git repository root. Using current directory.', error);
    return process.cwd();
  }
}

const repoRoot = getRepoRoot();

const argv = yargs(hideBin(process.argv))
  .scriptName('sonar-issue')
  .usage('$0 [args]')
  .option('input-dir', {
    alias: 'i',
    type: 'string',
    default: path.join(repoRoot, 'reports', 'sonarCloud'),
    describe: 'Directory containing SonarCloud CSV reports',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    default: path.join(repoRoot, 'reports', 'sonarCloud', 'issue.md'),
    describe: 'Output path for generated markdown file',
  })
  .option('max-issues', {
    alias: 'm',
    type: 'number',
    default: DEFAULT_MAX_ISSUES,
    describe: 'Maximum number of issues to include in the report',
  })
  .option('repo-url', {
    alias: 'r',
    type: 'string',
    default: 'https://github.com/rocket-meals/rocket-meals',
    describe: 'GitHub repository URL for generating file links',
  })
  .option('branch', {
    alias: 'b',
    type: 'string',
    default: 'master',
    describe: 'Branch name for file links',
  })
  .help()
  .alias('h', 'help').argv as any;

/**
 * Parse a CSV line handling quoted fields with commas and escaped quotes.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Safely parse a line number string, returning undefined for invalid values.
 */
function parseLineNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return !Number.isNaN(parsed) ? parsed : undefined;
}

/**
 * Read and parse a SonarCloud CSV report file.
 */
function readCsvReport(filePath: string): CsvIssue[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`Report file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length <= 1) {
    return [];
  }

  // Skip header line
  return lines.slice(1).map(line => {
    const fields = parseCsvLine(line);
    return {
      key: fields[0] || '',
      message: fields[1] || '',
      component: fields[2] || '',
      line: parseLineNumber(fields[3]),
    };
  }).filter(issue => issue.key.length > 0);
}

/**
 * Convert a SonarCloud component path to a GitHub file URL.
 * Input:  "rocket-meals_rocket-meals:apps/frontend/app/components/MyMap/index.tsx"
 * Output: "https://github.com/rocket-meals/rocket-meals/blob/main/apps/frontend/app/components/MyMap/index.tsx#L12"
 */
function componentToFileUrl(component: string, line: number | undefined, repoUrl: string, branch: string): string {
  // Strip project key prefix (everything before and including the first colon)
  const colonIndex = component.indexOf(':');
  const filePath = colonIndex >= 0 ? component.substring(colonIndex + 1) : component;

  let url = `${repoUrl}/blob/${branch}/${filePath}`;
  if (line !== undefined && !Number.isNaN(line)) {
    url += `#L${line}`;
  }
  return url;
}

/**
 * Collect all issues from CSV reports with prioritization.
 */
function collectAndPrioritizeIssues(inputDir: string, repoUrl: string, branch: string): PrioritizedIssue[] {
  const allIssues: PrioritizedIssue[] = [];

  const reportFiles: { category: string; fileName: string }[] = [
    { category: 'security', fileName: 'report_security.csv' },
    { category: 'reliability', fileName: 'report_reliability.csv' },
    { category: 'maintainability', fileName: 'report_maintainability.csv' },
  ];

  for (const { category, fileName } of reportFiles) {
    const filePath = path.join(inputDir, fileName);
    const issues = readCsvReport(filePath);

    for (const issue of issues) {
      allIssues.push({
        ...issue,
        category,
        priority: CATEGORY_PRIORITY[category],
        fileUrl: componentToFileUrl(issue.component, issue.line, repoUrl, branch),
      });
    }
  }

  // Sort by priority (security first), then by component path for grouping
  allIssues.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.component.localeCompare(b.component);
  });

  return allIssues;
}

/**
 * Extract a short file path from the full component path for display.
 */
function getShortPath(component: string): string {
  const colonIndex = component.indexOf(':');
  return colonIndex >= 0 ? component.substring(colonIndex + 1) : component;
}

/**
 * Group a flat list of prioritized issues by (category, message).
 * Only the first `maxIssues` individual issues are considered.
 */
function groupIssues(allIssues: PrioritizedIssue[], maxIssues: number): GroupedIssue[] {
  const limitedIssues = allIssues.slice(0, maxIssues);

  // Preserve category → message insertion order
  const categoryMessageMap = new Map<string, Map<string, GroupedIssue>>();

  for (const issue of limitedIssues) {
    let messageMap = categoryMessageMap.get(issue.category);
    if (!messageMap) {
      messageMap = new Map();
      categoryMessageMap.set(issue.category, messageMap);
    }

    let group = messageMap.get(issue.message);
    if (!group) {
      group = {
        message: issue.message,
        category: issue.category,
        priority: issue.priority,
        occurrences: [],
      };
      messageMap.set(issue.message, group);
    }
    group.occurrences.push({
      component: issue.component,
      line: issue.line,
      fileUrl: issue.fileUrl,
    });
  }

  const groups: GroupedIssue[] = [];
  for (const messageMap of categoryMessageMap.values()) {
    for (const group of messageMap.values()) {
      groups.push(group);
    }
  }
  return groups;
}

/**
 * Generate the markdown content for the GitHub issue.
 */
function generateMarkdown(allIssues: PrioritizedIssue[], maxIssues: number): string {
  const totalIssues = allIssues.length;

  // Count issues per category (from all issues)
  const categoryCounts: Record<string, number> = {};
  for (const issue of allIssues) {
    categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
  }

  // Count issues per category (from limited issues)
  const limitedIssues = allIssues.slice(0, maxIssues);
  const limitedCategoryCounts: Record<string, number> = {};
  for (const issue of limitedIssues) {
    limitedCategoryCounts[issue.category] = (limitedCategoryCounts[issue.category] || 0) + 1;
  }

  const groupedIssues = groupIssues(allIssues, maxIssues);

  let md = '';

  // Header
  md += `# 📊 SonarCloud Issues Report\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `| Category | Total Issues | Shown | Groups |\n`;
  md += `|----------|-------------|-------|--------|\n`;

  for (const category of ['security', 'reliability', 'maintainability']) {
    const emoji = CATEGORY_EMOJI[category];
    const total = categoryCounts[category] || 0;
    const shown = limitedCategoryCounts[category] || 0;
    const groups = groupedIssues.filter(g => g.category === category).length;
    md += `| ${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} | ${total} | ${shown} | ${groups} |\n`;
  }

  md += `\n**Total issues:** ${totalIssues}`;
  if (totalIssues > maxIssues) {
    md += ` (showing top ${maxIssues} prioritized by: Security > Reliability > Maintainability)`;
  }
  md += `\n\n`;

  md += `---\n\n`;

  // Render grouped issues per category
  let currentCategory = '';

  for (const group of groupedIssues) {
    // Category header
    if (group.category !== currentCategory) {
      currentCategory = group.category;
      const emoji = CATEGORY_EMOJI[currentCategory];
      const categoryTitle = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
      const categoryTotal = categoryCounts[currentCategory] || 0;
      const categoryShown = limitedCategoryCounts[currentCategory] || 0;
      const categoryGroups = groupedIssues.filter(g => g.category === currentCategory).length;
      md += `## ${emoji} ${categoryTitle} (${categoryShown}/${categoryTotal} issues, ${categoryGroups} groups)\n\n`;
    }

    const count = group.occurrences.length;

    if (count === 1) {
      // Single occurrence – keep the original compact display
      const occ = group.occurrences[0];
      const shortPath = getShortPath(occ.component);
      md += `- **${group.message}**\n`;
      md += `  ${shortPath}`;
      if (occ.line !== undefined && !Number.isNaN(occ.line)) {
        md += `:${occ.line}`;
      }
      md += `\n`;
      md += `  ${occ.fileUrl}\n\n`;
    } else {
      // Multiple occurrences – group under a collapsible details block
      md += `- **${group.message}** _(${count} occurrences)_\n\n`;
      md += `  <details>\n`;
      md += `  <summary>Show ${count} locations</summary>\n\n`;
      for (const occ of group.occurrences) {
        const shortPath = getShortPath(occ.component);
        md += `  - ${shortPath}`;
        if (occ.line !== undefined && !Number.isNaN(occ.line)) {
          md += `:${occ.line}`;
        }
        md += ` — ${occ.fileUrl}\n`;
      }
      md += `\n  </details>\n\n`;
    }
  }

  return md;
}

/**
 * Truncate markdown to fit within the GitHub issue character limit.
 */
function truncateMarkdown(md: string, charLimit: number): string {
  if (md.length <= charLimit) {
    return md;
  }

  const truncationNote = `\n\n---\n\n> ⚠️ **Note:** This report was truncated to fit within the ${charLimit.toLocaleString()} character limit. Review the full CSV reports in \`reports/sonarCloud/\` for all issues or reduce \`--max-issues\` to shorten the report.\n`;

  const availableLength = charLimit - truncationNote.length;
  // Cut at the last complete issue entry (look for the last double newline)
  const truncated = md.substring(0, availableLength);
  const lastDoubleNewline = truncated.lastIndexOf('\n\n');

  if (lastDoubleNewline > 0) {
    return truncated.substring(0, lastDoubleNewline) + truncationNote;
  }

  return truncated + truncationNote;
}

async function main() {
  const inputDir = path.resolve(argv['input-dir']);
  const outputPath = path.resolve(argv['output']);
  const maxIssues: number = argv['max-issues'];
  const repoUrl: string = argv['repo-url'];
  const branch: string = argv['branch'];

  console.log(`Reading SonarCloud reports from: ${inputDir}`);
  console.log(`Max issues: ${maxIssues}`);
  console.log(`Repository URL: ${repoUrl}`);
  console.log(`Branch: ${branch}`);

  const allIssues = collectAndPrioritizeIssues(inputDir, repoUrl, branch);
  console.log(`Found ${allIssues.length} total issues across all categories`);

  if (allIssues.length === 0) {
    console.log('No issues found. Skipping markdown generation.');
    return;
  }

  let markdown = generateMarkdown(allIssues, maxIssues);
  markdown = truncateMarkdown(markdown, GITHUB_ISSUE_CHAR_LIMIT);

  console.log(`Generated markdown: ${markdown.length} characters`);

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  console.log(`✅ Issue markdown saved to ${outputPath}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
