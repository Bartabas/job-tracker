# frontend/Dockerfile

# Use the official Nginx image from Docker Hub
FROM nginx:1.21-alpine

# Remove the default Nginx configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d

# Copy the static website files (HTML, CSS, JS) to the default Nginx public directory
COPY . /usr/share/nginx/html
