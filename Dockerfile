# Step 1: Build the Angular app
FROM node:alpine AS build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./ 
RUN npm install --force
RUN npm install -g @angular/cli --force
RUN npm install --save-dev @angular-devkit/build-angular --force

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build --prod

# Step 2: Use a lightweight Apache image based on Alpine
FROM httpd:alpine

# Step 3: Copy the Angular build files to the Apache document root
COPY --from=build /app/dist/quanlab/browser /usr/local/apache2/htdocs/

RUN apk update && apk add --no-cache apache2-utils

# Enable mod_rewrite
RUN echo "LoadModule rewrite_module modules/mod_rewrite.so" >> /usr/local/apache2/conf/httpd.conf

# Enable .htaccess overrides by modifying the configuration
RUN echo '<Directory "/usr/local/apache2/htdocs">' >> /usr/local/apache2/conf/httpd.conf && \
    echo '    AllowOverride All' >> /usr/local/apache2/conf/httpd.conf && \
    echo '</Directory>' >> /usr/local/apache2/conf/httpd.conf

# Copy your .htaccess file into the Apache document root
COPY .htaccess /usr/local/apache2/htdocs/.htaccess

# Step 4: Expose port 80
EXPOSE 80

# Step 5: Run Apache in the foreground (default for httpd)
CMD ["httpd", "-D", "FOREGROUND"]
