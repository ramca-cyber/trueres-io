import { ToolPage } from '@/components/shared/ToolPage';
import { FileDropZone } from '@/components/shared/FileDropZone';
import { getToolById } from '@/config/tool-registry';
import { VIDEO_ACCEPT } from '@/config/constants';
const tool = getToolById('video-mute')!;
const VideoMute = () => (
  <ToolPage tool={tool}>
    <FileDropZone accept={VIDEO_ACCEPT} onFileSelect={(f) => console.log(f.name)} label="Drop your video file here" sublabel="MP4, WebM, AVI, MKV, MOV" />
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">Drop a video above to mute or replace audio.</div>
  </ToolPage>
);
export default VideoMute;
