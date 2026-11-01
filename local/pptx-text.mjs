import {DOMParser, XMLSerializer} from '@xmldom/xmldom';
import {unzipSync, zipSync, strFromU8, strToU8} from 'fflate';

// 出力ライブラリに指定できない文字のクリップ設定を、生成済みの文字枠へ戻す。
export function preserveTextOverflow(bytes, slides) {
  const files=unzipSync(bytes),serializer=new XMLSerializer();
  for(let i=0;i<slides.length;i++){
    const path=`ppt/slides/slide${i+1}.xml`;
    const doc=new DOMParser().parseFromString(strFromU8(files[path]),'application/xml');
    // 表に自動挿入される固定の文字セット指定は、Mac版PowerPointで日本語を文字化けさせる。
    // 書体名と言語は維持し、文字セットの選択をOfficeに任せる。
    for(const table of Array.from(doc.getElementsByTagNameNS('*','tbl'))){
      for(const tag of ['latin','ea','cs']){
        for(const font of Array.from(table.getElementsByTagNameNS('*',tag)))font.removeAttribute('charset');
      }
    }
    const records=new Map(slides[i].map(record=>[record.marker,record]));
    for(const shape of Array.from(doc.getElementsByTagNameNS('*','sp'))){
      const name=shape.getElementsByTagNameNS('*','cNvPr')[0],record=records.get(name?.getAttribute('name'));
      if(!record)continue;
      name.setAttribute('name',record.name);
      const body=shape.getElementsByTagNameNS('*','bodyPr')[0];
      body.setAttribute('horzOverflow',record.layout.overflowX==='clip'?'clip':'overflow');
      body.setAttribute('vertOverflow',record.layout.overflowY==='clip'?'clip':'overflow');
    }
    files[path]=strToU8(serializer.serializeToString(doc));
  }
  return zipSync(files);
}
