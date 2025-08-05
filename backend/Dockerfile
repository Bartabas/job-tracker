# backend/Dockerfile

# Use an official Node.js runtime as a parent image.
# Using alpine makes the image smaller.
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the working directory.
# This is done as a separate step to leverage Docker's layer caching.
COPY package*.json ./

# Install the project dependencies
RUN npm install

# Copy the rest of the application's source code into the container
COPY . .

# Expose port 3000 to allow communication with other containers and the host
EXPOSE 3000

# The command to run the application when the container starts
CMD ["node", "src/server.js"]
