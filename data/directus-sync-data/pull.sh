echo "Pulling schema from backend" &&

# run npm ci to install dependencies
echo "Installing dependencies" &&
npm ci &&

echo "Start pulling schema from backend" &&
node importSchema.js pull