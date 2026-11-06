// every pad must be safe when the player simply runs over it, and every level must be beatable
const E=require('../src/engine.js');const A=require(process.argv[2]||'../src/levels.js'),S=require(process.argv[3]||'./solutions.json');
let bad=0;
A.forEach((l,li)=>{const L=E.buildLevel(E.expand(l.objs),l.phys||{});const exp=[];for(const [h,n] of S[li])for(let k=0;k<n;k++)exp.push(h);
 const s=E.newState(),states=[];for(const h of exp){states.push(E.clone(s));E.step(L,s,!!h);if(s.dead||s.won)break;}
 if(!s.won){bad++;console.log('NOT BEATABLE',l.name);}
 for(const p of L.pads){const st=states.find(q=>q.x+1>=p.x-3&&q.onGround);if(!st||E.CORRIDOR[st.mode])continue;
  const c=E.clone(st);while(!c.dead&&c.x<p.x+3&&!c.used.has(p.id))E.step(L,c,false);
  if(c.dead||!c.used.has(p.id)){bad++;console.log(l.name,'pad',p.x,'not reached safely');continue;}
  // after launch, does a pure no-input flight land safely?
  const d=E.clone(c);while(!d.dead&&!(d.onGround&&d.x>p.x+2))E.step(L,d,false);
  if(d.dead){bad++;console.log(l.name,'pad',p.x,'run-over launch dies at',d.x.toFixed(1));}}});
console.log(bad?('PROBLEMS: '+bad):'ALL OK');
