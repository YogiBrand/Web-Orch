import { google } from 'googleapis';
import { promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
}

export interface FileUploadOptions {
  folderId?: string;
  folderName?: string;
  mimeType?: string;
}

export class GoogleDriveService {
  private drive;
  private config: GoogleDriveConfig;

  constructor(config: GoogleDriveConfig) {
    this.config = config;

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    try {
      const fileMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw new Error(`Failed to create folder: ${name}`);
    }
  }

  /**
   * Find or create a folder by name
   */
  async findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    try {
      // First try to find existing folder
      const existingFolder = await this.findFolderByName(folderName, parentId);
      if (existingFolder) {
        return existingFolder;
      }

      // Create new folder if not found
      return await this.createFolder(folderName, parentId);
    } catch (error) {
      console.error('Error finding/creating folder:', error);
      throw error;
    }
  }

  /**
   * Find a folder by name
   */
  async findFolderByName(name: string, parentId?: string): Promise<string | null> {
    try {
      let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id!;
      }

      return null;
    } catch (error) {
      console.error('Error finding folder:', error);
      return null;
    }
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    filePath: string,
    fileName?: string,
    options: FileUploadOptions = {}
  ): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      const fileStream = await fs.readFile(filePath);

      const actualFileName = fileName || path.basename(filePath);

      let folderId = options.folderId;
      if (options.folderName && !folderId) {
        folderId = await this.findOrCreateFolder(options.folderName);
      }

      const fileMetadata: any = {
        name: actualFileName,
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const mimeType = options.mimeType || this.getMimeType(filePath);

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType,
          body: Readable.from(fileStream),
        },
        fields: 'id',
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${filePath}`);
    }
  }

  /**
   * Upload multiple files to Google Drive
   */
  async uploadFiles(
    filePaths: string[],
    folderName: string,
    options: Omit<FileUploadOptions, 'folderName'> = {}
  ): Promise<string[]> {
    try {
      const folderId = await this.findOrCreateFolder(folderName);
      const uploadPromises = filePaths.map(filePath =>
        this.uploadFile(filePath, undefined, { ...options, folderId })
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.update({
        fileId,
        requestBody: {
          trashed: true,
        },
      });
    } catch (error) {
      console.error('Error deleting file from Drive:', error);
      throw new Error(`Failed to delete file: ${fileId}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId?: string): Promise<any[]> {
    try {
      let query = 'trashed=false';
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
        orderBy: 'createdTime desc',
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<any> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink',
      });

      return response.data;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      '.txt': 'text/plain',
      '.log': 'text/plain',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
      '.php': 'application/x-php',
      '.rb': 'text/x-ruby',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.sh': 'application/x-shellscript',
      '.bat': 'application/x-bat',
      '.md': 'text/markdown',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.7z': 'application/x-7z-compressed',
      '.rar': 'application/x-rar-compressed',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export default GoogleDriveService;

