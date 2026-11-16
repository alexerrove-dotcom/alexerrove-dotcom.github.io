"""SpriteForge GPU pure-Pillow pose guides, stable frame alignment and exports.

This package never pretends crops from one picture are AI keyframes:
export_animation requires a list of eight independently created images.
"""
import json
import math
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw

ACTIONS=("Ожидание","Ходьба","Бег","Прыжок","Атака","Смерть")
ACTION_NAMES=dict(zip(ACTIONS,("idle","walk","run","jump","attack","death")))
STYLES={
 "Рисованный мультфильм":"premium clean hand-drawn 2D animated character, warm soft painted shading, expressive detailed face",
 "Реалистичный":"believable realistic video game character, natural skin and fabric materials",
 "Аниме":"elegant anime 2D game character, clean cel shading, appealing contours",
 "Пиксель-арт":"professional retro video game character pixel art with deliberate pixel clusters"
}

def prompt_character(description,style):
    description=" ".join(str(description or "").split())
    if not 4<=len(description)<=800:raise ValueError("Описание должно содержать от 4 до 800 символов")
    look=STYLES.get(style,STYLES["Рисованный мультфильм"])
    return (f"ONE single character, {description}, {look}. Full body head to toe, "
     "hands and both shoes completely visible, standing pose, centered in the canvas, "
     "15 percent headroom and floor margin, plain almost-white background, no scenery, no duplicate character.")

def landmarks(action,index):
    if action not in ACTIONS:raise ValueError("Неизвестная анимация")
    t=2*math.pi*(index%8)/8
    wave=math.sin(t);phase=index/7
    strength={"Ожидание":.01,"Ходьба":.12,"Бег":.21,"Прыжок":.09,"Атака":.04,"Смерть":.07}[action]
    stride=strength*wave
    lift=max(0,math.sin(phase*math.pi)) if action=="Прыжок" else 0
    y=-.22*lift
    x=.5
    neck=(x,.26+y);head=(x,.18+y);shoulderL=(x-.09,.32+y);shoulderR=(x+.09,.32+y)
    hip=(x,.55+y);chest=(x,.35+y)
    ankleL=(x-.09-stride,.91+y-max(0,wave)*.06)
    ankleR=(x+.09+stride,.91+y-max(0,-wave)*.06)
    kneeL=((hip[0]+ankleL[0])/2-.03,(hip[1]+ankleL[1])/2)
    kneeR=((hip[0]+ankleR[0])/2+.03,(hip[1]+ankleR[1])/2)
    handL=(shoulderL[0]+stride,.53+y)
    handR=(shoulderR[0]-stride,.53+y)
    if action=="Прыжок":
        handL=(.27,.20+y);handR=(.73,.20+y)
    elif action=="Атака":
        handR=(.8,.3+y);ankleR=(ankleR[0]+.08,ankleR[1])
    elif action=="Смерть":
        head=(head[0]+.25*phase,head[1]+.13*phase)
        chest=(chest[0]+.15*phase,chest[1]+.08*phase)
    elbowL=((shoulderL[0]+handL[0])*.5-.02,(shoulderL[1]+handL[1])*.5)
    elbowR=((shoulderR[0]+handR[0])*.5+.02,(shoulderR[1]+handR[1])*.5)
    return dict(head=head,neck=neck,chest=chest,hip=hip,
       shoulderL=shoulderL,shoulderR=shoulderR,elbowL=elbowL,elbowR=elbowR,
       handL=handL,handR=handR,kneeL=kneeL,kneeR=kneeR,footL=ankleL,footR=ankleR)

def pose_guide(action,index,size=(576,768)):
    """Image 2: colored stick figure; never presented as finished frame."""
    w,h=size
    im=Image.new("RGB",size,(249,249,249))
    d=ImageDraw.Draw(im);v=landmarks(action,index)
    xy=lambda k:(round(v[k][0]*w),round(v[k][1]*h))
    bones=[
       ("head","neck","#ce955c"),("neck","chest","#ce955c"),("chest","hip","#d78a52"),
       ("shoulderL","elbowL","#4a98ae"),("elbowL","handL","#4a98ae"),
       ("shoulderR","elbowR","#b675af"),("elbowR","handR","#b675af"),
       ("hip","kneeL","#59a588"),("kneeL","footL","#59a588"),
       ("hip","kneeR","#d3b066"),("kneeR","footR","#d3b066")]
    for a,b,c in bones:d.line([xy(a),xy(b)],fill=c,width=12,joint="curve")
    for k in v:
        x,y=xy(k);d.ellipse((x-8,y-8,x+8,y+8),fill=(62,64,66))
    return im

def frame_instruction(description,style,action,index):
    return (f"Reference IMAGE 1 defines ONE exact character: {description}. "
      "IMAGE 2 is ONLY a colored pose guide, not part of the final output. "
      f"Create animation frame {index+1} of 8 for {ACTION_NAMES[action]}, "
      "a newly drawn full-body character with precisely the same hair, face, "
      "eyes, clothing, shoes, proportions, and art style as reference 1. "
      "Move the limbs to match reference 2. Right-facing profile, studio white backdrop. "
      "No extra person, no stick figure, no crop, no text, no grid or sheet.")

def _bounds(image):
    thumb=image.convert("RGB").resize((144,192)); pix=thumb.load()
    hits=[]
    for y in range(4,188,2):
        for x in range(4,140,2):
            p=pix[x,y]
            if min(p)<180 and (max(p)-min(p)>15 or min(p)<132):hits.append((x,y))
    if not hits:return (0,0,image.width,image.height)
    xl=min(p[0] for p in hits);yt=min(p[1] for p in hits)
    xr=max(p[0] for p in hits);yb=max(p[1] for p in hits)
    return (int(xl*image.width/144),int(yt*image.height/192),
            min(image.width,int((xr+2)*image.width/144)),
            min(image.height,int((yb+2)*image.height/192)))

def normalize_frames(images,cell=384):
    """Preserves one global scale across all eight independently AI-drawn images."""
    if not images:raise ValueError("Нужны изображения кадров")
    bounds=[_bounds(im) for im in images]
    scale=min(cell*.84/max(1,max(b[2]-b[0] for b in bounds)),
              cell*.90/max(1,max(b[3]-b[1] for b in bounds)))
    out=[]
    for im,b in zip(images,bounds):
        piece=im.convert("RGBA").crop(b)
        w=max(1,round(piece.width*scale));h=max(1,round(piece.height*scale))
        piece=piece.resize((w,h),Image.Resampling.LANCZOS)
        frame=Image.new("RGBA",(cell,cell),(0,0,0,0))
        frame.paste(piece,((cell-w)//2,cell-h-9),piece)
        out.append(frame)
    return out

def export_animation(images,action):
    if len(images)!=8:raise ValueError("Нужно ровно 8 отдельно сгенерированных кадров")
    if action not in ACTIONS:raise ValueError("Неизвестная анимация")
    frames=normalize_frames(images)
    sheet=Image.new("RGBA",(1536,768),(0,0,0,0))
    prefix=ACTION_NAMES[action]
    for i,frame in enumerate(frames):
        sheet.alpha_composite(frame,((i%4)*384,(i//4)*384))
    folder=Path(tempfile.mkdtemp(prefix="spriteforge_"))
    png=folder/f"{prefix}_spritesheet.png"
    zippath=folder/f"{prefix}_frames.zip"
    gif=folder/f"{prefix}.gif"
    sheet.save(png)
    frames[0].save(gif,save_all=True,append_images=frames[1:],duration=135,loop=0)
    atlas=dict(action=prefix,columns=4,rows=2,frame_size=384,duration_ms=135,
       frames=[f"{prefix}_{i:02d}.png" for i in range(8)],
       method="independent neural renders with image references")
    with zipfile.ZipFile(zippath,"w",zipfile.ZIP_DEFLATED) as archive:
        archive.write(png,arcname=png.name)
        archive.write(gif,arcname=gif.name)
        archive.writestr("atlas.json",json.dumps(atlas,ensure_ascii=False,indent=2))
        for i,image in enumerate(frames):
            buf=BytesIO();image.save(buf,format="PNG")
            archive.writestr(f"frames/{prefix}_{i:02d}.png",buf.getvalue())
    return sheet,str(png),str(zippath)
