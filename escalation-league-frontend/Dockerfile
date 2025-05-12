# Use an official Node.js image to build the app
FROM node:18-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Use an official Nginx image to serve the app
FROM nginx:stable-alpine

# Copy the contents of the build directory to the Nginx HTML directory
COPY --from=build /app/build/ /usr/share/nginx/html/

# Copy the custom Nginx configuration to the final stage
COPY nginx/nginx.frontend.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]