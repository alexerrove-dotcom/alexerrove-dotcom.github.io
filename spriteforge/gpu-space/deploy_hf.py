"""Deploy SpriteForge GPU Space from GitHub Actions using HF_TOKEN secret.

Works with a FREE Hugging Face account by creating a Static Space first.
Once a Community GPU Grant is allocated/selected, re-run workflow; it
switches the Space to Gradio and uploads the actual GPU app.
"""
import os
import shutil
import tempfile
from pathlib import Path

from huggingface_hub import HfApi

SOURCE=Path(__file__).resolve().parent

def main():
    token=os.environ.get("HF_TOKEN","").strip()
    if not token:
        print("HF_TOKEN GitHub secret is not set. Skipping. Set it yourself in GitHub Settings -> Secrets and variables -> Actions.")
        return
    api=HfApi(token=token)
    account=api.whoami()
    owner=account["name"]
    repo_id=f"{owner}/spriteforge-gpu"
    print("Preparing Space",repo_id)
    api.create_repo(repo_id=repo_id,repo_type="space",space_sdk="static",exist_ok=True)
    runtime=api.get_space_runtime(repo_id=repo_id)
    hardware=str(runtime.hardware or "cpu-basic").lower()
    has_dedicated_gpu=any(word in hardware for word in ("t4","l4","l40","a10g","a100","h100","h200","rtx","b200"))
    print("Hardware:",hardware,"GPU:",has_dedicated_gpu)
    with tempfile.TemporaryDirectory() as folder:
        work=Path(folder)
        for name in ("app.py","core.py","requirements.txt","GPU_GRANT_REQUEST.md",
                     "PHONE_DEPLOY.md","index.html"):
            shutil.copy2(SOURCE/name,work/name)
        selected="README.md" if has_dedicated_gpu else "README_STATIC.md"
        shutil.copy2(SOURCE/selected,work/"README.md")
        api.upload_folder(folder_path=work,repo_id=repo_id,repo_type="space",
                          commit_message="Deploy SpriteForge GPU Space ("+("gradio" if has_dedicated_gpu else "grant staging")+")")
    print("Space URL: https://huggingface.co/spaces/"+repo_id)
    if not has_dedicated_gpu:
        print("Static staging created. Submit Community GPU Grant in your Space Settings -> Hardware.")
        print("Once the GPU is allocated and selected, re-run this workflow to activate the Gradio backend.")

if __name__=="__main__":
    main()
