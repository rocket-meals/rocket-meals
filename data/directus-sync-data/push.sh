# Pushes the schema to the server
echo "Pushing schema to backend"  &&

# run npm ci to install dependencies
echo "Installing dependencies"  &&
npm ci &&

echo "Start pushing schema to backend"  &&
node importSchema.js push