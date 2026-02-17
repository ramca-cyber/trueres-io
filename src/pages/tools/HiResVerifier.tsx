import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
import { AUDIO_ACCEPT } from '@/config/constants';

const tool = getToolById('hires-verifier')!;

const HiResVerifier = () => {
  return (
    <ToolPage
      tool={tool}
      faq={[
        { q: 'What does "hi-res" audio mean?', a: 'Hi-res audio typically means audio with a sample rate above 44.1kHz and/or bit depth above 16-bit, exceeding CD quality.' },
        { q: 'Can a FLAC file be fake hi-res?', a: 'Yes. A file can be 24-bit/96kHz FLAC but actually contain upsampled 16-bit/44.1kHz content. This tool detects that.' },
        { q: 'What formats are supported?', a: 'WAV, FLAC, AIFF, MP3, OGG, AAC, and M4A files can be analyzed.' },
      ]}
    >
      <FileDropZone
        accept={AUDIO_ACCEPT}
        onFileSelect={(file) => {
          console.log('File selected:', file.name);
          // TODO: Wire up analysis engine
        }}
        label="Drop your audio file here"
        sublabel="WAV, FLAC, AIFF, MP3, OGG, AAC, M4A"
      />

      {/* Analysis results will render here once the engine is built */}
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">
        Drop a file above to analyze it. Results will appear here.
      </div>
    </ToolPage>
  );
};

export default HiResVerifier;
