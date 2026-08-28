import { STATUS_TEXT, type ImageGenerationProps } from './image-generation-types';

export function resolveImageGenerationCopy({
  label,
  prompt,
  statusText,
  status,
}: Pick<ImageGenerationProps, 'label' | 'prompt' | 'statusText' | 'status'>) {
  const resolvedStatus = status ?? 'generating';
  const resolvedStatusText = statusText ?? STATUS_TEXT[resolvedStatus];
  const resolvedLabel = label ?? (prompt ? `${resolvedStatusText}: ${prompt}` : resolvedStatusText);
  return { resolvedLabel, resolvedStatusText };
}

export function isImageGenerationActive(status: ImageGenerationProps['status']) {
  return status === 'queued' || status === 'generating' || status === 'refining';
}
