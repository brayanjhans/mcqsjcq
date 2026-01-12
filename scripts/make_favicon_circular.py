import os
from PIL import Image, ImageDraw, ImageOps

def make_circular_favicon():
    # Define paths
    base_dir = r"c:\laragon\www\BRAYAN\proyecto_garantias"
    input_path = os.path.join(base_dir, "frontend", "public", "logo-mqs.png")
    output_path = os.path.join(base_dir, "frontend", "public", "favicon-circle.png")

    print(f"Processing: {input_path}")

    try:
        # Open the image
        img = Image.open(input_path).convert("RGBA")
        
        # Create a circular mask
        size = img.size
        mask = Image.new('L', size, 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size[0], size[1]), fill=255)
        
        # Apply the mask
        result = ImageOps.fit(img, mask.size, centering=(0.5, 0.5))
        result.putalpha(mask)
        
        # Save the result
        result.save(output_path, "PNG")
        print(f"Success! Saved to: {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    make_circular_favicon()
