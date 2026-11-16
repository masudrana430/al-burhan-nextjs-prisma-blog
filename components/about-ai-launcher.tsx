'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lottie } from 'lottie-react';

export default function AboutAiLauncher() {
  const router = useRouter();
  const [position, setPosition] = useState<{x:number;y:number}|null>(null);
  const drag = useRef<{pointerId:number|null;startX:number;startY:number;originX:number;originY:number;x:number;y:number;moved:boolean}>({
    pointerId:null,startX:0,startY:0,originX:0,originY:0,x:0,y:0,moved:false,
  });

  return (
    <div className="alburhan-ai-float-wrap" style={position ? {left:position.x,top:position.y} : {right:20,bottom:18}}>
      <button
        type="button"
        className="alburhan-ai-float-button"
        aria-label="Open Al-Burhan AI assistant. Drag to move."
        title="AI Assistant — drag to move, click to chat"
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          const rect=event.currentTarget.getBoundingClientRect();
          drag.current={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:rect.left,originY:rect.top,x:rect.left,y:rect.top,moved:false};
          setPosition({x:rect.left,y:rect.top});
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const d=drag.current;
          if(d.pointerId!==event.pointerId)return;
          const dx=event.clientX-d.startX,dy=event.clientY-d.startY;
          if(!d.moved && Math.hypot(dx,dy)>4)d.moved=true;
          if(!d.moved)return;
          const rect=event.currentTarget.getBoundingClientRect();
          const next={x:Math.max(8,Math.min(d.originX+dx,window.innerWidth-rect.width-8)),y:Math.max(8,Math.min(d.originY+dy,window.innerHeight-rect.height-8))};
          d.x=next.x;d.y=next.y;setPosition(next);
        }}
        onPointerUp={(event) => {
          const d=drag.current;if(d.pointerId!==event.pointerId)return;d.pointerId=null;
          if(d.moved){try{localStorage.setItem('al-burhan-ai-launcher-position',JSON.stringify({x:d.x,y:d.y}));}catch{}}
        }}
        onPointerCancel={()=>{drag.current.pointerId=null;drag.current.moved=false;}}
        onClick={()=>{
          if(drag.current.moved){drag.current.moved=false;return;}
          router.push('/?openAI=1');
        }}
      >
        <Lottie animationData={undefined} path="/ai.json" autoplay loop className="alburhan-ai-lottie" />
        <span className="alburhan-ai-float-halo" aria-hidden="true" />
      </button>
      <span className="alburhan-ai-float-label" aria-hidden="true">Ask Al-Burhan AI</span>
    </div>
  );
}
