import { ImageResponse } from 'next/og';
import { siteUrl } from '@/lib/site';

export const runtime = 'edge';
export const alt = 'AL-BURHAN — The Proof Website | Research & Knowledge Library';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          alignItems: 'center',
          padding: '54px 68px',
          background: 'linear-gradient(125deg, #06172d 0%, #073a32 58%, #092644 100%)',
          color: '#fffdf5',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', right: -120, top: -210, width: 620, height: 620, borderRadius: '50%', border: '2px solid rgba(224, 190, 112, 0.16)' }} />
        <div style={{ position: 'absolute', right: -35, top: -120, width: 470, height: 470, borderRadius: '50%', border: '2px solid rgba(224, 190, 112, 0.12)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 9, background: 'linear-gradient(90deg, #b88a3c, #f1d78a, #b88a3c)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 54, width: '100%', zIndex: 1 }}>
          <div style={{ display: 'flex', width: 310, height: 310, alignItems: 'center', justifyContent: 'center', borderRadius: 38, background: '#fff8e8', border: '5px solid #d5b46a', padding: 10 }}>
            <img src={siteUrl + '/al-burhan-logo.svg'} width="286" height="286" style={{ objectFit: 'contain', borderRadius: 26 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{ width: 42, height: 3, background: '#e0bf72' }} />
              <span style={{ color: '#e7ca83', fontSize: 20, fontWeight: 700, letterSpacing: 4 }}>RESEARCH & KNOWLEDGE LIBRARY</span>
            </div>
            <div style={{ color: '#fffdf5', fontSize: 66, lineHeight: 1.08, fontWeight: 800, letterSpacing: 1 }}>AL-BURHAN</div>
            <div style={{ color: '#f0d28b', fontSize: 29, fontWeight: 600, marginTop: 14 }}>THE PROOF WEBSITE</div>
            <div style={{ width: 440, height: 1, background: 'rgba(238, 214, 157, 0.55)', marginTop: 28, marginBottom: 22 }} />
            <div style={{ color: '#e2eee8', fontSize: 22, lineHeight: 1.5, maxWidth: 470 }}>Evidence-based articles, Islamic research, philosophy, history and science — in Bangla & English.</div>
            <div style={{ color: '#d5b46a', fontSize: 17, fontWeight: 700, marginTop: 28, letterSpacing: 2 }}>AL-BURHAN-PEARL-NINE.VERCEL.APP</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
