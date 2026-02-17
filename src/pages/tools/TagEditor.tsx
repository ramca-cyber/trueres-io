import { useState, useEffect, useMemo } from 'react';
import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { getToolById } from '@/config/tool-registry';
import { useAudioFile } from '@/hooks/use-audio-file';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

const tool = getToolById('tag-editor')!;

const TagEditor = () => {
  const { loadFile, fileName, fileSize, headerInfo, metadata, file } = useAudioFile();

  // Fix memory leak: manage cover art object URL lifecycle
  const coverArtUrl = useMemo(() => {
    if (!metadata?.coverArt) return null;
    return URL.createObjectURL(metadata.coverArt);
  }, [metadata?.coverArt]);

  useEffect(() => {
    return () => {
      if (coverArtUrl) URL.revokeObjectURL(coverArtUrl);
    };
  }, [coverArtUrl]);

  if (!fileName) {
    return (
      <ToolPage tool={tool}>
        <FileDropZone accept=".mp3,.flac,.ogg,.m4a" onFileSelect={loadFile} label="Drop your audio file here" sublabel="MP3, FLAC, OGG, M4A" />
      </ToolPage>
    );
  }

  const tags = [
    { label: 'Title', value: metadata?.title },
    { label: 'Artist', value: metadata?.artist },
    { label: 'Album', value: metadata?.album },
    { label: 'Year', value: metadata?.year },
    { label: 'Genre', value: metadata?.genre },
    { label: 'Track', value: metadata?.trackNumber },
    { label: 'Comment', value: metadata?.comment },
  ].filter((t) => t.value);

  const additionalTags = metadata?.additionalTags
    ? Object.entries(metadata.additionalTags).map(([key, value]) => ({ label: key, value }))
    : [];

  const allTags = [...tags, ...additionalTags];

  return (
    <ToolPage tool={tool}>
      <div className="space-y-4">
        <FileInfoBar
          fileName={fileName} fileSize={fileSize}
          format={headerInfo?.format} duration={headerInfo?.duration}
          sampleRate={headerInfo?.sampleRate} bitDepth={headerInfo?.bitDepth}
          channels={headerInfo?.channels}
        />

        {file && <AudioPlayer src={file} label="Preview" />}

        {coverArtUrl && (
          <div className="flex justify-center">
            <img
              src={coverArtUrl}
              alt="Cover art"
              className="rounded-lg max-w-[200px] max-h-[200px] border border-border"
            />
          </div>
        )}

        {allTags.length > 0 ? (
          <div className="rounded-md border border-border">
            <Table>
              <TableBody>
                {allTags.map((tag, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium text-muted-foreground w-32">{tag.label}</TableCell>
                    <TableCell className="text-sm">{tag.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-muted-foreground text-sm">
            No metadata tags found in this file.
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Tags are displayed in read-only mode. Metadata editing is not yet supported.
        </p>
      </div>
    </ToolPage>
  );
};
export default TagEditor;
