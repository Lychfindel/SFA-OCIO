FROM nginx:alpine

# Copy the static site into the nginx web root
# COPY . /usr/share/nginx/html

# Optional: custom nginx config for clean URLs
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
