import json
import os
from PIL import Image, ImageOps
from PIL.ExifTags import TAGS

R2_BASE_URL = "https://photos.sacaarjain.com"
THUMBNAIL_MAX_SIZE = (1000, 1000)
THUMBNAIL_QUALITY = 75

METERING_MODES = {
    0: 'Unknown', 1: 'Average', 2: 'Center-weighted',
    3: 'Spot', 4: 'Multi-spot', 5: 'Pattern', 6: 'Partial'
}

def to_float(val):
    if hasattr(val, 'numerator') and hasattr(val, 'denominator'):
        return val.numerator / val.denominator if val.denominator != 0 else 0
    if isinstance(val, tuple) and len(val) == 2:
        return val[0] / val[1] if val[1] != 0 else 0
    return float(val)

def format_flash(val):
    fired = val & 0x1
    auto_mode = (val >> 3) & 0x3
    parts = ['Flash fired' if fired else 'No flash']
    if auto_mode == 1:
        parts.append('compulsory')
    elif auto_mode == 2:
        parts.append('suppressed')
    elif auto_mode == 3:
        parts.append('auto')
    return ', '.join(parts)

def get_exif_data(imagePath):
    try:
        with Image.open(imagePath) as img:
            raw_exif = img._getexif()
            if not raw_exif:
                return {}

            exif = {TAGS.get(k, k): v for k, v in raw_exif.items()}
            metadata = {}

            if 'Make' in exif:
                metadata['cameraMaker'] = str(exif['Make']).strip()
            if 'Model' in exif:
                metadata['cameraModel'] = str(exif['Model']).strip()
            if 'FNumber' in exif:
                metadata['fStop'] = f"f/{to_float(exif['FNumber']):.1f}"
            if 'ExposureTime' in exif:
                et = to_float(exif['ExposureTime'])
                if 0 < et < 1:
                    metadata['exposureTime'] = f"1/{round(1/et)} sec."
                elif et >= 1:
                    metadata['exposureTime'] = f"{et:.1f} sec."
            if 'ISOSpeedRatings' in exif:
                metadata['iso'] = f"ISO-{exif['ISOSpeedRatings']}"
            if 'ExposureBiasValue' in exif:
                bias = to_float(exif['ExposureBiasValue'])
                metadata['exposureBias'] = f"{bias:+.0f} step" if bias != 0 else "0 step"
            if 'FocalLength' in exif:
                metadata['focalLength'] = f"{to_float(exif['FocalLength']):.0f} mm"
            if 'MaxApertureValue' in exif:
                metadata['maxAperture'] = f"{to_float(exif['MaxApertureValue']):.1f}"
            if 'MeteringMode' in exif:
                metadata['meteringMode'] = METERING_MODES.get(exif['MeteringMode'], str(exif['MeteringMode']))
            if 'SubjectDistance' in exif:
                dist = to_float(exif['SubjectDistance'])
                if dist > 0:
                    metadata['subjectDistance'] = f"{dist:.1f} m"
            if 'Flash' in exif:
                metadata['flashMode'] = format_flash(exif['Flash'])
            if 'FlashEnergy' in exif:
                fe = to_float(exif['FlashEnergy'])
                if fe > 0:
                    metadata['flashEnergy'] = str(fe)
            if 'FocalLengthIn35mmFilm' in exif:
                metadata['focalLength35mm'] = str(exif['FocalLengthIn35mmFilm'])

            return metadata
    except Exception as e:
        print(f"Could not read EXIF from {imagePath}: {e}")
        return {}

def generate_thumbnails_and_json(folderPath, folderName):
    if not os.path.exists(folderPath):
        print(f"The folder path specified {folderPath} does not exist.")
        exit()

    thumbnailFolder = os.path.join(folderPath, 'thumbnails')
    os.makedirs(thumbnailFolder, exist_ok=True)

    imageFiles = sorted([f for f in os.listdir(folderPath) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif'))])
    jsonData = []

    for imageFile in imageFiles:
        imagePath = os.path.join(folderPath, imageFile)
        thumbnailFileName = os.path.splitext(imageFile)[0] + '.webp'
        thumbnailPath = os.path.join(thumbnailFolder, thumbnailFileName)

        # Read EXIF from original before any transforms
        metadata = get_exif_data(imagePath)

        # Generate WebP thumbnail if it doesn't already exist
        if not os.path.exists(thumbnailPath):
            with Image.open(imagePath) as img:
                img = ImageOps.exif_transpose(img)
                exif = img.info.get('exif', b'')
                img.thumbnail(THUMBNAIL_MAX_SIZE)
                if exif:
                    img.save(thumbnailPath, format='WEBP', quality=THUMBNAIL_QUALITY, optimize=True, exif=exif)
                else:
                    img.save(thumbnailPath, format='WEBP', quality=THUMBNAIL_QUALITY, optimize=True)
            print(f"Created thumbnail: {thumbnailPath}")
        else:
            print(f"Thumbnail already exists, skipping: {thumbnailPath}")

        # Build R2 URLs
        fileUrl = f"{R2_BASE_URL}/photographs/{folderName}/{imageFile}"
        thumbnailUrl = f"{R2_BASE_URL}/photographs/{folderName}/thumbnails/{thumbnailFileName}"

        data = {
            "filePath": fileUrl,
            "thumbnailPath": thumbnailUrl,
            "metadata": metadata
        }
        jsonData.append(data)
        print(data)

    outputPath = os.path.join(folderPath, folderName + '.json')
    with open(outputPath, 'w') as json_file:
        json.dump(jsonData, json_file, indent=2)

def main():
    baseDir = "../../data/photographs/"
    folderName = input("Enter the folder where the images are (or /all for all albums): ")

    if folderName == '/all':
        albums = [d for d in os.listdir(baseDir) if os.path.isdir(os.path.join(baseDir, d))]
        for album in sorted(albums):
            print(f"\n── Processing {album} ──")
            generate_thumbnails_and_json(baseDir + album, album)
        print("\nAll albums processed successfully")
    else:
        generate_thumbnails_and_json(baseDir + folderName, folderName)
        print("Thumbnails generated and JSON created successfully")

if __name__ == "__main__":
    main()
