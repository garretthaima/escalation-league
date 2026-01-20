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

# Accept build-time environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_SOCKET_URL
ARG REACT_APP_BACKEND_URL
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_SCRYFALL_USER_AGENT
ARG REACT_APP_ENV=production

ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_SOCKET_URL=${REACT_APP_SOCKET_URL}
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ENV REACT_APP_GOOGLE_CLIENT_ID=${REACT_APP_GOOGLE_CLIENT_ID}
ENV REACT_APP_SCRYFALL_USER_AGENT=${REACT_APP_SCRYFALL_USER_AGENT}
ENV REACT_APP_ENV=${REACT_APP_ENV}

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