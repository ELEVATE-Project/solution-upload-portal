FROM node:16.10.0 AS build

WORKDIR /app

RUN npm install -g @angular/cli@13.3.0
COPY package*.json ./
RUN npm install

COPY . .
RUN ng build --configuration=production

# Stage 2: Create a lightweight container with Node.js to serve the Angular application
FROM node:16.10.0 AS final

WORKDIR /usr/src/app
COPY --from=build /app/dist/template-validation-portal/* ./dist/
RUN npm install -g serve

EXPOSE 3111

CMD ["serve", "-s", "dist", "-p", "3111"]
