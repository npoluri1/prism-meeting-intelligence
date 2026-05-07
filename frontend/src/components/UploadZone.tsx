import { type DragEvent, useRef, useState } from 'react'

const AUDIO_VIDEO = new Set(['mp3', 'm4a', 'wav', 'mp4', 'mov', 'webm', 'mkv'])
const IMAGES      = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'])
const ALL_FORMATS = new Set([...AUDIO_VIDEO, ...IMAGES])

const ACCEPT = [
  '.mp3,.m4a,.wav,.mp4,.mov,.webm,.mkv',
  '.jpg,.jpeg,.png,.webp,.gif,.bmp',
].join(',')

const MAX_BYTES = 2 * 1024 ** 3

function fileIcon(ext: string): string {
  if (IMAGES.has(ext)) return '🖼️'
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return '🎬'
  return '🎵'
}

function fileKind(ext: string): string {
  if (IMAGES.has(ext)) return 'Image'
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'Video'
  return 'Audio'
}

interface Props {
  file: File | null
  onFile: (f: File | null) => void
  error?: string
}

export function UploadZone({ file, onFile, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function validate(f: File): string | null {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALL_FORMATS.has(ext)) {
      return `Unsupported format ".${ext}". Accepted: audio, video, or image files.`
    }
    if (f.size > MAX_BYTES) return 'File exceeds 2 GB limit'
    if (f.size === 0) return 'File is empty'
    return null
  }

  function handleFiles(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    const err = validate(f)
    if (err) { alert(err); return }
    onFile(f)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const ext = file?.name.split('.').pop()?.toLowerCase() ?? ''
  const sizeLabel = file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all select-none ${
        dragging
          ? 'border-violet-500 bg-violet-50'
          : file
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/40'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {file ? (
        <div className="space-y-2">
          <div className="text-3xl">{fileIcon(ext)}</div>
          <p className="font-semibold text-emerald-700">{file.name}</p>
          <p className="text-xs text-slate-500">
            {fileKind(ext)} · {sizeLabel}
          </p>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onFile(null) }}
            className="mt-2 rounded-lg px-3 py-1 text-xs text-rose-500 hover:bg-rose-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-4xl">{dragging ? '📂' : '⬆️'}</div>
          <div>
            <p className="font-semibold text-slate-700">
              {dragging ? 'Drop it here' : 'Drag & drop your file'}
            </p>
            <p className="text-sm text-slate-400 mt-0.5">or click to browse</p>
          </div>

          {/* Format pills */}
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              🖼️ JPG / PNG / WEBP
            </span>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              🎵 MP3 / WAV / M4A
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              🎬 MP4 / MOV / WEBM
            </span>
          </div>
          <p className="text-xs text-slate-400">max 2 GB</p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  )
}
