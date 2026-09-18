// 取り込んだ書式は、再書き出しでも標準値に戻さない。
export function chartOptions(format){
 if(!format)return {};
 const f=format,hex=c=>c?.replace('#','');
 return {chartColors:f.colors?.map(hex),showLegend:f.showLegend,showValue:f.showValue,
 valAxisMinVal:f.minimum,valAxisMaxVal:f.maximum,valAxisMajorUnit:f.majorUnit,
 valAxisLabelFormatCode:f.numberFormat,dataLabelFormatCode:f.valueFormat,barGapWidthPct:f.gapWidth,
 catAxisLabelFontFace:f.categoryStyle?.fontFamily,catAxisLabelFontSize:f.categoryStyle?.fontSize,catAxisLabelColor:hex(f.categoryStyle?.color),catAxisLabelFontBold:f.categoryStyle?.bold,
 valAxisLabelFontFace:f.axisStyle?.fontFamily,valAxisLabelFontSize:f.axisStyle?.fontSize,valAxisLabelColor:hex(f.axisStyle?.color),
 dataLabelFontFace:f.labelStyle?.fontFamily,dataLabelFontSize:f.labelStyle?.fontSize,dataLabelColor:hex(f.labelStyle?.color),dataLabelFontBold:f.labelStyle?.bold,dataLabelPosition:'outEnd',
 valGridLine:{color:hex(f.gridColor)||'E2EAF0',width:.75},catAxisMajorTickMark:'none',valAxisMajorTickMark:'none'};
}
