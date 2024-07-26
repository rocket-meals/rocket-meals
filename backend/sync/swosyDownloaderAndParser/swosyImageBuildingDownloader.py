import os
import requests
from urllib.parse import urlparse
from datetime import datetime
import re

# Function to strip trailing slash from URL
def strip_url(url):
    return url.rstrip('/')

# Function to get hostname from URL
def get_hostname(url):
    parsed_url = urlparse(url)
    return parsed_url.hostname

# Function to create directory structure
def create_directory_structure(hostname):
    base_path = os.path.join(os.getcwd(), hostname)
    images_path = os.path.join(base_path, 'images', 'buildings')
    os.makedirs(images_path, exist_ok=True)
    return images_path

# Function to format time in HH:MM
def format_time(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    return f"{int(hours):02}:{int(minutes):02}"

# Function to sanitize filename
def sanitize_filename(name):
    # Remove special characters
    return re.sub(r'[^a-zA-Z0-9_-]', '', name)

# Function to download building images
def download_building_images(api_url, images_path):
    buildings_url = f"{api_url}/buildings/"
    response = requests.get(buildings_url)
    response.raise_for_status()
    buildings = response.json()

    total_buildings = len(buildings)
    start_time = datetime.now()

    for idx, building in enumerate(buildings, start=1):
        building_short = building['short']
        building_name = sanitize_filename(building['name'])
        photo_url = f"{api_url}/buildings/{building['id']}/photos?resTag=original&webp=false"

        try:
            photo_response = requests.get(photo_url)
            photo_response.raise_for_status()

            photo_path = os.path.join(images_path, f"{building_short}_{building_name}.jpg")
            with open(photo_path, 'wb') as photo_file:
                photo_file.write(photo_response.content)

            status = "OK"
        except requests.exceptions.RequestException:
            status = "Not found"

        elapsed_time = (datetime.now() - start_time).total_seconds()
        estimated_total_time = (elapsed_time / idx) * total_buildings
        remaining_time = estimated_total_time - elapsed_time

        print(f"\r{idx}/{total_buildings} - passed time: {format_time(elapsed_time)} / est. finished in: {format_time(remaining_time)} - current building: {building_short} - image download status: {status}", end='')

    print()  # Move to the next line after completing the loop

def main():
    # Ask the user to choose an API URL
    print("Please select the API URL:")
    print("1: https://app.stwh.customer.ingenit.com//api")
    print("2: https://swosy.sw-os.de:3001/api")
    choice = input("Enter the number of your choice: ")

    if choice == '1':
        api_url = "https://app.stwh.customer.ingenit.com//api"
    elif choice == '2':
        api_url = "https://swosy.sw-os.de:3001/api"
    else:
        print("Invalid choice. Exiting.")
        return

    api_url = strip_url(api_url)
    hostname = get_hostname(api_url)
    images_path = create_directory_structure(hostname)
    download_building_images(api_url, images_path)

if __name__ == "__main__":
    main()
