#!/usr/bin/env bun
/**
 * Console.log Cleanup Script
 * 
 * Automatically replaces console.log/error/warn with proper logger statements
 * across the entire codebase.
 * 
 * Usage:
 *   bun run scripts/cleanup-console-logs.ts
 *   bun run scripts/cleanup-console-logs.ts --dry-run
 *   bun run scripts/cleanup-console-logs.ts --path src/app/api
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface Stats {
  filesProcessed: number;
  filesModified: number;
  consolesReplaced: number;
  skippedGuarded: number;
  errors: string[];
}

const stats: Stats = {
  filesProcessed: 0,
  filesModified: 0,
  consolesReplaced: 0,
  skippedGuarded: 0,
  errors: [],
};

const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_PATH = process.argv.find(arg => arg.startsWith('--path='))?.split('=')[1] || 'src';

// Files/patterns to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.test\./,
  /\.spec\./,
];

// Patterns that should be kept (NODE_ENV guarded)
const KEEP_PATTERNS = [
  /if\s*\(\s*process\.env\.NODE_ENV\s*[!=]=\s*["']production["']\s*\)/,
  /process\.env\.NODE_ENV\s*[!=]==?\s*["']development["']\s*\?\s*console/,
];

function shouldSkipFile(filePath: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

function isGuardedConsole(line: string, lines: string[], lineIndex: number): boolean {
  // Check current line and few lines before for guards
  const contextLines = lines.slice(Math.max(0, lineIndex - 3), lineIndex + 1).join('\n');
  return KEEP_PATTERNS.some(pattern => pattern.test(contextLines));
}

function extractLogContent(line: string): { type: string; content: string; indent: string } | null {
  const match = line.match(/^(\s*)console\.(log|error|warn|info|debug)\((.*)\);?\s*$/);
  if (!match) return null;
  
  const [, indent, type, content] = match;
  return { type, content, indent };
}

function generateLoggerCall(type: string, content: string, indent: string, filePath: string): string {
  // Determine if this is an API route, action, or component
  const isApi = filePath.includes('/api/');
  const isAction = filePath.includes('/actions/');
  
  // Parse the content to extract message and context
  let message = 'Operation log';
  let hasError = false;
  let contextVars: string[] = [];
  
  // Try to extract meaningful message from content
  if (content.includes('[') && content.includes(']')) {
    // Pattern: console.log("[API_ROUTE]", error)
    const tagMatch = content.match(/["']?\[([^\]]+)\]["']?/);
    if (tagMatch) {
      message = tagMatch[1].toLowerCase().replace(/_/g, ' ');
    }
  } else if (content.startsWith('"') || content.startsWith("'")) {
    // Pattern: console.log("Some message", data)
    const msgMatch = content.match(/^["']([^"']+)["']/);
    if (msgMatch) {
      message = msgMatch[1];
    }
  }
  
  // Check if error is logged
  if (content.includes('error') || content.includes('Error')) {
    hasError = true;
  }
  
  // Determine log level
  const logLevel = type === 'error' ? 'error' : 
                   type === 'warn' ? 'warn' : 
                   'info';
  
  // Build metadata
  const metadata: string[] = [];
  
  if (hasError && content.match(/\berror\b/i)) {
    metadata.push('error: error instanceof Error ? error.message : String(error)');
  }
  
  // Build tags
  const tags: string[] = [];
  if (isApi) tags.push('api');
  if (isAction) tags.push('action');
  if (type === 'error') tags.push('error');
  
  // Generate logger call
  let loggerCall = `${indent}logger.${logLevel}("${message}"`;
  
  if (metadata.length > 0 || tags.length > 0) {
    loggerCall += ', {\n';
    if (metadata.length > 0) {
      loggerCall += `${indent}\tmetadata: {\n`;
      metadata.forEach(meta => {
        loggerCall += `${indent}\t\t${meta},\n`;
      });
      loggerCall += `${indent}\t},\n`;
    }
    if (tags.length > 0) {
      loggerCall += `${indent}\ttags: [${tags.map(t => `"${t}"`).join(', ')}],\n`;
    }
    loggerCall += `${indent}}`;
  }
  
  loggerCall += ');';
  
  return loggerCall;
}

function hasLoggerImport(content: string): boolean {
  return /import\s+logger\s+from\s+["']@\/lib\/logger["'];?/.test(content);
}

function addLoggerImport(content: string): string {
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    } else if (lines[i].trim() && !lines[i].trim().startsWith('//') && lastImportIndex >= 0) {
      break;
    }
  }
  
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, 'import logger from "@/lib/logger";');
  } else {
    // No imports found, add at the top
    lines.unshift('import logger from "@/lib/logger";');
  }
  
  return lines.join('\n');
}

function processFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let modified = false;
    let needsLoggerImport = false;
    let replacementCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip commented lines
      if (line.trim().startsWith('//')) continue;
      if (line.trim().startsWith('/*')) continue;
      if (line.trim().startsWith('*')) continue;
      
      // Check if this is a console statement
      if (/^\s*console\.(log|error|warn|info|debug)\(/.test(line)) {
        // Check if it's guarded
        if (isGuardedConsole(line, lines, i)) {
          stats.skippedGuarded++;
          continue;
        }
        
        // Extract and replace
        const extracted = extractLogContent(line);
        if (extracted) {
          const replacement = generateLoggerCall(
            extracted.type,
            extracted.content,
            extracted.indent,
            filePath
          );
          
          lines[i] = replacement;
          modified = true;
          needsLoggerImport = true;
          replacementCount++;
        }
      }
    }
    
    if (modified) {
      let newContent = lines.join('\n');
      
      // Add logger import if needed
      if (needsLoggerImport && !hasLoggerImport(newContent)) {
        newContent = addLoggerImport(newContent);
      }
      
      if (!DRY_RUN) {
        writeFileSync(filePath, newContent, 'utf-8');
      }
      
      stats.filesModified++;
      stats.consolesReplaced += replacementCount;
      
      const relPath = relative(process.cwd(), filePath);
      console.log(`✅ ${relPath} (${replacementCount} replacements)`);
      
      return true;
    }
    
    return false;
  } catch (error) {
    const relPath = relative(process.cwd(), filePath);
    const errorMsg = `❌ ${relPath}: ${error}`;
    stats.errors.push(errorMsg);
    console.error(errorMsg);
    return false;
  }
}

function processDirectory(dirPath: string): void {
  try {
    const entries = readdirSync(dirPath);
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      
      if (shouldSkipFile(fullPath)) continue;
      
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry)) {
        stats.filesProcessed++;
        processFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
  }
}

// Main execution
console.log('🚀 Console.log Cleanup Script');
console.log('==============================\n');
console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '✏️  WRITE MODE'}`);
console.log(`Target: ${TARGET_PATH}\n`);

const startTime = Date.now();
processDirectory(TARGET_PATH);
const duration = Date.now() - startTime;

// Print summary
console.log('\n📊 Summary');
console.log('==========');
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`Files modified: ${stats.filesModified}`);
console.log(`Console statements replaced: ${stats.consolesReplaced}`);
console.log(`NODE_ENV guarded (kept): ${stats.skippedGuarded}`);
console.log(`Errors: ${stats.errors.length}`);
console.log(`Duration: ${duration}ms`);

if (DRY_RUN) {
  console.log('\n💡 This was a dry run. Re-run without --dry-run to apply changes.');
}

if (stats.errors.length > 0) {
  console.log('\n❌ Errors encountered:');
  stats.errors.forEach(err => console.log(`  ${err}`));
  process.exit(1);
}

process.exit(0);

