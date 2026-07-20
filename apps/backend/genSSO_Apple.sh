#!/bin/bash

# Function to display help message
function show_help() {
    echo "Usage: ./genSSO_Apple.sh --team_id <team_id> --client_id <client_id> --key_id <key_id> --key_file_path <path_to_key_file>"
    echo "or:    ./genSSO_Apple.sh --team_id <team_id> --client_id <client_id> --key_id <key_id> --key_file_content '<key_file_content>'"
    return 0
}

# Initialize variables for parameters
TEAM_ID=""
CLIENT_ID=""
KEY_ID=""
KEY_FILE_PATH=""
KEY_FILE_CONTENT=""

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --team_id)
            TEAM_ID="$2"
            shift
            shift
            ;;
        --client_id)
            CLIENT_ID="$2"
            shift
            shift
            ;;
        --key_id)
            KEY_ID="$2"
            shift
            shift
            ;;
        --key_file_path)
            KEY_FILE_PATH="$2"
            shift
            shift
            ;;
        --key_file_content)
            KEY_FILE_CONTENT="$2"
            shift
            shift
            ;;
        *)
            echo "Invalid option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate required parameters
MISSING_PARAMETERS=()

if [[ -z "$TEAM_ID" ]]; then
    MISSING_PARAMETERS+=("team_id")
fi

if [[ -z "$CLIENT_ID" ]]; then
    MISSING_PARAMETERS+=("client_id")
fi

if [[ -z "$KEY_ID" ]]; then
    MISSING_PARAMETERS+=("key_id")
fi

if [[ -z "$KEY_FILE_PATH" && -z "$KEY_FILE_CONTENT" ]]; then
    MISSING_PARAMETERS+=("key_file_path or key_file_content")
fi

if [[ ${#MISSING_PARAMETERS[@]} -gt 0 ]]; then
    echo "Missing required parameters: ${MISSING_PARAMETERS[*]}"
    show_help
    exit 1
fi

# Read the EC key
if [[ -n "$KEY_FILE_PATH" ]]; then
    if [[ ! -f "$KEY_FILE_PATH" ]]; then
        echo "Error: Key file '$KEY_FILE_PATH' not found." >&2
        exit 1
    fi
    ECDSA_KEY=$(cat "$KEY_FILE_PATH")
else
    # Safely handle multiline key content
    ECDSA_KEY="$KEY_FILE_CONTENT"
fi

# Generate current time and expiration time
CURRENT_TIME=$(date +%s)
# Set debug current time
#CURRENT_TIME=1600000000

EXPIRATION_TIME=$((CURRENT_TIME + 86400*180))

# Create JWT headers
HEADER=$(printf '{"kid":"%s","alg":"ES256"}' "$KEY_ID")

# Create JWT claims
CLAIMS=$(printf '{"iss":"%s","iat":%d,"exp":%d,"aud":"https://appleid.apple.com","sub":"%s"}' \
    "$TEAM_ID" "$CURRENT_TIME" "$EXPIRATION_TIME" "$CLIENT_ID")

# Base64 URL encode function
base64_url_encode() {
    openssl enc -base64 -A | tr '+/' '-_' | tr -d '='
    return 0
}

# Create JWT token
JWT_HEADER_BASE64=$(echo -n "$HEADER" | base64_url_encode)
JWT_CLAIMS_BASE64=$(echo -n "$CLAIMS" | base64_url_encode)





#SIGNATURE=$(echo -n "${JWT_HEADER_BASE64}.${JWT_CLAIMS_BASE64}" | \
#    openssl dgst -sha256 -sign <(echo "$ECDSA_KEY") | \
#    openssl enc -base64 -A | tr '+/' '-_' | tr -d '=')
# This signature does not work, as it is too long

# Solution from https://stackoverflow.com/questions/77844941/bash-script-to-create-and-sign-a-es256-jwt-token
# https://github.com/smallstep/cli/blob/master/integration/openssl-jwt.sh#L20C1-L27C2
function convert_ec {
    INPUT=$(openssl asn1parse -inform der)
    R=$(echo "$INPUT" | head -2 | tail -1 | cut -d':' -f4)
    S=$(echo "$INPUT" | head -3 | tail -1 | cut -d':' -f4)

    echo -n $R | xxd -r -p
    echo -n $S | xxd -r -p
    return 0
}
SIGNATURE=$(echo -n "$JWT_HEADER_BASE64.$JWT_CLAIMS_BASE64" | openssl dgst -binary -sha256 -sign <(echo "$ECDSA_KEY") | convert_ec | openssl base64 -e -A | tr '+/' '-_' | tr -d '\n=')



# Output the JWT token
TOKEN="${JWT_HEADER_BASE64}.${JWT_CLAIMS_BASE64}.${SIGNATURE}"
echo "$TOKEN"