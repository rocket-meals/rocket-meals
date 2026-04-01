#!/bin/bash

# Function to check if ImageMagick is installed
check_imagemagick() {
    if ! command -v convert &> /dev/null; then
        echo "ImageMagick could not be found."
        read -p "Do you want to install ImageMagick? (y/n): " install_choice

        if [[ "$install_choice" == "y" || "$install_choice" == "Y" ]]; then
            install_imagemagick
        else
            echo "ImageMagick is required to run this script. Exiting."
            exit 1
        fi
    fi
}

# Function to install ImageMagick
install_imagemagick() {
    OS=$(uname)

    if [[ "$OS" == "Linux" ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y imagemagick
        elif command -v yum &> /dev/null; then
            sudo yum install -y imagemagick
        else
            echo "Unsupported Linux distribution. Please install ImageMagick manually."
            exit 1
        fi
    elif [[ "$OS" == "Darwin" ]]; then
        if command -v brew &> /dev/null; then
            brew install imagemagick
        else
            echo "Homebrew is not installed. Please install Homebrew or ImageMagick manually."
            exit 1
        fi
    else
        echo "Unsupported operating system. Please install ImageMagick manually."
        exit 1
    fi
}

# Function to print usage help
print_usage() {
    echo "Usage: $0 <path_to_icon> <path_to_company_logo> [output_folder]"
    echo "       $0 <path_to_icon> <path_to_company_logo> --project-dir <project_dir>"
    echo ""
    echo "  <path_to_icon>         Path to the icon file"
    echo "  <path_to_company_logo> Path to the company logo file"
    echo "  [output_folder]        Optional: Path to the output folder. Default is ./app/assets/images/"
    echo "  --project-dir <dir>    Optional: Path to the project directory. Output folder will be <dir>/assets/"
}

# Define default output folder
DEFAULT_OUTPUT_FOLDER="./app/assets/images/"
OUTPUT_FOLDER="$DEFAULT_OUTPUT_FOLDER"

# Define image sizes
ADAPTIVE_ICON_SIZE="1024x1024"
FAVICON_SIZE="48x48"
ICON_SIZE="1024x1024"
NOTIFICATION_ICON_SIZE="200x200"
SPLASH_SIZE="1155x2500"

# Function to calculate splash logo width dynamically
calculate_splash_logo_width() {
    local splash_width=$(echo $SPLASH_SIZE | cut -dx -f1)
    SPLASH_LOGO_WIDTH=$(echo "$splash_width * 0.9" | bc)
}

generate_splash_icon() {
    local splash_icon_size="1024x1024"
    local splash_icon_path="$OUTPUT_FOLDER/splash-icon.png"

    # Resize company.png to fit within 90% of splash icon size (921px max)
    # -shave 1x1 removes 1 pixel from each edge before resize to avoid black border
    # artifacts caused by ImageMagick anti-aliasing edge pixels against a black virtual border.
    #
    # -colorspace sRGB ensures the output is in sRGB color space (not Grayscale),
    # which prevents rendering issues on some native platforms that don't properly
    # handle Grayscale+Alpha PNGs.
    #
    # -fuzz 5% -transparent white removes near-white background pixels from the source
    # image. This handles logos that were exported with a white background (e.g. from
    # design tools like Illustrator or Figma). Without this step, a solid white rectangle
    # behind the logo would produce a visible grey border on the splash screen: when the
    # native renderer scales/anti-aliases the image the edges of the opaque white rectangle
    # bleed into adjacent transparent pixels and appear grey over the white splash background.
    #
    # -background "rgba(255,255,255,0)" uses white-transparent instead of
    # -background none (which is rgba(0,0,0,0) = black-transparent). This prevents
    # black fringe artifacts: when the native splash screen renderer scales/anti-aliases
    # the image, transparent pixel colors bleed into the edges. Using white-transparent
    # ensures the bleed is invisible on the white (#ffffff) splash background.
    #
    # PNG32: prefix forces RGBA output format regardless of input color type.
    local icon_max_size=921
    convert "$OUTPUT_FOLDER/company.png" -colorspace sRGB \
        -fuzz 5% -transparent white \
        -shave 1x1 -resize ${icon_max_size}x${icon_max_size} \
        -gravity center -background "rgba(255,255,255,0)" -extent $splash_icon_size \
        PNG32:"$splash_icon_path"

    # Also generate splash.png (used by expo-splash-screen)
    cp "$splash_icon_path" "$OUTPUT_FOLDER/splash.png"
}

generate_adaptive_icon() {
    local icon_path=$1
    local output_path="$OUTPUT_FOLDER/adaptive-icon.png"

    # Berechne Zielgröße für das Icon: 1024 * 0.84 = ca. 860px (um etwas Abstand zu lassen)
    # 680 # aka 66% von 1024
    local icon_size=$(echo "1024 / 100 * 69" | bc)

    convert "$icon_path" -resize ${icon_size}x${icon_size} \
        -gravity center -background none -extent $ADAPTIVE_ICON_SIZE "$output_path"
}

generate_adaptive_icon_background() {
    local output_path="$OUTPUT_FOLDER/adaptive-icon-background.png"

    # Erzeuge weißes (nicht transparentes) Bild
    convert -size $ADAPTIVE_ICON_SIZE xc:white "$output_path"
}

# Function to compute SHA-256 hash of a file
compute_file_hash() {
    local file_path=$1
    if command -v sha256sum &> /dev/null; then
        sha256sum "$file_path" | cut -d' ' -f1
    elif command -v shasum &> /dev/null; then
        shasum -a 256 "$file_path" | cut -d' ' -f1
    else
        echo "ERROR: No SHA-256 hash tool found" >&2
        exit 1
    fi
}

# Function to write hash JSON file for source tracking
write_hash_file() {
    local icon_path=$1
    local logo_path=$2
    local hash_file="$OUTPUT_FOLDER/icons_hash.json"

    local icon_hash
    icon_hash=$(compute_file_hash "$icon_path")
    local logo_hash
    logo_hash=$(compute_file_hash "$logo_path")
    local generated_at
    generated_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > "$hash_file" << EOF
{
    "icon_source_hash": "${icon_hash}",
    "company_logo_hash": "${logo_hash}",
    "generated_at": "${generated_at}"
}
EOF

    echo "Hash file written to $hash_file"
}

# Function to generate images
generate_images() {
    local icon_path=$1
    local logo_path=$2

    # Ensure the output folder exists
    mkdir -p "$OUTPUT_FOLDER"

    # Generate favicon.png
    convert "$icon_path" -resize $FAVICON_SIZE "$OUTPUT_FOLDER/favicon.png"

    # Generate icon.png
    convert "$icon_path" -resize $ICON_SIZE "$OUTPUT_FOLDER/icon.png"

    # Generate notification-icon.png
    convert "$icon_path" -resize $NOTIFICATION_ICON_SIZE "$OUTPUT_FOLDER/notification-icon.png"

    # Generate company.png with transparent background.
    # Apply the same white-background removal as for splash-icon.png so that the
    # logo renders cleanly in React Native Image components (ExpoUpdateLoader,
    # font-loading screen) regardless of the container background color.
    # Without this, a white-background PNG shown with resizeMode="contain" in a
    # container whose own background is white still shows a grey/dark fringe on
    # certain Android devices because the bilinear filter bleeds the opaque white
    # rectangle edge into the adjacent transparent region.
    convert "$logo_path" -colorspace sRGB \
        -fuzz 5% -transparent white \
        PNG32:"$OUTPUT_FOLDER/company.png"

    generate_adaptive_icon "$icon_path"
    generate_adaptive_icon_background

    # Generate splash-icon.png and splash.png
    generate_splash_icon

    # Write hash file for source tracking
    write_hash_file "$icon_path" "$logo_path"
}

# Main script execution
if [[ $# -lt 2 ]]; then
    echo "Error: Missing required arguments."
    print_usage
    exit 1
fi

ICON_PATH=$1
LOGO_PATH=$2

# Parse optional arguments
shift 2
while [[ $# -gt 0 ]]; do
    case "$1" in
        --project-dir)
            if [[ -z "$2" ]]; then
                echo "Error: --project-dir requires a directory argument."
                print_usage
                exit 1
            fi
            OUTPUT_FOLDER="$2/assets/"
            shift 2
            ;;
        *)
            OUTPUT_FOLDER=$1
            shift
            ;;
    esac
done

check_imagemagick
generate_images "$ICON_PATH" "$LOGO_PATH"

echo "Image generation completed. Files are saved in $OUTPUT_FOLDER"
