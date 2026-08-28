'use client';

import { useReducedMotion } from 'motion/react';
import { ImageGenerationShell } from './image-generation-shell';
import { isImageGenerationActive, resolveImageGenerationCopy } from './image-generation-helpers';
import {
  ImageGenerationRetryButton,
  ImageGenerationStatusRow,
  ImageGenerationViewport,
} from './image-generation-parts';
import { MEDIA_STATE, type ImageGenerationProps } from './image-generation-types';

export function ImageGenerationView(props: ImageGenerationProps) {
  const {
    children,
    status = 'generating',
    label,
    prompt,
    resolution = '1024 × 1024',
    aspectRatio = '1 / 1',
    size = 'compact',
    interactive = true,
    statusText,
    showStatus = true,
    onRetry,
    className,
    mediaClassName,
    statusClassName,
  } = props;

  const reduce = useReducedMotion() ?? false;
  const active = isImageGenerationActive(status);
  const mediaState = MEDIA_STATE[status];
  const { resolvedLabel, resolvedStatusText } = resolveImageGenerationCopy({
    label,
    prompt,
    statusText,
    status,
  });

  return (
    <ImageGenerationShell active={active} className={className} size={size} status={status}>
      <ImageGenerationViewport
        active={active}
        aspectRatio={aspectRatio}
        interactive={interactive}
        mediaClassName={mediaClassName}
        mediaState={mediaState}
        reduce={reduce}
        resolution={resolution}
        resolvedLabel={resolvedLabel}
        status={status}
      >
        {children}
      </ImageGenerationViewport>

      <ImageGenerationStatusRow
        prompt={prompt}
        reduce={reduce}
        resolvedStatusText={resolvedStatusText}
        showStatus={showStatus}
        status={status}
        statusClassName={statusClassName}
      />

      <ImageGenerationRetryButton reduce={reduce} status={status} onRetry={onRetry} />
    </ImageGenerationShell>
  );
}
