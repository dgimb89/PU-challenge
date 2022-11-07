ARG NODE_MAJOR
FROM node:$NODE_MAJOR

# Create a directories for nestjs-app
RUN mkdir -p /nestjs-app
WORKDIR /nestjs-app

COPY ./entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]

EXPOSE 3000