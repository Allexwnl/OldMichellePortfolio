import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import seed from '../content/seed.json' with {type:'json'};
await mkdir('.preview',{recursive:true});
for(const project of seed.projects){
  const layers=[];
  for(const [index,image] of project.images.entries()){
    const input=await sharp(image.src).resize(300,240,{fit:'contain',background:'white'}).toBuffer();
    layers.push({input,left:(index%3)*310,top:Math.floor(index/3)*250});
  }
  await sharp({create:{width:930,height:Math.ceil(project.images.length/3)*250,channels:3,background:'#dadfe7'}}).composite(layers).jpeg({quality:90}).toFile(`.preview/review-${project.id}.jpg`);
}
