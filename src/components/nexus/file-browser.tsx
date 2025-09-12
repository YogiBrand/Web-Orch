import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Folder,
  File,
  FileText,
  Image,
  Code,
  Database,
  Settings,
  ChevronRight,
  ChevronDown,
  Home,
  ArrowLeft,
  Plus,
  Search,
  Upload
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  children?: FileNode[];
  expanded?: boolean;
}

interface FileBrowserProps {
  onFileSelect?: (file: FileNode) => void;
  onDirectorySelect?: (directory: FileNode) => void;
  initialPath?: string;
}

export function FileBrowser({
  onFileSelect,
  onDirectorySelect,
  initialPath = '/home/yogi'
}: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock file system data
  useEffect(() => {
    setFileTree([
      {
        name: 'Orchestrator',
        path: '/home/yogi/Orchestrator',
        type: 'directory',
        expanded: true,
        children: [
          {
            name: 'client',
            path: '/home/yogi/Orchestrator/client',
            type: 'directory',
            children: [
              { name: 'src', path: '/home/yogi/Orchestrator/client/src', type: 'directory' },
              { name: 'public', path: '/home/yogi/Orchestrator/client/public', type: 'directory' },
              { name: 'package.json', path: '/home/yogi/Orchestrator/client/package.json', type: 'file' },
            ]
          },
          {
            name: 'apps',
            path: '/home/yogi/Orchestrator/apps',
            type: 'directory',
            children: [
              { name: 'api', path: '/home/yogi/Orchestrator/apps/api', type: 'directory' },
              { name: 'web', path: '/home/yogi/Orchestrator/apps/web', type: 'directory' },
            ]
          },
          { name: 'package.json', path: '/home/yogi/Orchestrator/package.json', type: 'file' },
          { name: 'README.md', path: '/home/yogi/Orchestrator/README.md', type: 'file' },
        ]
      },
      {
        name: 'Documents',
        path: '/home/yogi/Documents',
        type: 'directory',
        children: [
          { name: 'projects', path: '/home/yogi/Documents/projects', type: 'directory' },
          { name: 'notes.txt', path: '/home/yogi/Documents/notes.txt', type: 'file' },
        ]
      }
    ]);
  }, []);

  const getFileIcon = (fileName: string, type: 'file' | 'directory') => {
    if (type === 'directory') return Folder;

    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return Code;
      case 'json':
        return Settings;
      case 'md':
        return FileText;
      case 'jpg':
      case 'png':
      case 'gif':
        return Image;
      case 'sql':
        return Database;
      default:
        return File;
    }
  };

  const toggleDirectory = (node: FileNode) => {
    if (node.type === 'directory') {
      node.expanded = !node.expanded;
      setFileTree([...fileTree]);
      if (onDirectorySelect) {
        onDirectorySelect(node);
      }
    }
  };

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file' && onFileSelect) {
      onFileSelect(node);
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 py-1 px-2 hover:bg-muted rounded cursor-pointer ${
            level > 0 ? 'ml-4' : ''
          }`}
          onClick={() => node.type === 'directory' ? toggleDirectory(node) : handleFileClick(node)}
        >
          {node.type === 'directory' && (
            node.expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          )}
          {node.type === 'file' && <div className="w-4" />}

          {React.createElement(getFileIcon(node.name, node.type), {
            className: `h-4 w-4 ${node.type === 'directory' ? 'text-blue-500' : 'text-muted-foreground'}`
          })}

          <span className="text-sm flex-1">{node.name}</span>

          {node.type === 'file' && node.size && (
            <Badge variant="outline" className="text-xs">
              {(node.size / 1024).toFixed(1)} KB
            </Badge>
          )}
        </div>

        {node.type === 'directory' && node.expanded && node.children && (
          <div>
            {renderFileTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const filteredFiles = fileTree.filter(node =>
    node.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            File Browser
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New File
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="sm" variant="outline">
            <Home className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            {renderFileTree(filteredFiles)}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Current path: {currentPath}</span>
            <span>{fileTree.length} items</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


