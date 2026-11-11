/* Finite, event-led crystal light. The accepted signet supplies every seal. */
(() => {
  'use strict';
  const M=window.ElysiaMotifs,TAU=Math.PI*2;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const smooth=n=>{const p=clamp(n);return p*p*(3-2*p);};
  const cubic=(a,b,c,d,t)=>{const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;};
  const seeded=initial=>{let seed=initial>>>0;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};
  const colors={flowers:['#dfadd0','#bca9df','#f5d9e8'],candles:['#ebc38f','#f5dfb9','#e2b8d1'],wish:['#c8b8ed','#d7acd3','#f6dbe9']};

  class BirthdayCeremony {
    constructor() {
      this.canvas=document.getElementById('elysia-light');
      this.ctx=this.canvas.getContext('2d');
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');
      this.sequences=[];this.frame=0;this.serial=0;
      if(!this.ctx)return;
      this.resize();
      window.addEventListener('resize',()=>this.resize(),{passive:true});
      window.addEventListener('scroll',()=>this.clear(),{passive:true});
      this.motion.addEventListener('change',()=>this.resize());
      document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
      window.addEventListener('pagehide',()=>this.clear());
      this.bindPortrait();
    }

    resize() {
      const bounds=this.canvas.getBoundingClientRect();
      this.width=bounds.width;this.height=bounds.height;
      const ratio=Math.min(devicePixelRatio||1,1.75);
      this.canvas.width=Math.round(this.width*ratio);
      this.canvas.height=Math.round(this.height*ratio);
      this.ctx.setTransform(ratio,0,0,ratio,0,0);
      this.clear();
    }

    clear() {
      cancelAnimationFrame(this.frame);this.frame=0;this.sequences=[];
      this.ctx?.clearRect(0,0,this.width,this.height);
      document.querySelector('.portrait-composition')?.style.removeProperty('--portrait-x');
      document.querySelector('.portrait-composition')?.style.removeProperty('--portrait-y');
    }

    bindPortrait() {
      const portrait=document.querySelector('.portrait-composition');
      let rect;
      portrait.addEventListener('pointerenter',()=>{rect=portrait.getBoundingClientRect();},{passive:true});
      portrait.addEventListener('pointermove',event=>{
        if(this.motion.matches||event.pointerType!=='mouse'||!rect)return;
        const x=clamp((event.clientX-rect.left)/rect.width)-.5;
        const y=clamp((event.clientY-rect.top)/rect.height)-.5;
        portrait.style.setProperty('--portrait-x',`${x*7}px`);
        portrait.style.setProperty('--portrait-y',`${y*6}px`);
      },{passive:true});
      portrait.addEventListener('pointerleave',()=>{
        rect=null;portrait.style.setProperty('--portrait-x','0px');portrait.style.setProperty('--portrait-y','0px');
      },{passive:true});
      window.addEventListener('resize',()=>{rect=null;},{passive:true});
    }

    anchor(element) {
      if(!element)return null;
      const rect=element.getBoundingClientRect();
      if(!rect.width||!rect.height)return null;
      return {x:(rect.left+rect.width/2)/this.width,y:(rect.top+rect.height/2)/this.height,
        spread:Math.min(130,rect.width*.65)/this.width,radius:Math.min(rect.width,rect.height)/2};
    }

    add(sequence) {
      if(!this.ctx||this.motion.matches||document.hidden)return;
      sequence.start=performance.now();
      this.sequences.push(sequence);
      if(this.sequences.length>4)this.sequences.shift();
      if(!this.frame)this.frame=requestAnimationFrame(now=>this.tick(now));
    }

    arrive(view) {
      const seal=document.querySelector(`#${view} .scene-signet`);
      const anchor=this.anchor(seal);
      if(!anchor)return;
      const random=seeded(11112026+this.serial++);
      const particles=Array.from({length:26},(_,i)=>({angle:i*2.39996+random()*.2,
        radius:35+random()*65,size:1+random()*1.7,delay:random()*.2}));
      this.add({type:'arrival',anchor,particles,duration:1500});
    }

    ritual(kind,origin,destination,final=false,replay=false) {
      const from=this.anchor(origin),to=this.anchor(destination);
      if(!from||!to)return;
      const random=seeded(1111+this.serial++*131);
      const height=Math.min(this.height,900),lift=(65+height*.095)/this.height;
      const direction=to.x>=from.x?1:-1;
      const particles=Array.from({length:replay?34:72},(_,i)=>{
        const shift=(random()-.5)*from.spread;
        return {x:[from.x+shift,from.x+shift+direction*(.025+random()*.06),to.x-direction*.05,to.x],
          y:[from.y+(random()-.5)*.025,from.y-lift*(.45+random()*.8),to.y-lift*.58,to.y],
          delay:random()*.19,duration:.78+random()*.22,phase:random()*TAU,
          size:.65+random()*1.55,crystal:i%4===0,color:colors[kind][i%3]};
      });
      this.add({type:'ritual',kind,from,to,particles,final,duration:final?2150:1800});
    }

    glow(x,y,radius,color,alpha) {
      if(alpha<=0)return;
      const ctx=this.ctx,gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
      gradient.addColorStop(0,color);gradient.addColorStop(.4,color+'99');gradient.addColorStop(1,color+'00');
      ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=gradient;
      ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fill();ctx.restore();
    }

    drawArrival(sequence,t) {
      const ctx=this.ctx,x=sequence.anchor.x*this.width,y=sequence.anchor.y*this.height;
      const life=clamp(t/1.5),envelope=Math.sin(life*Math.PI);
      this.glow(x,y,75,'#e8c4e7',envelope*.22);
      for(const particle of sequence.particles) {
        const u=clamp((t-particle.delay)/1.12),settle=smooth(u);
        const radius=particle.radius*(1-settle*.67),angle=particle.angle+settle*.23;
        const alpha=Math.sin(u*Math.PI)*.72;
        M.crystal(ctx,x+Math.cos(angle)*radius,y+Math.sin(angle)*radius*.74,
          particle.size,angle+Math.PI/4,alpha,'#c8a6d2');
      }
    }

    flight(particle,u) {
      const t=smooth(u),arch=Math.sin(t*Math.PI);
      return {x:cubic(...particle.x,t)*this.width+Math.sin(t*TAU+particle.phase)*arch*9,
        y:cubic(...particle.y,t)*this.height+Math.cos(t*Math.PI+particle.phase)*arch*6};
    }

    drawRitual(sequence,t) {
      const ctx=this.ctx,x=sequence.from.x*this.width,y=sequence.from.y*this.height;
      const targetX=sequence.to.x*this.width,targetY=sequence.to.y*this.height;
      const bloom=Math.sin(clamp(t/.95)*Math.PI);
      this.glow(x,y,sequence.kind==='candles'?95:68,
        sequence.kind==='candles'?'#f4d5a6':'#e4c1e8',bloom*(sequence.kind==='candles'?.37:.22));
      if(sequence.kind==='wish') {
        this.glow(x,y,34,'#c3a0d8',Math.sin(clamp(t/.8)*Math.PI)*.2);
      }
      for(const particle of sequence.particles) {
        const u=clamp((t-particle.delay)/particle.duration);
        if(u<=0||u>=1)continue;
        const point=this.flight(particle,u),tail=this.flight(particle,Math.max(0,u-.045));
        const alpha=smooth(u/.15)*(1-smooth((u-.74)/.26));
        ctx.save();ctx.strokeStyle=particle.color;ctx.globalAlpha=alpha*.27;ctx.lineWidth=.85;
        ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(point.x,point.y);ctx.stroke();
        if(particle.crystal) {
          ctx.globalAlpha=1;
          M.crystal(ctx,point.x,point.y,particle.size*1.6,particle.phase+u*.7,alpha*.84,particle.color);
        } else {
          ctx.globalAlpha=alpha*.85;ctx.fillStyle=particle.color;
          ctx.beginPath();ctx.arc(point.x,point.y,particle.size,0,TAU);ctx.fill();
        }
        ctx.restore();
      }
      const arrived=smooth((t-.68)/.42)*(1-smooth((t-1.25)/.65));
      this.glow(targetX,targetY,sequence.final?85:44,'#e3b9df',arrived*(sequence.final?.37:.23));
      if(sequence.final&&t>.88) {
        const u=clamp((t-.88)/1.12);
        M.signet(ctx,targetX,targetY,sequence.to.radius*(1+Math.sin(u*Math.PI)*.32),0,
          Math.sin(u*Math.PI)*.75,{light:false,lineWidth:1,color:'#fff4fb'});
        for(let i=0;i<12;i++) {
          const angle=i/12*TAU,radius=25+smooth(u)*34;
          M.crystal(ctx,targetX+Math.cos(angle)*radius,targetY+Math.sin(angle)*radius*.68,
            1.8,angle,Math.sin(u*Math.PI)*.6,'#c6a0cf');
        }
      }
    }

    tick(now) {
      this.frame=0;
      if(document.hidden||this.motion.matches){this.clear();return;}
      const ctx=this.ctx;
      ctx.clearRect(0,0,this.width,this.height);
      this.sequences=this.sequences.filter(sequence=>now-sequence.start<sequence.duration);
      for(const sequence of this.sequences) {
        const t=(now-sequence.start)/1000;
        if(sequence.type==='arrival')this.drawArrival(sequence,t);
        else this.drawRitual(sequence,t);
      }
      if(this.sequences.length)this.frame=requestAnimationFrame(time=>this.tick(time));
    }
  }

  window.BirthdayCeremony=new BirthdayCeremony();
})();
