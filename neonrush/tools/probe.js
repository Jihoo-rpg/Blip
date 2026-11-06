// For each obstacle in a level: from a safe ground state before it, try a single tap at every possible moment,
// and report the window (in ms) of tap times that survive past the obstacle.
const E=require('../src/engine.js');const A=require('../src/levels.js'),S=require('./solutions.json');
const li=+process.argv[2]||0, l=A[li], L=E.buildLevel(E.expand(l.objs),l.phys||{});
const exp=[];for(const [h,n] of S[li])for(let k=0;k<n;k++)exp.push(h);
// record states along solution
const s=E.newState(), states=[];for(const h of exp){states.push(E.clone(s));E.step(L,s,!!h);if(s.dead||s.won)break;}
const obs=L.all.filter(o=>(o.t==='spike'||o.t==='block'||o.t==='pad'||o.t==='saw')).sort((a,b)=>a.x-b.x);
const done=new Set();
for(const o of obs){ if(o.x>(+process.argv[3]||200))break; if([...done].some(x=>Math.abs(x-o.x)<2.5))continue; done.add(o.x);
  const st=states.find(q=>q.x+1>=o.x-4.5&&q.onGround&&q.mode==='cube'); if(!st||st.x+1>o.x-1)continue;
  // no input at all
  const tryTap=(k,holdT)=>{const c=E.clone(st);for(let i=0;i<k;i++){E.step(L,c,false);if(c.dead)return false;}
    for(let i=0;i<holdT;i++){E.step(L,c,true);if(c.dead)return false;}
    while(c.x<o.x+Math.min(o.w||1,2)+0.5){E.step(L,c,false);if(c.dead)return false;} return true;};
  const ok=[];for(let k=0;k<200;k++)ok.push(tryTap(k,12));
  const none=tryTap(9999,0);
  let best=0,cur=0;for(const v of ok){cur=v?cur+1:0;best=Math.max(best,cur);}
  console.log(o.t.padEnd(6),'x',o.x.toFixed(1).padStart(6),'y',o.y,'w',(o.w||1).toFixed(1),'h',o.h||'', none?'(no jump needed)':'tap window '+(best/240*1000).toFixed(0)+'ms');
}
