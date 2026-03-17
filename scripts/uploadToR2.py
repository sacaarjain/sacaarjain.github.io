import argparse
import boto3
import os
import mimetypes
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# ── R2 Credentials (loaded from .env) ───────────────────────────────────────
R2_ACCOUNT_ID    = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_KEY    = os.getenv("R2_SECRET_KEY")
R2_BUCKET_NAME   = "sacaarjain-photos"
R2_ENDPOINT      = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# ── Local folder to upload ───────────────────────────────────────────────────
PHOTOGRAPHS_DIR = "../../data/photographs"

# ────────────────────────────────────────────────────────────────────────────

s3 = boto3.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_KEY,
    region_name="auto",
)

def file_exists_in_r2(key):
    try:
        s3.head_object(Bucket=R2_BUCKET_NAME, Key=key)
        return True
    except ClientError:
        return False

def upload_folder(local_dir, r2_prefix, replace=False, json_only=False):
    uploaded = 0
    skipped = 0

    for root, _, files in os.walk(local_dir):
        for filename in files:
            if json_only and not filename.lower().endswith('.json'):
                continue

            local_path = os.path.join(root, filename)
            relative_path = os.path.relpath(local_path, local_dir)
            r2_key = f"{r2_prefix}/{relative_path}".replace("\\", "/")

            if not replace and file_exists_in_r2(r2_key):
                print(f"Skipping (already exists): {r2_key}")
                skipped += 1
                continue

            content_type, _ = mimetypes.guess_type(local_path)
            content_type = content_type or "application/octet-stream"

            if replace and file_exists_in_r2(r2_key):
                print(f"Replacing: {r2_key}")
            else:
                print(f"Uploading: {r2_key}")

            s3.upload_file(
                local_path,
                R2_BUCKET_NAME,
                r2_key,
                ExtraArgs={"ContentType": content_type}
            )
            uploaded += 1

    return uploaded, skipped

def main():
    parser = argparse.ArgumentParser(description="Upload photographs to Cloudflare R2")
    parser.add_argument('-r', '--replace', action='store_true', help='Replace existing files instead of skipping them')
    parser.add_argument('-j', '--json-only', action='store_true', help='Only upload .json files')
    args = parser.parse_args()

    if not os.path.exists(PHOTOGRAPHS_DIR):
        print(f"Photographs directory not found: {PHOTOGRAPHS_DIR}")
        print("Update PHOTOGRAPHS_DIR to point to your local photographs folder.")
        return

    print(f"Uploading from: {PHOTOGRAPHS_DIR}")
    print(f"Destination: r2://{R2_BUCKET_NAME}/photographs")
    if args.replace:
        print("Mode: replace existing files")
    if args.json_only:
        print("Mode: JSON files only")
    print()

    uploaded, skipped = upload_folder(PHOTOGRAPHS_DIR, "photographs", replace=args.replace, json_only=args.json_only)

    print(f"\nDone! Uploaded: {uploaded} files, Skipped: {skipped} files")

if __name__ == "__main__":
    main()
