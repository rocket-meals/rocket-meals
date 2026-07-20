#!/bin/bash

# Function to generate base64 encoding of username and password
generate_basic_auth() {
  local username=$1
  local password=$2
  echo -n "$username:$password" | base64
  return 0
}

# Function to update .env file
update_env_file() {
  local basic_auth_value=$1
  if grep -q "BASIC_AUTH=" .env; then
    echo
    read -p ".env file already contains BASIC_AUTH. Do you want to overwrite it? (y/n): " confirm
    if [[ "$confirm" = "y" ]]; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^BASIC_AUTH=.*|BASIC_AUTH=${basic_auth_value}|" .env
      else
        sed -i "s|^BASIC_AUTH=.*|BASIC_AUTH=${basic_auth_value}|" .env
      fi
      echo "BASIC_AUTH value updated in .env file."
    else
      echo "BASIC_AUTH value not updated."
    fi
  else
    echo "BASIC_AUTH=${basic_auth_value}" >> .env
    echo "BASIC_AUTH value added to .env file."
  fi
  return 0
}

# Function to get username
get_username() {
  read -p "Enter username: " username
  echo "$username"
  return 0
}

# Function to get password with confirmation
get_password() {
  while true; do
    # read password plain
    echo "Password will be displayed on the screen. Please make sure no one is around."
    read -p "Enter password: " password
    read -p "Confirm password: " password_confirm

    if [[ "$password" = "$password_confirm" ]]; then
      echo "$password"
      break
    else
      echo "Passwords do not match. Please try again."
    fi
  done
  return 0
}

# Main script
username=$(get_username)
password=$(get_password)

basic_auth=$(generate_basic_auth "$username" "$password")
update_env_file "$username:$basic_auth"

echo "Basic auth generation completed."
