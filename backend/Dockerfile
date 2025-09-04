# Start from a Node.js base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
# This step is cached, so npm install only runs if these files change
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application's source code
# The .dockerignore file will prevent node_modules from being copied
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Define the command to run your application
CMD [ "npm", "start" ]