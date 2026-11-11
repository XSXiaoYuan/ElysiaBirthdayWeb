/* Reference-based Signet of Ego contours and original animated bow linework.
   Canvas, particles and SVG share the same geometry. No motif bitmap is loaded. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = n => Math.max(0, Math.min(1, n));
  const mix = (a,b,t) => a + (b-a)*t;
  const palette = [[245,179,222],[202,186,246],[255,232,246],[174,218,246],[238,199,229]];
  const curve = (p, tone=0, weight=1, role='limb') => ({p,tone,weight,role});
  const line = (a,b,tone=0,weight=1,role='limb') => curve([
    ...a, mix(a[0],b[0],1/3),mix(a[1],b[1],1/3),
    mix(a[0],b[0],2/3),mix(a[1],b[1],2/3), ...b,
  ],tone,weight,role);
  const mirrorY = c => curve(c.p.map((n,i) => i%2 ? -n : n),c.tone,c.weight,c.role);

  // The signet is not bilaterally mirrored: its petals, heart and angular rim
  // come from the recorded reference. Preserve every closed interior contour.
  const signetPaths = window.ELYSIA_SIGNET.contours.map((shape,index) => {
    const curves=shape.curves.map(p => curve(p,shape.tone,1,'signet'));
    const total=curves.reduce((length,c) => {
      c.measure=measureCurve(c);
      return length+c.measure.length;
    },0);
    let distance=0;
    for(const c of curves) {
      c.start=distance/total;
      distance+=c.measure.length;
      c.end=distance/total;
    }
    const contour={...shape,curves,delay:index===0?0:.07+(index-1)*.012};
    contour.path=contourPath(contour);
    return contour;
  });
  const signetCurves=signetPaths.flatMap(shape => shape.curves);

  const upperLimb = [
    curve([0,-.07, .2,-.13, .34,-.33, .23,-.53],0,1.1),
    curve([.23,-.53, .13,-.72, -.15,-.77, -.1,-.97],0,1.1),
    curve([-.1,-.97, .13,-.9, .22,-.72, .23,-.53],1,.95),
    curve([.015,-.12, .14,-.21, .19,-.37, .15,-.5],2,.57),
    curve([.15,-.5, .08,-.62, -.04,-.77, -.064,-.86],2,.57),
    curve([.05,-.13, .32,-.17, .43,-.28, .47,-.44],1),
    curve([.47,-.44, .22,-.4, .07,-.31, .05,-.13],1),
    curve([.095,-.23, .22,-.3, .29,-.31, .36,-.35],2,.5),
    curve([.18,-.6, .39,-.56, .47,-.67, .46,-.76],3,.74),
    curve([.46,-.76, .37,-.7, .24,-.78, .12,-.75],3,.74),
  ];
  const bowBase = upperLimb.flatMap(c => [c,mirrorY(c)]);
  bowBase.push(
    line([0,-.13],[.105,0],2,1.1), line([.105,0],[0,.13],2,1.1),
    line([0,.13],[-.07,0],2,1.1), line([-.07,0],[0,-.13],2,1.1),
    line([-.1,-.97],[-.1,0],2,.78,'upper-string'),
    line([-.1,0],[-.1,.97],2,.78,'lower-string'),
  );

  function at(c,t) {
    const p=c.p,u=1-t;
    return {x:u*u*u*p[0]+3*u*u*t*p[2]+3*u*t*t*p[4]+t*t*t*p[6],
      y:u*u*u*p[1]+3*u*u*t*p[3]+3*u*t*t*p[5]+t*t*t*p[7]};
  }

  function measureCurve(c) {
    const marks=[{u:0,length:0}];
    let last=at(c,0),length=0;
    for(let step=1;step<=32;step++) {
      const point=at(c,step/32);
      length+=Math.hypot(point.x-last.x,point.y-last.y);
      marks.push({u:step/32,length});last=point;
    }
    return {marks,length};
  }

  function contourPath(shape,progress=1) {
    if(progress>=1&&shape.path)return shape.path;
    const path=new Path2D();
    path.moveTo(...shape.curves[0].p.slice(0,2));
    for(const c of shape.curves) {
      if(progress<=c.start)break;
      const portion=clamp((progress-c.start)/Math.max(.000001,c.end-c.start));
      const segment=portion>=1?c:split(c,portion)[0];
      path.bezierCurveTo(...segment.p.slice(2));
      if(portion<1)break;
    }
    if(progress>=1)path.closePath();
    return path;
  }

  function flex(x,y,pose) {
    const bend=(pose.pull||0)-(pose.recoil||0)*.2;
    return {x:x-bend*.28*Math.pow(Math.abs(y),1.55),y:y*(1-bend*.13)};
  }

  function bowGeometry(pose={}) {
    const pull=pose.pull||0, wave=pose.wave||0;
    const nock={x:-.1-pull*.68+(pose.recoil||0)*.025,y:0};
    return bowBase.map(c => {
      if(c.role.includes('string')) {
        const top=c.role==='upper-string';
        const tip=flex(-.1,top?-.97:.97,pose);
        const a=top?tip:nock,b=top?nock:tip;
        return curve([a.x,a.y,mix(a.x,b.x,1/3)+wave*.07,mix(a.y,b.y,1/3),
          mix(a.x,b.x,2/3)-wave*.065,mix(a.y,b.y,2/3),b.x,b.y],c.tone,c.weight,c.role);
      }
      const p=[];
      for(let i=0;i<8;i+=2) {const point=flex(c.p[i],c.p[i+1],pose);p.push(point.x,point.y);}
      return curve(p,c.tone,c.weight,c.role);
    });
  }

  function split(c,t) {
    const p=c.p,a=[p[0],p[1]],b=[p[2],p[3]],d=[p[4],p[5]],e=[p[6],p[7]];
    const lerp=(u,v) => [mix(u[0],v[0],t),mix(u[1],v[1],t)];
    const ab=lerp(a,b),bd=lerp(b,d),de=lerp(d,e),abd=lerp(ab,bd),bde=lerp(bd,de),mid=lerp(abd,bde);
    return [curve([...a,...ab,...abd,...mid]),curve([...mid,...bde,...de,...e])];
  }

  function trace(ctx,c,from=0,to=1) {
    let segment=c;
    if(to<1)segment=split(segment,to)[0];
    if(from>0)segment=split(segment,from/Math.max(to,.00001))[1];
    const p=segment.p;
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(...p.slice(2));
  }

  function drawCurves(ctx,curves,x,y,radius,alpha,rotation=0,options={}) {
    if(alpha<=0||radius<=0)return;
    const reveal=options.reveal??1,dissolve=options.dissolve||0;
    const px=options.lineWidth||Math.max(.85,radius*.0055);
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(radius,radius);
    ctx.lineCap='round';ctx.lineJoin='round';
    for(let i=0;i<curves.length;i++) {
      const c=curves[i];
      const delay=(i%12)*.017;
      const visible=clamp((reveal-delay)/(1-delay));
      const erased=clamp((dissolve-(i%5)*.032)/.84);
      const end=visible*(1-erased);
      if(end<=.001)continue;
      const [r,g,b]=palette[c.tone%palette.length];
      trace(ctx,c,0,end);
      if(options.light!==false) {
        ctx.strokeStyle=`rgba(${r},${g},${b},${alpha*.16})`;
        ctx.lineWidth=px*4.2/radius;ctx.stroke();
      }
      const ink=ctx.createLinearGradient(c.p[0],c.p[1],c.p[6]+.001,c.p[7]);
      ink.addColorStop(0,`rgba(${r},${g},${b},${alpha*c.weight})`);
      ink.addColorStop(.54,`rgba(255,241,251,${alpha*c.weight})`);
      ink.addColorStop(1,`rgba(${r},${g},${b},${alpha*c.weight*.88})`);
      ctx.strokeStyle=options.color||ink;ctx.lineWidth=px/radius;ctx.stroke();
      if(reveal<1&&visible>.02&&visible<.98) {
        const point=at(c,end);
        ctx.fillStyle=`rgba(255,237,250,${alpha})`;
        ctx.beginPath();ctx.arc(point.x,point.y,1.7/radius,0,TAU);ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawSignet(ctx,x,y,radius,alpha,rotation=0,options={}) {
    if(alpha<=0||radius<=0)return;
    const reveal=clamp(options.reveal??1),dissolve=clamp(options.dissolve||0);
    const px=options.lineWidth||Math.max(.85,radius*.0055);
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(radius,radius);
    ctx.lineCap='round';ctx.lineJoin='round';
    const opacity=ctx.globalAlpha*alpha,inks=new Map();
    for(const shape of signetPaths) {
      const visible=clamp((reveal-shape.delay)/(1-shape.delay));
      const progress=visible*(1-dissolve);
      if(progress<=0)continue;
      // Cache complete paths; the pen and particles share their arc lengths.
      // Stroke each closed outline once, avoiding bright seams at short joins.
      const path=contourPath(shape,progress);
      if(!inks.has(shape.tone)) {
        const [r,g,b]=palette[shape.tone];
        const ink=ctx.createLinearGradient(-.9,-.95,.85,.95);
        ink.addColorStop(0,`rgb(${r},${g},${b})`);
        ink.addColorStop(.5,`rgb(${Math.min(255,r+12)},${Math.min(255,g+18)},${Math.min(255,b+10)})`);
        ink.addColorStop(1,`rgb(${r},${g},${b})`);
        inks.set(shape.tone,ink);
      }
      ctx.strokeStyle=options.color||inks.get(shape.tone);
      if(options.light!==false) {
        ctx.globalAlpha=opacity*.13;ctx.lineWidth=px*3.4/radius;ctx.stroke(path);
      }
      ctx.globalAlpha=opacity;ctx.lineWidth=px/radius;ctx.stroke(path);
      if(reveal<1&&visible>.02&&visible<.98&&dissolve===0) {
        const c=shape.curves.find(segment => progress<=segment.end)||shape.curves.at(-1);
        const point=at(c,clamp((progress-c.start)/Math.max(.000001,c.end-c.start)));
        ctx.fillStyle='#fff0fa';ctx.beginPath();ctx.arc(point.x,point.y,1.35/radius,0,TAU);ctx.fill();
      }
    }
    ctx.restore();
  }
  function signet(ctx,x,y,radius,time=0,alpha=1,options={}) {
    drawSignet(ctx,x,y,radius,alpha,options.rotation||0,options);
  }
  function signetOutline(ctx,x,y,radius,alpha=1,lineWidth=1,rotation=0) {
    drawSignet(ctx,x,y,radius,alpha,rotation,{lineWidth,light:false});
  }
  function bow(ctx,x,y,radius,time=0,alpha=1,rotation=0,pose={}) {
    drawCurves(ctx,pose.curves||bowGeometry(pose),x,y,radius,alpha,rotation,pose);
  }
  function sample(ctx,kind,x,y,radius) {
    if(kind==='bow')drawCurves(ctx,bowBase,x,y,radius,1,0,{lineWidth:1.8,light:false});
    else drawSignet(ctx,x,y,radius,1,0,{lineWidth:1.8,light:false});
  }

  // Arc-length sampling keeps short ornament curves and the entire string represented.
  function cloud(kind,count=3200) {
    const curves=kind==='bow'?bowBase:signetCurves;
    const measured=curves.map((c,index) => {
      const {marks,length}=c.measure||measureCurve(c);
      return {c,index,marks,length};
    });
    const total=measured.reduce((sum,item) => sum+item.length,0),points=[];
    for(const item of measured) {
      const slots=Math.max(kind==='signet'?2:12,Math.round(count*item.length/total));
      let cursor=1;
      for(let i=0;i<slots;i++) {
        const distance=(i+.5)/slots*item.length;
        while(cursor<item.marks.length-1&&item.marks[cursor].length<distance)cursor++;
        const a=item.marks[cursor-1],b=item.marks[cursor];
        const u=mix(a.u,b.u,(distance-a.length)/Math.max(.000001,b.length-a.length));
        const point=at(item.c,u),color=palette[item.c.tone%palette.length];
        points.push({...point,curve:item.index,u,r:color[0],g:color[1],b:color[2],a:item.c.weight});
      }
    }
    points.sort((a,b) => a.y-b.y || a.x-b.x);
    return {points,edge:points};
  }

  function arrow(ctx,x,y,length,rotation=0,alpha=1,options={}) {
    if(alpha<=0||length<=0)return;
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
    if(options.anchor==='tail')ctx.translate(length*.62,0);
    ctx.globalAlpha*=alpha;
    if((options.reveal??1)<1) {ctx.beginPath();ctx.rect(-length*.64,-length*.18,length*1.18*clamp(options.reveal),length*.36);ctx.clip();}
    const ink=ctx.createLinearGradient(-length*.62,0,length*.5,0);
    ink.addColorStop(0,'#c6abe99a');ink.addColorStop(.44,'#eebae1');ink.addColorStop(1,'#fff5fc');
    ctx.strokeStyle=ink;ctx.lineJoin='round';ctx.lineCap='round';
    const lineWidth=Math.max(.9,length*.007);
    const shaft=new Path2D();shaft.moveTo(-length*.62,0);shaft.lineTo(length*.43,0);
    ctx.globalAlpha*=.16;ctx.lineWidth=lineWidth*5;ctx.stroke(shaft);
    ctx.globalAlpha/= .16;ctx.lineWidth=lineWidth;ctx.stroke(shaft);
    ctx.beginPath();ctx.moveTo(length*.52,0);ctx.lineTo(length*.27,-length*.055);
    ctx.lineTo(length*.34,0);ctx.lineTo(length*.27,length*.055);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(length*.33,0);ctx.lineTo(length*.47,0);ctx.stroke();
    for(const side of [-1,1]) {
      ctx.beginPath();ctx.moveTo(-length*.49,0);
      ctx.bezierCurveTo(-length*.52,side*length*.035,-length*.59,side*length*.068,-length*.62,side*length*.065);
      ctx.bezierCurveTo(-length*.59,side*length*.02,-length*.51,side*length*.018,-length*.4,0);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-length*.24,0);ctx.quadraticCurveTo(-length*.37,side*length*.06,-length*.47,side*length*.045);ctx.stroke();
      ctx.globalAlpha*=.45;ctx.beginPath();ctx.moveTo(-length*.3,side*lineWidth*2);ctx.lineTo(length*.19,side*lineWidth*.55);ctx.stroke();ctx.globalAlpha/=.45;
    }
    ctx.restore();
  }

  function crystal(ctx,x,y,radius,rotation=0,alpha=1,color='#f7d9f1') {
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha*=alpha;
    ctx.strokeStyle=color;ctx.lineWidth=.85;
    ctx.beginPath();ctx.moveTo(0,-radius*1.5);ctx.lineTo(radius*.5,0);ctx.lineTo(0,radius*1.5);ctx.lineTo(-radius*.5,0);ctx.closePath();ctx.stroke();
    ctx.globalAlpha*=.35;ctx.fillStyle=color;ctx.fill();ctx.restore();
  }

  const pathData=c => 'M'+c.p.slice(0,2).map(n=>(n*100).toFixed(3)).join(' ')+' C'+c.p.slice(2).map(n=>(n*100).toFixed(3)).join(' ');
  const svgPaths=(curves,width=2.2,simple=false) => curves.map((c,i) => simple&&c.weight<.8?'':
    '<path data-curve="'+i+'" d="'+pathData(c)+'" pathLength="1" fill="none" stroke="currentColor" stroke-width="'+width+'" opacity="'+c.weight+'" stroke-linecap="round" stroke-linejoin="round"/>').join('');
  const signetSVGPaths=(width=2.2) => signetPaths.map(shape => {
    const path=pathData(shape.curves[0])+shape.curves.slice(1).map(c =>
      ' C'+c.p.slice(2).map(n=>(n*100).toFixed(3)).join(' ')).join('')+' Z';
    return '<path data-contour="'+shape.id+'" d="'+path+'" pathLength="1" fill="none" stroke="currentColor" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';
  }).join('');
  function signetSVG(id='ego-signet',charged=false) {
    const paths=signetSVGPaths();
    return '<svg viewBox="-110 -110 220 220" aria-hidden="true"><g class="engine-ego-base">'+paths+'</g>'+(charged?'<g class="engine-ego-charge">'+paths+'</g>':'')+'</svg>';
  }
  function bowSVG(id='ego-bow') {
    return '<svg viewBox="-110 -110 220 220" aria-hidden="true">'+svgPaths(bowBase,2.5)+'</svg>';
  }
  function updateBowSVG(svg,pose) {
    if(!svg)return;
    const curves=bowGeometry(pose);
    svg.querySelectorAll('path[data-curve]').forEach(path => path.setAttribute('d',pathData(curves[Number(path.dataset.curve)])));
  }
  function arrowSVG() {
    return '<svg viewBox="0 0 64 20" aria-hidden="true"><path d="M3 10H58M60 10 47 5 50 10 47 15ZM22 10Q13 2 5 4Q11 10 18 10M22 10Q13 18 5 16Q11 10 18 10" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  const symbols=document.createElementNS('http://www.w3.org/2000/svg','svg');
  symbols.setAttribute('class','svg-library');symbols.setAttribute('aria-hidden','true');
  symbols.innerHTML='<symbol id="i-ego" viewBox="-110 -110 220 220">'+signetSVGPaths(6)+'</symbol>'+
    '<symbol id="i-key-of-ego" viewBox="-110 -110 220 220">'+svgPaths(bowBase,7,true)+'</symbol>';
  document.body.appendChild(symbols);
  window.ElysiaMotifs={palette,sample,cloud,point:at,signet,signetOutline,bow,bowGeometry,arrow,crystal,signetSVG,bowSVG,arrowSVG,updateBowSVG};
})();
