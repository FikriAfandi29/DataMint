import { Client, Account, Databases } from "appwrite";

const client = new Client()
    .setEndpoint("https://sgp.cloud.appwrite.io/v1")
    .setProject("6a1d855e00147768df88");

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
