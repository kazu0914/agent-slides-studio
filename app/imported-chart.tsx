import {type SlideObject,type TextStyle} from '../lib/objects';

// PowerPointの代表的な固定小数・百分率書式を、丸め桁数を保って表示する。
export function chartNumber(value:number,format='General'){
 const pattern=format.split(';')[0],percent=pattern.includes('%'),fixed=pattern.match(/^[#,0]+(?:\.([0#]+))?%?$/);
 if(!fixed)return String(Number(value.toPrecision(12)));
 const decimals=fixed[1]||'';
 return (value*(percent?100:1)).toLocaleString('en-US',{minimumFractionDigits:Math.min(12,(decimals.match(/0/g)||[]).length),maximumFractionDigits:Math.min(12,decimals.length),useGrouping:pattern.includes(',')})+(percent?'%':'');
}
export function ImportedChart({object:o}:{object:SlideObject}){
 const f=o.chartFormat!,rows=o.cells.slice(1),series=o.cells[0].slice(1),values=rows.map(r=>r.slice(1).map(Number)),flat=values.flat();
 const min=f.minimum??Math.min(0,...flat),max=f.maximum??Math.max(0,...flat),range=max>min?max-min:1;
 const css=(s:TextStyle|undefined)=>({fontFamily:s?.fontFamily||'Arial',fontSize:(s?.fontSize||14)*4/3,fontWeight:s?.bold?700:400,fill:s?.color||'#526575'});
 const axis=css(f.axisStyle),category=css(f.categoryStyle),label=css(f.labelStyle),colors=f.colors?.length?f.colors:['#2454ef'];
 // SVG座標をオブジェクトの寸法と一致させ、横長グラフの左右の余白をなくす。
 const w=o.w,h=o.h,left=Math.min(w*.25,Math.max(axis.fontSize*3.8,42)),right=Math.min(12,w*.02),top=Math.min(h*.15,Math.max(label.fontSize,12));
 const bottom=Math.min(h*.35,category.fontSize*1.8+(f.showLegend?category.fontSize*1.8:0)),pw=Math.max(1,w-left-right),ph=Math.max(1,h-top-bottom);
 const y=(n:number)=>top+(max-n)/range*ph,baseline=y(Math.max(min,Math.min(max,0))),cw=pw/rows.length;
 const step=f.majorUnit??range/4,count=Math.min(200,Math.floor(range/step+1e-8)),ticks=Array.from({length:count+1},(_,i)=>min+i*step);
 const barWidth=cw/(series.length+(f.gapWidth??150)/100),clusterWidth=barWidth*series.length;
 return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" role="img" aria-label={`${o.chartType} グラフ`}>
 {ticks.map((v,i)=><g key={i}><line x1={left} x2={w-right} y1={y(v)} y2={y(v)} stroke={f.gridColor||'#e2eaf0'}/><text x={left-axis.fontSize*.6} y={y(v)} dominantBaseline="middle" textAnchor="end" {...axis}>{chartNumber(v,f.numberFormat)}</text></g>)}
 {series.map((name,j)=><g key={j}>
 {o.chartType==='line'?<polyline fill="none" stroke={colors[j%colors.length]} strokeWidth={3} points={values.map((v,i)=>`${left+cw*(i+.5)},${y(Math.max(min,Math.min(max,v[j])))}`).join(' ')}/>:values.map((v,i)=><rect key={i} x={left+cw*(i+.5)-clusterWidth/2+j*barWidth} y={Math.min(baseline,y(Math.max(min,Math.min(max,v[j]))))} width={barWidth} height={Math.abs(baseline-y(Math.max(min,Math.min(max,v[j]))))} fill={colors[j%colors.length]}/>)}
 {f.showValue&&values.map((v,i)=><text key={i} x={left+cw*(i+.5)+(o.chartType==='bar'?-clusterWidth/2+(j+.5)*barWidth:0)} y={y(v[j])+(v[j]>=0?-label.fontSize*.5:label.fontSize*1.2)} textAnchor="middle" {...label}>{chartNumber(v[j],f.valueFormat)}</text>)}
 {f.showLegend&&<g transform={`translate(${left+j*pw/series.length},${h-category.fontSize})`}><rect width={category.fontSize*.6} height={category.fontSize*.6} fill={colors[j%colors.length]}/><text x={category.fontSize} y={category.fontSize*.6} {...category}>{name}</text></g>}
 </g>)}
 {rows.map((r,i)=><text key={i} x={left+cw*(i+.5)} y={top+ph+category.fontSize*1.4} textAnchor="middle" {...category}>{r[0]}</text>)}
 </svg>;
}
