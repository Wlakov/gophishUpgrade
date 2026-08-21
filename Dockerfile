# Minify client side assets (JavaScript). A fixed image and npm lock-file keep
# builds repeatable while still receiving the selected runtime security fixes.
FROM node:22.22.1-bookworm-slim AS build-js

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN ./node_modules/.bin/gulp


# Build Golang binary with a supported Go toolchain.
FROM golang:1.26.6-bookworm AS build-golang

WORKDIR /go/src/github.com/gophish/gophish
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -trimpath -buildvcs=false -o gophish .


# Runtime container
FROM debian:bookworm-slim

RUN useradd -m -d /opt/gophish -s /bin/bash app

RUN apt-get update && \
	apt-get install --no-install-recommends -y jq libcap2-bin ca-certificates && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /opt/gophish
COPY --from=build-golang /go/src/github.com/gophish/gophish/ ./
COPY --from=build-js /build/static/js/dist/ ./static/js/dist/
COPY --from=build-js /build/static/css/dist/ ./static/css/dist/
COPY --from=build-golang /go/src/github.com/gophish/gophish/config.json ./
RUN chown app. config.json

RUN setcap 'cap_net_bind_service=+ep' /opt/gophish/gophish

# Git on Windows can check this shell script out with CRLF line endings.
# Normalize it in the Linux image so its /bin/bash shebang remains executable.
RUN sed -i 's/\r$//' docker/run.sh && \
	chmod 755 docker/run.sh && \
	mkdir -p data && \
	chown -R app:app data

USER app
RUN sed -i 's/127.0.0.1/0.0.0.0/g' config.json
RUN touch config.json.tmp

EXPOSE 3333 8080 8443 80

CMD ["./docker/run.sh"]
