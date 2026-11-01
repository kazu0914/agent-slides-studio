import {zipSync,strToU8} from 'fflate';
export function pptxWithSlides(count){
 const files={};const ids=[],rels=[];
 for(let i=1;i<=count;i++){
  ids.push(`<p:sldId id="${255+i}" r:id="s${i}"/>`);rels.push(`<Relationship Id="s${i}" Target="slides/slide${i}.xml"/>`);
  files[`ppt/slides/slide${i}.xml`]=strToU8(`<p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="題名"/></p:nvSpPr><p:spPr><a:xfrm><a:off x="1000000" y="1000000"/><a:ext cx="12000000" cy="1000000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:rPr sz="2400"/><a:t>検証スライド ${i}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
 }
 files['ppt/presentation.xml']=strToU8(`<p:presentation xmlns:p="p" xmlns:r="r"><p:sldSz cx="16000000" cy="9000000"/><p:sldIdLst>${ids.join('')}</p:sldIdLst></p:presentation>`);
 files['ppt/_rels/presentation.xml.rels']=strToU8(`<Relationships>${rels.join('')}</Relationships>`);
 return zipSync(files);
}
