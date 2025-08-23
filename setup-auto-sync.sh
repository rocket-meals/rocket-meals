#!/bin/bash

# Backend Auto-Sync Setup Script
# This script helps configure the BACKEND_AUTO_SYNC_MODE environment variable

set -e

echo "🚀 Rocket Meals Backend Auto-Sync Setup"
echo "======================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found in current directory"
    echo "Please run this script from the root of the rocket-meals repository"
    exit 1
fi

# Display current configuration
echo "📋 Current Configuration:"
if grep -q "BACKEND_AUTO_SYNC_MODE" .env; then
    current_value=$(grep "BACKEND_AUTO_SYNC_MODE" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    echo "   BACKEND_AUTO_SYNC_MODE=$current_value"
else
    echo "   BACKEND_AUTO_SYNC_MODE=not set (defaults to 'disabled')"
    current_value="disabled"
fi
echo ""

# Display mode descriptions
echo "📖 Available Modes:"
echo "   disabled - No automatic sync (manual sync only)"
echo "   test     - Test environment mode (limited collection sync)"
echo "   full     - Complete sync for production (all collections)"
echo ""

# Prompt for new mode
echo "🔧 Select new auto-sync mode:"
echo "1) disabled (manual sync only)"
echo "2) test (test environment)"
echo "3) full (production environment)"
echo "4) keep current setting"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        new_mode="disabled"
        ;;
    2)
        new_mode="test"
        ;;
    3)
        new_mode="full"
        ;;
    4)
        echo "✅ Keeping current setting: $current_value"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

# Update .env file
echo ""
echo "🔄 Updating .env file..."

if grep -q "BACKEND_AUTO_SYNC_MODE" .env; then
    # Replace existing value
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/BACKEND_AUTO_SYNC_MODE=.*/BACKEND_AUTO_SYNC_MODE=\"$new_mode\"/" .env
    else
        # Linux
        sed -i "s/BACKEND_AUTO_SYNC_MODE=.*/BACKEND_AUTO_SYNC_MODE=\"$new_mode\"/" .env
    fi
else
    # Add new value
    echo "" >> .env
    echo "# Backend Auto-Sync Configuration" >> .env
    echo "BACKEND_AUTO_SYNC_MODE=\"$new_mode\"" >> .env
fi

echo "✅ Configuration updated!"
echo "   BACKEND_AUTO_SYNC_MODE=$new_mode"
echo ""

# Display next steps based on mode
case $new_mode in
    "disabled")
        echo "📝 Next Steps:"
        echo "   - Use manual sync scripts: apps/backend/sync/pull.sh or push.sh"
        echo "   - Backend will NOT automatically sync collections on startup"
        ;;
    "test")
        echo "📝 Next Steps:"
        echo "   - Backend will perform limited collection cleanup on startup"
        echo "   - Schema sync is skipped to avoid test environment conflicts"
        echo "   - Manual sync available if needed"
        ;;
    "full")
        echo "📝 Next Steps:"
        echo "   - Backend will automatically sync all collections on startup"
        echo "   - Ensure ADMIN_EMAIL and ADMIN_PASSWORD are correctly set in .env"
        echo "   - Monitor logs for sync completion during backend startup"
        echo ""
        echo "⚠️  Production Deployment Notes:"
        echo "   - Database must be accessible during startup"
        echo "   - Sync process adds ~30-60 seconds to startup time"
        echo "   - Failed sync does not prevent backend from starting"
        ;;
esac

echo ""
echo "🎉 Setup complete! Restart the backend to apply changes."