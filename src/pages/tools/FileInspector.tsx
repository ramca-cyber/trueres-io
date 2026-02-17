import { ToolPage } from '@/components/shared/ToolPage';
import { Button } from '@/components/ui/button';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { FileInfoBar } from '@/components/shared/FileInfoBar';
import { getToolById } from '@/config/tool-registry';
import { ALL_MEDIA_ACCEPT, FORMAT_NAMES, formatFileSize, formatDuration } from '@/config/constants';
import { useAudioFile } from '@/hooks/use-audio-file';
import { useAudioStore } from '@/stores/audio-store';

const tool = getToolById('file-inspector')!;

const FileInspector = () => {
  const { loadFile, fileName, fileSize, headerInfo, metadata, file } = useAudioFile();

  return (
    <ToolPage tool={tool}>
      {!fileName && (
        <FileDropZone accept={ALL_MEDIA_ACCEPT} onFileSelect={loadFile} label="Drop your audio file here" sublabel="Any audio format" />
      )}

      {fileName && (
        <div className="space-y-4">
          <FileInfoBar fileName={fileName} fileSize={fileSize} format={headerInfo?.format} duration={headerInfo?.duration} sampleRate={headerInfo?.sampleRate} bitDepth={headerInfo?.bitDepth} channels={headerInfo?.channels} />
          {file && <AudioPlayer src={file} label="Preview" />}

          {/* Format details */}
          {headerInfo && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <h3 className="px-4 py-2 text-sm font-heading font-semibold border-b border-border bg-secondary/50">Format Details</h3>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['Format', FORMAT_NAMES[headerInfo.format] || headerInfo.format.toUpperCase()],
                    ['Codec', headerInfo.codec || '—'],
                    ['Sample Rate', headerInfo.sampleRate ? `${headerInfo.sampleRate} Hz (${(headerInfo.sampleRate / 1000).toFixed(1)} kHz)` : '—'],
                    ['Bit Depth', headerInfo.bitDepth ? `${headerInfo.bitDepth}-bit` : '—'],
                    ['Channels', headerInfo.channels ? `${headerInfo.channels} (${headerInfo.channels === 1 ? 'Mono' : headerInfo.channels === 2 ? 'Stereo' : `${headerInfo.channels}ch`})` : '—'],
                    ['Duration', headerInfo.duration ? formatDuration(headerInfo.duration) : '—'],
                    ['Bitrate', headerInfo.bitrate ? `${Math.round(headerInfo.bitrate / 1000)} kbps` : '—'],
                    ['File Size', formatFileSize(fileSize)],
                    ['Lossless', headerInfo.lossless ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-1.5 text-muted-foreground w-1/3">{label}</td>
                      <td className="px-4 py-1.5 font-mono text-xs">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Metadata */}
          {metadata && (metadata.title || metadata.artist || metadata.album) && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <h3 className="px-4 py-2 text-sm font-heading font-semibold border-b border-border bg-secondary/50">Metadata</h3>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['Title', metadata.title],
                    ['Artist', metadata.artist],
                    ['Album', metadata.album],
                    ['Year', metadata.year],
                    ['Genre', metadata.genre],
                    ['Track', metadata.trackNumber],
                    ['Comment', metadata.comment],
                    ...(metadata.additionalTags ? Object.entries(metadata.additionalTags) : []),
                  ]
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <tr key={label} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-1.5 text-muted-foreground w-1/3">{label}</td>
                        <td className="px-4 py-1.5">{value}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Raw header data */}
          {headerInfo?.raw && Object.keys(headerInfo.raw).length > 0 && (
            <details className="rounded-lg border border-border bg-card overflow-hidden">
              <summary className="px-4 py-2 text-sm font-heading font-semibold cursor-pointer bg-secondary/50">
                Raw Header Data
              </summary>
              <pre className="px-4 py-3 text-xs font-mono text-muted-foreground overflow-x-auto">
                {JSON.stringify(headerInfo.raw, null, 2)}
              </pre>
            </details>
          )}

          <Button variant="outline" size="sm" onClick={() => useAudioStore.getState().clear()}>
            Inspect another file
          </Button>
        </div>
      )}
    </ToolPage>
  );
};

export default FileInspector;
