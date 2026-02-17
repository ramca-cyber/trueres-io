import { useState } from 'react';
import { getToolById } from '@/config/tool-registry';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { Button } from '@/components/ui/button';
import { ALL_MEDIA_ACCEPT } from '@/config/constants';
import { RotateCcw } from 'lucide-react';

const tool = getToolById('media-player')!;

const VIDEO_EXTS = ['mp4', 'webm', 'avi', 'mkv', 'mov'];

function isVideoFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (VIDEO_EXTS.includes(ext)) return true;
  if (file.type.startsWith('video/')) return true;
  return false;
}

export default function MediaPlayer() {
  const [file, setFile] = useState<File | null>(null);

  const handleReset = () => setFile(null);

  return (
    <ToolPage tool={tool}>
      {!file ? (
        <FileDropZone
          accept={ALL_MEDIA_ACCEPT}
          onFileSelect={setFile}
          label="Drop any audio or video file"
          sublabel="or click to browse — plays instantly in your browser"
        />
      ) : (
        <div className="space-y-4">
          <FileInfoBar fileName={file.name} fileSize={file.size} />

          {isVideoFile(file) ? (
            <VideoPlayer src={file} label="Now playing" />
          ) : (
            <AudioPlayer src={file} label="Now playing" />
          )}

          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Choose different file
          </Button>
        </div>
      )}
    </ToolPage>
  );
}
