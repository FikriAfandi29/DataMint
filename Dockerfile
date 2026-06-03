FROM node:22

RUN apt-get update && \
    apt-get install -y python3 python3-pip

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY requirements.txt .
RUN pip3 install --break-system-packages -r requirements.txt

COPY . .

RUN npm run build

ENV NODE_ENV=production

CMD ["npm","start"]