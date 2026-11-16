'use client';

import { useEffect, useState } from 'react';
import { Lottie } from 'lottie-react';

type Props = { className?: string };

export default function AiLottieAnimation({ className }: Props) {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnimation() {
      try {
        const response = await fetch('/ai.json', { cache: 'force-cache' });
        if (!response.ok) throw new Error('Unable to load AI animation');
        const animation = await response.json();

        // Restore the original embedded artwork from the lightweight asset manifest.
        await Promise.all((animation.assets || []).map(async (asset: any) => {
          if (typeof asset.p !== 'string' || !asset.p.endsWith('.b64')) return;
          const assetResponse = await fetch(`${asset.u || ''}${asset.p}`, { cache: 'force-cache' });
          if (!assetResponse.ok) throw new Error('Unable to load AI animation artwork');
          const base64 = (await assetResponse.text()).trim();
          asset.p = `data:image/png;base64,${base64}`;
          asset.u = '';
          asset.e = 1;
        }));

        // Preserve the original artwork while softly removing the white discs
        // baked into the two rotating image layers.
        await Promise.all((animation.assets || []).map(async (asset: any) => {
          if (!['1_82e22e0b-7c81-4068-90f8-7e7bfe6bde64', '2_c10c0b4b-1075-4a1f-ac98-74fa8663497d'].includes(asset.id)) return;
          if (typeof asset.p !== 'string' || !asset.p.startsWith('data:image/')) return;

          await new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth || asset.w;
                canvas.height = image.naturalHeight || asset.h;
                const context = canvas.getContext('2d');
                if (!context) throw new Error('Canvas is unavailable');
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                context.globalCompositeOperation = 'destination-out';
                context.globalAlpha = 1;
                context.beginPath();
                context.arc(canvas.width / 2, canvas.height * (455 / 804), canvas.width * (125 / 720), 0, Math.PI * 2);
                context.fill();
                asset.p = canvas.toDataURL('image/png');
                resolve();
              } catch (error) {
                reject(error);
              }
            };
            image.onerror = () => reject(new Error('Unable to process AI animation layer'));
            image.src = asset.p;
          });
        }));

        if (!cancelled) setAnimationData(animation);
      } catch (error) {
        console.error('Al-Burhan AI animation failed to load:', error);
      }
    }

    void loadAnimation();
    return () => { cancelled = true; };
  }, []);

  if (!animationData) return null;
  return <Lottie animationData={animationData} autoplay loop className={className} />;
}
