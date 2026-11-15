"""CPU smoke test, no AI weights downloaded."""
import base64
import io
import unittest
from PIL import Image
from app import Request, generate_sync, directions

class SpriteForgeTest(unittest.TestCase):
    def test_directions(self):
        self.assertEqual(len(directions("all8")), 8)
    def test_export(self):
        result=generate_sync(Request(prompt="Рыжий лис с рогаткой",engine="demo",action="run",size=32,frames=6,facing="all4"))
        self.assertEqual((result["frames"],result["cell_size"],result["directions"]),(6,32,4))
        kind,raw=result["sheet"].split(",",1)
        im=Image.open(io.BytesIO(base64.b64decode(raw)))
        self.assertEqual(im.size,(6*32,4*32))
        self.assertTrue(result["gif"].startswith("data:image/gif;base64,"))
        self.assertTrue(result["zip"].startswith("data:application/zip;base64,"))

if __name__=="__main__":
    unittest.main()
