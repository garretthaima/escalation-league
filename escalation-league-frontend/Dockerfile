# Use an official Node.js image to build the app
FROM node:18-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app and build it
COPY . .
RUN npm run build

# Use an official Nginx image to serve the app
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]