import { promises as fs } from 'fs';
import path from 'path';
import { GoogleDriveService, FileUploadOptions } from './google-drive.js';
import { GoogleDriveConfig } from './google-drive.js';

export interface OffloadRule {
  pattern: string;
  folderName: string;
  maxAge?: number; // in days
  maxSize?: number; // in MB
  enabled: boolean;
}

export interface OffloadResult {
  success: boolean;
  filesProcessed: number;
  filesOffloaded: number;
  totalSize: number;
  errors: string[];
}

export class FileOffloaderService {
  private driveService: GoogleDriveService;
  private rules: OffloadRule[] = [];

  constructor(driveConfig: GoogleDriveConfig) {
    this.driveService = new GoogleDriveService(driveConfig);

    // Default rules for common file types
    this.addDefaultRules();
  }

  /**
   * Add default offloading rules
   */
  private addDefaultRules(): void {
    this.rules = [
      {
        pattern: '**/*.log',
        folderName: 'WebOrchestrator-Logs',
        maxAge: 30, // 30 days
        maxSize: 100, // 100MB
        enabled: true,
      },
      {
        pattern: '**/screenshots/**/*.png',
        folderName: 'WebOrchestrator-Screenshots',
        maxAge: 7, // 7 days
        maxSize: 500, // 500MB
        enabled: true,
      },
      {
        pattern: '**/recordings/**/*.mp4',
        folderName: 'WebOrchestrator-Recordings',
        maxAge: 14, // 14 days
        maxSize: 1000, // 1GB
        enabled: true,
      },
      {
        pattern: '**/downloads/**/*',
        folderName: 'WebOrchestrator-Downloads',
        maxAge: 7, // 7 days
        maxSize: 2000, // 2GB
        enabled: true,
      },
      {
        pattern: '**/crawl-results/**/*.json',
        folderName: 'WebOrchestrator-Crawl-Data',
        maxAge: 30, // 30 days
        maxSize: 500, // 500MB
        enabled: true,
      },
      {
        pattern: '**/*.tmp',
        folderName: 'WebOrchestrator-Temp-Files',
        maxAge: 1, // 1 day
        maxSize: 100, // 100MB
        enabled: true,
      },
      {
        pattern: '**/cache/**/*',
        folderName: 'WebOrchestrator-Cache',
        maxAge: 14, // 14 days
        maxSize: 200, // 200MB
        enabled: true,
      },
    ];
  }

  /**
   * Add custom offloading rule
   */
  addRule(rule: OffloadRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove offloading rule
   */
  removeRule(pattern: string): void {
    this.rules = this.rules.filter(rule => rule.pattern !== pattern);
  }

  /**
   * Get all rules
   */
  getRules(): OffloadRule[] {
    return [...this.rules];
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(pattern: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.pattern === pattern);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Find files matching a pattern
   */
  private async findFiles(pattern: string, basePath: string = '/home/yogi/Orchestrator'): Promise<string[]> {
    try {
      const files: string[] = [];

      // Simple glob implementation for common patterns
      const normalizedPattern = pattern.replace(/\*\*/g, '*').replace(/\*/g, '([^/]+)');

      async function scanDirectory(dirPath: string): Promise<void> {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
              await scanDirectory(fullPath);
            } else if (entry.isFile()) {
              const relativePath = path.relative(basePath, fullPath);
              const regex = new RegExp(`^${normalizedPattern}$`);

              if (regex.test(relativePath) || this.matchesGlobPattern(relativePath, pattern)) {
                files.push(fullPath);
              }
            }
          }
        } catch (error) {
          // Skip directories we can't read
        }
      }

      await scanDirectory(basePath);
      return files;
    } catch (error) {
      console.error('Error finding files:', error);
      return [];
    }
  }

  /**
   * Simple glob pattern matching
   */
  private matchesGlobPattern(filePath: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/\./g, '\\.')
      .replace(/\//g, '\\/');

    return new RegExp(`^${regex}$`).test(filePath);
  }

  /**
   * Check if file should be offloaded based on age
   */
  private shouldOffloadByAge(filePath: string, maxAgeDays?: number): boolean {
    if (!maxAgeDays) return false;

    try {
      const stats = fs.statSync(filePath);
      const fileAge = Date.now() - stats.mtime.getTime();
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

      return fileAge > maxAge;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if file should be offloaded based on size
   */
  private shouldOffloadBySize(filePath: string, maxSizeMB?: number): boolean {
    if (!maxSizeMB) return false;

    try {
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      return fileSizeMB > maxSizeMB;
    } catch (error) {
      return false;
    }
  }

  /**
   * Offload files based on a specific rule
   */
  async offloadByRule(rule: OffloadRule, basePath: string = '/home/yogi/Orchestrator'): Promise<OffloadResult> {
    const result: OffloadResult = {
      success: true,
      filesProcessed: 0,
      filesOffloaded: 0,
      totalSize: 0,
      errors: [],
    };

    if (!rule.enabled) {
      return result;
    }

    try {
      const files = await this.findFiles(rule.pattern, basePath);
      result.filesProcessed = files.length;

      const filesToOffload: string[] = [];

      for (const filePath of files) {
        try {
          const stats = await fs.stat(filePath);
          const shouldOffloadByAge = this.shouldOffloadByAge(filePath, rule.maxAge);
          const shouldOffloadBySize = this.shouldOffloadBySize(filePath, rule.maxSize);

          if (shouldOffloadByAge || shouldOffloadBySize) {
            filesToOffload.push(filePath);
            result.totalSize += stats.size;
          }
        } catch (error) {
          result.errors.push(`Error checking file ${filePath}: ${error}`);
        }
      }

      if (filesToOffload.length > 0) {
        try {
          await this.driveService.uploadFiles(filesToOffload, rule.folderName);

          // Delete files after successful upload
          for (const filePath of filesToOffload) {
            try {
              await fs.unlink(filePath);
            } catch (error) {
              result.errors.push(`Error deleting file ${filePath}: ${error}`);
            }
          }

          result.filesOffloaded = filesToOffload.length;
        } catch (error) {
          result.success = false;
          result.errors.push(`Error uploading files to Drive: ${error}`);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Error processing rule ${rule.pattern}: ${error}`);
    }

    return result;
  }

  /**
   * Run all enabled offloading rules
   */
  async runOffloading(basePath: string = '/home/yogi/Orchestrator'): Promise<OffloadResult[]> {
    const results: OffloadResult[] = [];

    for (const rule of this.rules) {
      if (rule.enabled) {
        const result = await this.offloadByRule(rule, basePath);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Offload specific files
   */
  async offloadFiles(
    filePaths: string[],
    folderName: string,
    deleteAfterUpload: boolean = true
  ): Promise<OffloadResult> {
    const result: OffloadResult = {
      success: true,
      filesProcessed: filePaths.length,
      filesOffloaded: 0,
      totalSize: 0,
      errors: [],
    };

    try {
      // Calculate total size
      for (const filePath of filePaths) {
        try {
          const stats = await fs.stat(filePath);
          result.totalSize += stats.size;
        } catch (error) {
          result.errors.push(`Error getting file stats for ${filePath}: ${error}`);
        }
      }

      // Upload files
      const uploadedIds = await this.driveService.uploadFiles(filePaths, folderName);
      result.filesOffloaded = uploadedIds.length;

      // Delete files if requested
      if (deleteAfterUpload) {
        for (const filePath of filePaths) {
          try {
            await fs.unlink(filePath);
          } catch (error) {
            result.errors.push(`Error deleting file ${filePath}: ${error}`);
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Error offloading files: ${error}`);
    }

    return result;
  }

  /**
   * Get storage usage summary
   */
  async getStorageSummary(basePath: string = '/home/yogi/Orchestrator'): Promise<any> {
    try {
      const summary: any = {
        totalFiles: 0,
        totalSize: 0,
        byType: {},
        byAge: {
          '1day': 0,
          '7days': 0,
          '30days': 0,
          'older': 0,
        },
      };

      async function scanForSummary(dirPath: string): Promise<void> {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
              await scanForSummary(fullPath);
            } else if (entry.isFile()) {
              try {
                const stats = await fs.stat(fullPath);
                summary.totalFiles++;
                summary.totalSize += stats.size;

                const ext = path.extname(fullPath).toLowerCase() || 'no-extension';
                summary.byType[ext] = (summary.byType[ext] || 0) + stats.size;

                const age = Date.now() - stats.mtime.getTime();
                const ageDays = age / (24 * 60 * 60 * 1000);

                if (ageDays <= 1) summary.byAge['1day'] += stats.size;
                else if (ageDays <= 7) summary.byAge['7days'] += stats.size;
                else if (ageDays <= 30) summary.byAge['30days'] += stats.size;
                else summary.byAge['older'] += stats.size;
              } catch (error) {
                // Skip files we can't read
              }
            }
          }
        } catch (error) {
          // Skip directories we can't read
        }
      }

      await scanForSummary(basePath);
      return summary;
    } catch (error) {
      console.error('Error getting storage summary:', error);
      return null;
    }
  }
}

export default FileOffloaderService;

