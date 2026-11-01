import {z} from 'zod';
import {proposalSchema} from './model';
const originSchema=z.object({baseDeckId:z.string().min(1),baseVersion:z.number().int().nonnegative()});
export function parseExternalProposal(input:unknown,current:{deckId:string;version:number},unsaved=false){
 if(unsaved)throw Error('編集中の内容の保存が完了してから、外部の変更案を読み込んでください。');
 const origin=originSchema.safeParse(input);
 if(!origin.success)throw Error('変更案に生成元のデッキID・版番号（baseDeckId・baseVersion）がありません。「現在の内容を渡す」から取得し直し、外部エージェントに変更案を作り直してもらってください。');
 if(origin.data.baseDeckId!==current.deckId)throw Error('別のデッキをもとにした変更案です。このデッキの「現在の内容を渡す」から作り直してください。');
 if(origin.data.baseVersion!==current.version)throw Error('この変更案は現在と異なる版をもとに作られています。最新の編集を守るため読み込めません。「現在の内容を渡す」から取得し直し、外部エージェントに変更案を作り直してもらってください。');
 return proposalSchema.parse(input);
}
