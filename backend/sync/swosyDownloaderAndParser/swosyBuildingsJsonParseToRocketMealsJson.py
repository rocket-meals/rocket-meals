import json
import sys

def parse_swosy_to_rocket_meals(swosy_data):
    rocket_meals_data = []
    for building in swosy_data:
        new_building = {
            "status": "draft",
            "sort": None,
            "user_updated": None,
            "date_updated": None,
            "alias": building.get("name"),
            "external_identifier": building.get("short"),
            "url": None,
            "image": None,
            "image_remote_url": None,
            "image_thumb_hash": None,
            "date_of_construction": None,
            "coordinates": {
                "coordinates": [
                    building.get("longitude"),
                    building.get("latitude")
                ],
                "type": "Point"
            },
            "apartments": [],
            "translations": [],
            "businesshours": []
        }

        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

        for day in days:
            if building.get(f"opening_time_{day}") and building.get(f"closing_time_{day}"):
                businesshours_entry = {
                    "businesshours_id": {
                        "time_start": building.get(f"opening_time_{day}"),
                        "time_end": building.get(f"closing_time_{day}"),
                        "date_valid_from": None,
                        "date_valid_till": None
                    }
                }
                for d in days:
                    businesshours_entry["businesshours_id"][d] = (d == day)

                new_building["businesshours"].append(businesshours_entry)

        rocket_meals_data.append(new_building)

    return rocket_meals_data

def main(file_path):
    with open(file_path, 'r') as f:
        swosy_data = json.load(f)

    rocket_meals_data = parse_swosy_to_rocket_meals(swosy_data)

    output_file_path = "swosy_parsed_buildings_json_for_rocket_meals_json.json"
    with open(output_file_path, 'w') as f:
        json.dump(rocket_meals_data, f, indent=4)

    print(f"Parsed data has been saved to {output_file_path}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 script.py path_to_swosy_json")
    else:
        main(sys.argv[1])
