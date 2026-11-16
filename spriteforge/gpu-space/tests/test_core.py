"""CPU-only tests: no HF key, model download, GPU or paid service required."""
from pathlib import Path
from PIL import Image,ImageDraw
from core import ACTIONS,pose_guide,landmarks,prompt_character,frame_instruction,export_animation
import zipfile

def test_pose():
    for action in ACTIONS:
        for frame in range(8):
            pic=pose_guide(action,frame)
            assert pic.size==(576,768)
        if action in ("Ходьба","Бег","Прыжок"):
            assert landmarks(action,0)!=landmarks(action,2)
def test_prompts():
    assert "Full body" in prompt_character("Man in jacket and jeans","Рисованный мультфильм")
    assert "IMAGE 1" in frame_instruction("man in jacket","Аниме","Ходьба",2)
def test_export():
    frames=[]
    for n in range(8):
        im=Image.new("RGB",(512,768),"white")
        ImageDraw.Draw(im).rectangle((160+n,60,350+n,700),fill="#6d7a9a")
        frames.append(im)
    sheet,png,zipfile_path=export_animation(frames,"Ходьба")
    assert sheet.size==(1536,768)
    assert Path(png).is_file() and Path(zipfile_path).is_file()
    with zipfile.ZipFile(zipfile_path) as f:
        assert "atlas.json" in f.namelist()
        assert len([v for v in f.namelist() if v.startswith("frames/")])==8

if __name__=="__main__":
    test_pose()
    test_prompts()
    test_export()
    print("All SpriteForge CPU/atlas tests passed.")
